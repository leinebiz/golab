import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import type { Prisma } from '@golab/database';
import { CreateRequestSchema } from '@golab/shared';
import { routeTests, type RoutableLab } from '@/lib/workflow/lab-routing';
import { calculateQuote, type QuoteLabGroup } from '@/lib/workflow/quote-engine';
import { createRequestLogger } from '@/lib/observability/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Prisma.RequestWhereInput = {
      organizationId,
    };

    if (status && status !== 'ALL') {
      where.status = status as Prisma.RequestWhereInput['status'];
    }

    if (search) {
      where.reference = { contains: search, mode: 'insensitive' };
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          subRequests: {
            select: {
              id: true,
              status: true,
              expectedCompletionAt: true,
              laboratory: { select: { name: true } },
              tests: {
                select: {
                  id: true,
                  testCatalogue: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
    ]);

    const data = requests.map((r) => {
      const etaDates = r.subRequests.map((sr) => sr.expectedCompletionAt).filter(Boolean) as Date[];
      const eta =
        etaDates.length > 0
          ? new Date(Math.min(...etaDates.map((d) => d.getTime()))).toISOString()
          : null;

      return {
        id: r.id,
        reference: r.reference,
        status: r.status,
        testsCount: r.subRequests.reduce((acc, sr) => acc + sr.tests.length, 0),
        labs: [...new Set(r.subRequests.map((sr) => sr.laboratory.name))],
        createdAt: r.createdAt.toISOString(),
        eta,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const userId = user.id as string;
    const organizationId = user.organizationId as string;

    const requestId = crypto.randomUUID();
    const reqLogger = createRequestLogger(requestId, userId);

    const body = await req.json();
    const parsed = CreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    // Fetch address, labs, and org in parallel
    const [address, labs, org] = await Promise.all([
      prisma.address.findFirst({
        where: { id: parsed.data.collectionAddressId, organizationId },
      }),
      prisma.laboratory.findMany({
        where: { isActive: true },
        include: {
          labTests: {
            where: { isActive: true },
            select: {
              testCatalogueId: true,
              labPrice: true,
              testCatalogue: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  basePrice: true,
                  expediteSurcharge: true,
                },
              },
            },
          },
        },
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
    ]);

    if (!address) {
      return NextResponse.json(
        { error: 'Collection address not found or does not belong to your organization' },
        { status: 400 },
      );
    }

    const addressLocation = address.location as { lat: number; lng: number };

    const routableLabs: RoutableLab[] = labs.map((lab) => ({
      id: lab.id,
      name: lab.name,
      location: lab.location as { lat: number; lng: number },
      testCatalogueIds: lab.labTests.map((lt) => lt.testCatalogueId),
    }));

    const requestedTests = parsed.data.tests.map((t) => ({
      testCatalogueId: t.testCatalogueId,
      sampleCount: t.sampleCount,
      accreditationRequired: t.accreditationRequired ?? false,
    }));

    const routingPlan = routeTests(
      requestedTests,
      addressLocation,
      routableLabs,
      parsed.data.preferredLabId,
    );

    if (routingPlan.unroutable.length > 0) {
      return NextResponse.json(
        {
          error: 'Some tests cannot be routed to any active laboratory',
          unroutableTestIds: routingPlan.unroutable.map((u) => u.testCatalogueId),
        },
        { status: 400 },
      );
    }

    // Build price lookup map
    const labTestPriceMap = new Map<
      string,
      Map<
        string,
        {
          labPrice: string | null;
          basePrice: string;
          expediteSurcharge: string | null;
          testName: string;
        }
      >
    >();
    for (const lab of labs) {
      const testMap = new Map();
      for (const lt of lab.labTests) {
        testMap.set(lt.testCatalogueId, {
          labPrice: lt.labPrice?.toString() ?? null,
          basePrice: lt.testCatalogue.basePrice.toString(),
          expediteSurcharge: lt.testCatalogue.expediteSurcharge?.toString() ?? null,
          testName: lt.testCatalogue.name,
        });
      }
      labTestPriceMap.set(lab.id, testMap);
    }

    // Build quote input
    const quoteLabGroups: QuoteLabGroup[] = routingPlan.assignments.map((assignment) => ({
      labId: assignment.labId,
      labName: assignment.labName,
      tests: assignment.tests.map((t) => {
        const priceInfo = labTestPriceMap.get(assignment.labId)?.get(t.testCatalogueId);
        const basePrice = priceInfo?.labPrice ?? priceInfo?.basePrice ?? '0.00';
        return {
          testCatalogueId: t.testCatalogueId,
          testName: priceInfo?.testName ?? 'Unknown Test',
          sampleCount: t.sampleCount,
          basePrice,
          expediteSurcharge: priceInfo?.expediteSurcharge ?? null,
        };
      }),
    }));

    // Generate reference number and quote
    const orgCode =
      (org?.name ?? 'CUST')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase() || 'CUST';
    const seqCount = await prisma.request.count({ where: { organizationId } });
    const quote = calculateQuote(quoteLabGroups, parsed.data.turnaroundType, orgCode, seqCount + 1);

    // Create everything in a transaction
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // Create Request
      const request = await tx.request.create({
        data: {
          reference: quote.referenceNumber,
          organizationId,
          createdById: userId,
          status: 'PENDING_CUSTOMER_REVIEW',
          turnaroundType: parsed.data.turnaroundType,
          collectionAddressId: parsed.data.collectionAddressId,
          specialInstructions: parsed.data.specialInstructions ?? null,
          sampleType: parsed.data.sampleType ?? null,
        },
      });

      // Create SubRequests + Tests
      for (let i = 0; i < routingPlan.assignments.length; i++) {
        const assignment = routingPlan.assignments[i];
        const subRequest = await tx.subRequest.create({
          data: {
            subReference: `${quote.referenceNumber}-SR${(i + 1).toString().padStart(2, '0')}`,
            requestId: request.id,
            laboratoryId: assignment.labId,
            status: 'PICKUP_REQUESTED',
          },
        });

        for (const test of assignment.tests) {
          const matchingInput = parsed.data.tests.find(
            (t) => t.testCatalogueId === test.testCatalogueId,
          );
          const lineItem = quote.lineItems.find(
            (li) => li.testCatalogueId === test.testCatalogueId && li.labId === assignment.labId,
          );

          const subRequestTest = await tx.subRequestTest.create({
            data: {
              subRequestId: subRequest.id,
              testCatalogueId: test.testCatalogueId,
              sampleCount: test.sampleCount,
              accreditationRequired: test.accreditationRequired,
              unitPrice: lineItem?.unitPrice ?? '0.00',
              totalPrice: lineItem?.lineTotal ?? '0.00',
            },
          });

          // Create tolerance if provided
          if (matchingInput?.tolerance) {
            await tx.requestTolerance.create({
              data: {
                subRequestTestId: subRequestTest.id,
                minValue: matchingInput.tolerance.minValue ?? null,
                maxValue: matchingInput.tolerance.maxValue ?? null,
                unit: matchingInput.tolerance.unit,
                notes: matchingInput.tolerance.notes ?? null,
              },
            });
          }
        }
      }

      // Create Quote
      await tx.quote.create({
        data: {
          requestId: request.id,
          quoteNumber: quote.referenceNumber,
          subtotal: quote.subtotal,
          expediteSurcharge: quote.expediteSurchargeTotal,
          logisticsCost: quote.logisticsCost,
          adminFee: '0.00',
          vatRate: quote.vatRate,
          vatAmount: quote.vatAmount,
          totalAmount: quote.totalAmount,
          lineItems: quote.lineItems as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
      });

      // Record status transition
      await tx.statusTransition.create({
        data: {
          requestId: request.id,
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_CUSTOMER_REVIEW',
          triggeredBy: userId,
          reason: 'Request created with quote',
        },
      });

      return request;
    });

    // Fire-and-forget: notify customer that quote is ready
    const orgUsers = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });
    dispatchNotification('quote.ready', {
      recipientUserIds: orgUsers.map((u) => u.id),
      requestId: result.id,
      data: {
        requestRef: quote.referenceNumber,
        totalAmount: quote.totalAmount,
      },
    }).catch((err) => reqLogger.error({ error: err }, 'notification.quote_ready.failed'));

    reqLogger.info({ requestId: result.id, reference: quote.referenceNumber }, 'request.created');

    return NextResponse.json(
      {
        data: {
          id: result.id,
          reference: quote.referenceNumber,
          status: 'PENDING_CUSTOMER_REVIEW',
        },
        quote: {
          referenceNumber: quote.referenceNumber,
          lineItems: quote.lineItems,
          subtotal: quote.subtotal,
          expediteSurchargeTotal: quote.expediteSurchargeTotal,
          logisticsCost: quote.logisticsCost,
          vatAmount: quote.vatAmount,
          totalAmount: quote.totalAmount,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Handle Prisma unique constraint violation (reference collision)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Reference number collision, please retry' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
