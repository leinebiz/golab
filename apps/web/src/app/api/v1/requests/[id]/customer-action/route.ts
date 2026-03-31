import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { CustomerActionSchema } from '@golab/shared';
import { executeTransition } from '@/lib/workflow/engine';
import { routeTests, type RoutableLab } from '@/lib/workflow/lab-routing';
import { calculateQuote, type QuoteLabGroup } from '@/lib/workflow/quote-engine';
import { createRequestLogger } from '@/lib/observability/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

interface LabTestPriceInfo {
  labPrice: string | null;
  basePrice: string;
  expediteSurcharge: string | null;
  testName: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;
    const userId = user.id as string;
    const role = user.role as string;
    const { id } = await params;

    const reqLogger = createRequestLogger(id, userId);

    // Verify the request belongs to the customer's organization and is actionable
    const request = await prisma.request.findFirst({
      where: { id, organizationId },
      include: {
        subRequests: {
          select: {
            id: true,
            laboratoryId: true,
            tests: {
              select: {
                testCatalogueId: true,
                sampleCount: true,
                accreditationRequired: true,
              },
            },
          },
        },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING_CUSTOMER_ACTION') {
      return NextResponse.json(
        { error: 'Request is not pending customer action' },
        { status: 409 },
      );
    }

    const body = await req.json();
    const parsed = CustomerActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { action, notes } = parsed.data;

    await prisma.request.update({
      where: { id },
      data: {
        customerAction: action,
        customerActionDate: new Date(),
        customerActionNotes: notes ?? null,
      },
    });

    if (action === 'ACCEPT_AND_CLOSE') {
      await executeTransition({
        entityType: 'Request',
        entityId: id,
        targetStatus: 'CLOSED',
        triggeredBy: { userId, role, type: 'user' },
        reason: 'Customer accepted results and closed request',
      });

      reqLogger.info({ action }, 'customer_action.accept_and_close');

      return NextResponse.json({ success: true, action: 'ACCEPT_AND_CLOSE' });
    }

    if (action === 'REQUEST_CALLBACK') {
      // Notify GoLab admins
      const admins = await prisma.user.findMany({
        where: { role: 'GOLAB_ADMIN' },
        select: { id: true },
      });

      dispatchNotification('customer.callback_requested', {
        recipientUserIds: admins.map((a: { id: string }) => a.id),
        requestId: id,
        data: {
          requestRef: request.reference,
          notes: notes ?? '',
        },
      }).catch((err) => reqLogger.error({ error: err }, 'notification.callback_requested.failed'));

      reqLogger.info({ action }, 'customer_action.request_callback');

      return NextResponse.json({ success: true, action: 'REQUEST_CALLBACK' });
    }

    // RETEST or SEND_TO_ANOTHER_LAB: create new sub-requests
    if (!request.collectionAddressId) {
      return NextResponse.json({ error: 'No collection address on this request' }, { status: 400 });
    }

    const address = await prisma.address.findFirst({
      where: { id: request.collectionAddressId },
    });

    if (!address) {
      return NextResponse.json(
        { error: 'Collection address no longer available' },
        { status: 400 },
      );
    }

    const addressLocation = address.location as { lat: number; lng: number };

    // Gather all tests from existing sub-requests
    const requestedTests = request.subRequests.flatMap((sr) =>
      sr.tests.map((t) => ({
        testCatalogueId: t.testCatalogueId,
        sampleCount: t.sampleCount,
        accreditationRequired: t.accreditationRequired,
      })),
    );

    // Fetch active labs
    const labs = await prisma.laboratory.findMany({
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
                name: true,
                basePrice: true,
                expediteSurcharge: true,
              },
            },
          },
        },
      },
    });

    // For SEND_TO_ANOTHER_LAB, exclude the original labs
    const excludeLabIds =
      action === 'SEND_TO_ANOTHER_LAB'
        ? new Set(request.subRequests.map((sr) => sr.laboratoryId))
        : new Set<string>();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const routableLabs: RoutableLab[] = (labs as any[])
      .filter((lab) => !excludeLabIds.has(lab.id))
      .map((lab) => ({
        id: lab.id,
        name: lab.name,
        location: lab.location as { lat: number; lng: number },
        testCatalogueIds: lab.labTests.map((lt: any) => lt.testCatalogueId),
      }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const routingPlan = routeTests(requestedTests, addressLocation, routableLabs);

    if (routingPlan.unroutable.length > 0) {
      return NextResponse.json(
        {
          error: 'Some tests cannot be routed to any available laboratory',
          unroutableTestIds: routingPlan.unroutable.map((u) => u.testCatalogueId),
        },
        { status: 400 },
      );
    }

    const labTestPriceMap = new Map<string, Map<string, LabTestPriceInfo>>();
    for (const lab of labs) {
      const testMap = new Map<string, LabTestPriceInfo>();
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

    const orgCode =
      (request.organization.name ?? 'CUST')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase() || 'CUST';
    const seqCount = await prisma.request.count({ where: { organizationId } });
    const quote = calculateQuote(
      quoteLabGroups,
      request.turnaroundType as 'STANDARD' | 'EXPEDITED',
      orgCode,
      seqCount + 1,
    );

    // Create new sub-requests in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      const existingSubCount = request.subRequests.length;

      for (let i = 0; i < routingPlan.assignments.length; i++) {
        const assignment = routingPlan.assignments[i];
        const subIndex = existingSubCount + i + 1;
        const subRequest = await tx.subRequest.create({
          data: {
            subReference: `${request.reference}-SR${subIndex.toString().padStart(2, '0')}`,
            requestId: id,
            laboratoryId: assignment.labId,
            status: 'PICKUP_REQUESTED',
          },
        });

        for (const test of assignment.tests) {
          const lineItem = quote.lineItems.find(
            (li) => li.testCatalogueId === test.testCatalogueId && li.labId === assignment.labId,
          );

          await tx.subRequestTest.create({
            data: {
              subRequestId: subRequest.id,
              testCatalogueId: test.testCatalogueId,
              sampleCount: test.sampleCount,
              accreditationRequired: test.accreditationRequired,
              unitPrice: lineItem?.unitPrice ?? '0.00',
              totalPrice: lineItem?.lineTotal ?? '0.00',
            },
          });
        }
      }
    });

    // Transition request back to IN_PROGRESS
    await executeTransition({
      entityType: 'Request',
      entityId: id,
      targetStatus: 'IN_PROGRESS',
      triggeredBy: { userId, role, type: 'user' },
      reason: `Customer requested ${action === 'RETEST' ? 'retest' : 'transfer to another lab'}`,
      metadata: { action, notes: notes ?? null },
    });

    // Notify GoLab admins
    const admins = await prisma.user.findMany({
      where: { role: 'GOLAB_ADMIN' },
      select: { id: true },
    });

    dispatchNotification('customer.retest_requested', {
      recipientUserIds: admins.map((a: { id: string }) => a.id),
      requestId: id,
      data: {
        requestRef: request.reference,
        action,
        notes: notes ?? '',
        newSubRequestCount: routingPlan.assignments.length,
      },
    }).catch((err) => reqLogger.error({ error: err }, 'notification.retest_requested.failed'));

    reqLogger.info(
      { action, newSubRequests: routingPlan.assignments.length },
      'customer_action.fork_completed',
    );

    return NextResponse.json({
      success: true,
      action,
      newSubRequests: routingPlan.assignments.length,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Invalid transition')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith('Guard rejected')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
