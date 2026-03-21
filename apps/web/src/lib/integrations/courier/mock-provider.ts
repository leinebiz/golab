import type {
  CourierProvider,
  PickupRequest,
  WaybillResponse,
  TrackingStatus,
  TrackingEvent,
} from './types';

/**
 * In-memory store of mock shipments for the dev courier provider.
 * Simulates pickup -> transit -> delivery lifecycle.
 */
interface MockShipment {
  courierBookingId: string;
  waybillNumber: string;
  reference: string;
  createdAt: Date;
  estimatedDelivery: Date;
  cancelled: boolean;
  events: TrackingEvent[];
}

const shipments = new Map<string, MockShipment>();

let waybillCounter = 1000;

function generateWaybillNumber(): string {
  waybillCounter += 1;
  return `MOCK-WB-${waybillCounter}`;
}

function generateBookingId(): string {
  return `mock-booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generates a realistic tracking event timeline based on elapsed time since creation.
 * Events progress: BOOKED -> COLLECTED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
 * Each phase lasts roughly `phaseMinutes` in dev (default 2 min per phase for fast iteration).
 */
function buildEvents(shipment: MockShipment, phaseMinutes: number): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const now = new Date();
  const created = shipment.createdAt;
  const elapsedMs = now.getTime() - created.getTime();
  const phaseMs = phaseMinutes * 60 * 1000;

  // Phase 0: always have a BOOKED event
  events.push({
    timestamp: created.toISOString(),
    status: 'BOOKED',
    description: 'Pickup booked with courier',
    location: 'Origin depot',
  });

  // Phase 1: COLLECTED after 1 phase
  if (elapsedMs >= phaseMs) {
    events.push({
      timestamp: new Date(created.getTime() + phaseMs).toISOString(),
      status: 'COLLECTED',
      description: 'Parcel collected from sender',
      location: 'Collection address',
    });
  }

  // Phase 2: IN_TRANSIT after 2 phases
  if (elapsedMs >= phaseMs * 2) {
    events.push({
      timestamp: new Date(created.getTime() + phaseMs * 2).toISOString(),
      status: 'IN_TRANSIT',
      description: 'Parcel in transit to destination',
      location: 'Sorting facility',
    });
  }

  // Phase 3: OUT_FOR_DELIVERY after 3 phases
  if (elapsedMs >= phaseMs * 3) {
    events.push({
      timestamp: new Date(created.getTime() + phaseMs * 3).toISOString(),
      status: 'OUT_FOR_DELIVERY',
      description: 'Parcel out for delivery',
      location: 'Local depot',
    });
  }

  // Phase 4: DELIVERED after 4 phases
  if (elapsedMs >= phaseMs * 4) {
    events.push({
      timestamp: new Date(created.getTime() + phaseMs * 4).toISOString(),
      status: 'DELIVERED',
      description: 'Parcel delivered to recipient',
      location: 'Delivery address',
    });
  }

  return events;
}

export interface MockProviderOptions {
  /** Minutes per lifecycle phase (default: 2). Lower values = faster simulation. */
  phaseMinutes?: number;
}

export function createMockProvider(options: MockProviderOptions = {}): CourierProvider {
  const phaseMinutes = options.phaseMinutes ?? 2;

  return {
    name: 'mock-courier',

    async createPickup(request: PickupRequest): Promise<WaybillResponse> {
      const waybillNumber = generateWaybillNumber();
      const courierBookingId = generateBookingId();
      const estimatedDelivery = new Date(Date.now() + phaseMinutes * 4 * 60 * 1000);

      const shipment: MockShipment = {
        courierBookingId,
        waybillNumber,
        reference: request.reference,
        createdAt: new Date(),
        estimatedDelivery,
        cancelled: false,
        events: [],
      };

      shipments.set(waybillNumber, shipment);
      shipments.set(courierBookingId, shipment);

      return {
        courierBookingId,
        waybillNumber,
        estimatedDelivery,
        trackingUrl: `https://mock-courier.example/track/${waybillNumber}`,
      };
    },

    async getWaybill(waybillNumber: string): Promise<Buffer> {
      const shipment = shipments.get(waybillNumber);
      if (!shipment) {
        throw new Error(`Shipment not found: ${waybillNumber}`);
      }

      // Generate a simple text-based "PDF" label for dev purposes
      const label = [
        '='.repeat(48),
        '              WAYBILL / SHIPPING LABEL',
        '='.repeat(48),
        '',
        `  Waybill:    ${shipment.waybillNumber}`,
        `  Booking:    ${shipment.courierBookingId}`,
        `  Reference:  ${shipment.reference}`,
        `  Created:    ${shipment.createdAt.toISOString()}`,
        `  ETA:        ${shipment.estimatedDelivery.toISOString()}`,
        '',
        '='.repeat(48),
        '        MOCK COURIER - DEV ENVIRONMENT',
        '='.repeat(48),
      ].join('\n');

      return Buffer.from(label, 'utf-8');
    },

    async trackShipment(waybillNumber: string): Promise<TrackingStatus> {
      const shipment = shipments.get(waybillNumber);
      if (!shipment) {
        throw new Error(`Shipment not found: ${waybillNumber}`);
      }

      if (shipment.cancelled) {
        return {
          waybillNumber,
          currentStatus: 'RETURNED',
          events: [
            {
              timestamp: new Date().toISOString(),
              status: 'RETURNED',
              description: 'Pickup cancelled',
            },
          ],
        };
      }

      const events = buildEvents(shipment, phaseMinutes);
      const latestEvent = events[events.length - 1];

      return {
        waybillNumber,
        currentStatus: latestEvent.status,
        estimatedDelivery: shipment.estimatedDelivery,
        events,
      };
    },

    async cancelPickup(courierBookingId: string): Promise<void> {
      const shipment = shipments.get(courierBookingId);
      if (!shipment) {
        throw new Error(`Booking not found: ${courierBookingId}`);
      }
      shipment.cancelled = true;
    },
  };
}
