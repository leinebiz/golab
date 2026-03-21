import crypto from 'node:crypto';
import type {
  CourierProvider,
  PickupRequest,
  PickupResult,
  TrackingEvent,
  TrackingResult,
} from './types';

// ============================================================
// Configuration
// ============================================================

interface MockConfig {
  /** Simulated delay per stage in milliseconds (default 0 -- instant) */
  stageDelayMs: number;
  /** HMAC secret for webhook verification */
  webhookSecret: string;
}

const DEFAULT_CONFIG: MockConfig = {
  stageDelayMs: 0,
  webhookSecret: process.env.COURIER_WEBHOOK_SECRET ?? 'mock-webhook-secret',
};

// ============================================================
// Mock state store (in-memory, per-process)
// ============================================================

interface MockWaybill {
  waybillNumber: string;
  courierBookingId: string;
  events: TrackingEvent[];
  cancelled: boolean;
}

const store = new Map<string, MockWaybill>();

// ============================================================
// Helpers
// ============================================================

let waybillCounter = 1000;

function nextWaybillNumber(): string {
  waybillCounter += 1;
  return `MOCK-WB-${waybillCounter}`;
}

function nextBookingId(): string {
  return `mock-booking-${crypto.randomUUID()}`;
}

function estimatedDelivery(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d;
}

/**
 * Simulate the full lifecycle of a shipment.
 * Each stage appends a TrackingEvent to the in-memory store
 * so that `getTrackingStatus` returns progressively more events.
 */
async function simulateLifecycle(waybillNumber: string, delayMs: number): Promise<void> {
  const stages: { status: TrackingEvent['status']; description: string }[] = [
    { status: 'BOOKED', description: 'Pickup booked' },
    { status: 'COLLECTED', description: 'Parcel collected from sender' },
    { status: 'IN_TRANSIT', description: 'Parcel in transit to destination hub' },
    { status: 'OUT_FOR_DELIVERY', description: 'Parcel out for delivery' },
    { status: 'DELIVERED', description: 'Parcel delivered' },
  ];

  for (const stage of stages) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    const entry = store.get(waybillNumber);
    if (!entry || entry.cancelled) return;

    entry.events.push({
      timestamp: new Date(),
      status: stage.status,
      description: stage.description,
      location: 'Mock Depot',
    });
  }
}

// ============================================================
// Provider
// ============================================================

export function createMockProvider(overrides?: Partial<MockConfig>): CourierProvider {
  const config: MockConfig = { ...DEFAULT_CONFIG, ...overrides };

  return {
    name: 'mock',

    async createPickup(_request: PickupRequest): Promise<PickupResult> {
      const waybillNumber = nextWaybillNumber();
      const courierBookingId = nextBookingId();

      const entry: MockWaybill = {
        waybillNumber,
        courierBookingId,
        events: [],
        cancelled: false,
      };
      store.set(waybillNumber, entry);

      // Fire-and-forget lifecycle simulation
      void simulateLifecycle(waybillNumber, config.stageDelayMs);

      return {
        courierBookingId,
        waybillNumber,
        estimatedDelivery: estimatedDelivery(),
        pdfUrl: `/mock/waybills/${waybillNumber}.pdf`,
      };
    },

    async getTrackingStatus(waybillNumber: string): Promise<TrackingResult> {
      const entry = store.get(waybillNumber);
      if (!entry) {
        throw new Error(`Unknown waybill: ${waybillNumber}`);
      }

      const lastEvent = entry.events.at(-1);
      return {
        waybillNumber,
        currentStatus: lastEvent?.status ?? 'BOOKED',
        estimatedDelivery: estimatedDelivery(),
        events: [...entry.events],
      };
    },

    async cancelPickup(courierBookingId: string): Promise<void> {
      for (const entry of store.values()) {
        if (entry.courierBookingId === courierBookingId) {
          entry.cancelled = true;
          return;
        }
      }
      throw new Error(`Unknown booking: ${courierBookingId}`);
    },

    verifyWebhook(payload: string, signature: string): boolean {
      const expected = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(payload)
        .digest('hex');
      if (expected.length !== signature.length) return false;
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    },
  };
}

/**
 * Expose the store for testing purposes only.
 */
export function _getStore(): Map<string, MockWaybill> {
  return store;
}
