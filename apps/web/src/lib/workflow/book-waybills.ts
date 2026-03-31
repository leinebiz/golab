import { prisma } from '@golab/database';
import { getCourierProvider } from '@/lib/integrations/courier';
import type { Address } from '@/lib/integrations/courier';
import { executeTransition } from './engine';
import { logger } from '../observability/logger';

/**
 * Book waybills for all sub-requests of a request.
 * Called after payment is received (PAYMENT_RECEIVED -> IN_PROGRESS).
 * Failures are logged but do not throw -- this is a background operation.
 */
export async function bookWaybillsForRequest(requestId: string): Promise<void> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      subRequests: {
        include: {
          waybill: true,
          laboratory: { select: { id: true, name: true, location: true, contactEmail: true } },
        },
      },
    },
  });

  if (!request) {
    logger.error({ requestId }, 'book-waybills.request_not_found');
    return;
  }

  // Fetch collection address
  let collectionAddress = {} as Address;
  if (request.collectionAddressId) {
    const addr = await prisma.address.findUnique({
      where: { id: request.collectionAddressId },
    });
    if (addr) {
      collectionAddress = {
        contactName: '',
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city,
        province: addr.province,
        postalCode: addr.postalCode,
        country: addr.country,
        phone: '',
      };
    }
  }

  const courier = getCourierProvider();

  for (const sub of request.subRequests) {
    // Skip if waybill already exists (idempotency)
    if (sub.waybill) {
      logger.info({ subRequestId: sub.id }, 'book-waybills.already_booked');
      continue;
    }

    try {
      const labLoc = sub.laboratory.location as Record<string, string> | null;
      const deliveryAddress: Address = {
        contactName: sub.laboratory.name,
        line1: labLoc?.line1 ?? '',
        city: labLoc?.city ?? '',
        province: labLoc?.province ?? '',
        postalCode: labLoc?.postalCode ?? '',
        country: labLoc?.country ?? 'ZA',
        phone: labLoc?.phone ?? '',
        email: sub.laboratory.contactEmail ?? undefined,
      };

      const pickupResult = await courier.createPickup({
        subRequestId: sub.id,
        collectionAddress,
        deliveryAddress,
        packageDescription: `Laboratory samples for ${request.reference}`,
      });

      await prisma.waybill.create({
        data: {
          subRequestId: sub.id,
          waybillNumber: pickupResult.waybillNumber,
          courierProvider: 'mock',
          courierBookingId: pickupResult.courierBookingId,
          collectionAddress: JSON.parse(JSON.stringify(collectionAddress)),
          deliveryAddress: JSON.parse(JSON.stringify(deliveryAddress)),
          status: 'BOOKED',
          estimatedDelivery: pickupResult.estimatedDelivery,
          trackingEvents: [],
        },
      });

      // Transition: PICKUP_REQUESTED -> WAYBILL_AVAILABLE
      await executeTransition({
        entityType: 'SubRequest',
        entityId: sub.id,
        targetStatus: 'WAYBILL_AVAILABLE',
        triggeredBy: { userId: 'SYSTEM', role: 'SYSTEM', type: 'system' },
        reason: `Auto-booked after payment: ${pickupResult.waybillNumber}`,
      });

      logger.info(
        { subRequestId: sub.id, waybillNumber: pickupResult.waybillNumber },
        'book-waybills.booked',
      );
    } catch (err) {
      logger.error(
        { subRequestId: sub.id, error: err instanceof Error ? err.message : 'Unknown' },
        'book-waybills.failed',
      );
    }
  }
}
