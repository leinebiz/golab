import type { CourierProvider } from './types';
import { createMockProvider } from './mock-provider';

export type {
  CourierProvider,
  CourierAddress,
  PickupRequest,
  WaybillResponse,
  TrackingStatus,
  TrackingEvent,
} from './types';

/**
 * Returns the courier provider for the current environment.
 * In development, returns a mock provider with simulated lifecycle.
 * In production, returns the real provider (to be implemented).
 */
export function getCourierProvider(): CourierProvider {
  if (process.env.NODE_ENV === 'production' && process.env.COURIER_API_URL) {
    // TODO: implement real courier provider when API is available
    // For now, fall through to mock even in production if no real provider is configured
    throw new Error(
      'Real courier provider not implemented yet. Set NODE_ENV=development or implement the production provider.',
    );
  }

  return createMockProvider({
    phaseMinutes: Number(process.env.COURIER_MOCK_PHASE_MINUTES ?? '2'),
  });
}
