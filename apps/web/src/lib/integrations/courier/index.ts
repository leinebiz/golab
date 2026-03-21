import type { CourierProvider } from './types';
import { createMockProvider } from './mock-provider';

export type { CourierProvider } from './types';
export type { Address, TrackingEvent, PickupRequest, PickupResult, TrackingResult } from './types';

let cachedProvider: CourierProvider | null = null;

/**
 * Returns the active courier provider (singleton per process).
 *
 * In development / test the mock provider is used.
 * In production a real provider implementation would be returned
 * (e.g. The Courier Guy, DHL, etc.).
 */
export function getCourierProvider(): CourierProvider {
  if (cachedProvider) return cachedProvider;

  const env = process.env.NODE_ENV ?? 'development';

  if (env === 'production') {
    // TODO: return real courier provider once integrated
    // For now fall through to mock so the app is functional
  }

  cachedProvider = createMockProvider();
  return cachedProvider;
}
