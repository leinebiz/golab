import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit } from '../rate-limiter';

describe('rate-limiter', () => {
  // Use unique identifiers per test to avoid cross-test pollution
  // (the module-level store persists across tests within a run)
  let testId: string;

  beforeEach(() => {
    testId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  describe('checkRateLimit', () => {
    it('allows the first request', () => {
      const result = checkRateLimit(testId, 'api');
      expect(result.allowed).toBe(true);
    });

    it('returns correct remaining count after first request', () => {
      const result = checkRateLimit(testId, 'api');
      // api limit is 100, after 1 request remaining should be 99
      expect(result.remaining).toBe(99);
    });

    it('allows multiple requests under the limit', () => {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(testId, 'api');
        expect(result.allowed).toBe(true);
      }
    });

    it('tracks remaining count accurately', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit(testId, 'api');
      }
      const result = checkRateLimit(testId, 'api');
      // api limit is 100, after 6 requests remaining should be 94
      expect(result.remaining).toBe(94);
    });

    it('blocks requests over the auth limit', () => {
      // auth limit is 10 per 15 min
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(testId, 'auth');
        expect(result.allowed).toBe(true);
      }
      // 11th request should be blocked
      const blocked = checkRateLimit(testId, 'auth');
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('returns resetAt in the future', () => {
      const before = Date.now();
      const result = checkRateLimit(testId, 'api');
      expect(result.resetAt).toBeGreaterThan(before);
    });

    it('different identifiers have separate limits', () => {
      const id1 = `${testId}-user1`;
      const id2 = `${testId}-user2`;

      // Exhaust auth limit for id1
      for (let i = 0; i < 10; i++) {
        checkRateLimit(id1, 'auth');
      }
      const blockedId1 = checkRateLimit(id1, 'auth');
      expect(blockedId1.allowed).toBe(false);

      // id2 should still be allowed
      const allowedId2 = checkRateLimit(id2, 'auth');
      expect(allowedId2.allowed).toBe(true);
    });

    it('auth type has a lower limit than api type', () => {
      // auth: 10 per 15 min, api: 100 per minute
      // After 10 requests, auth should be blocked but api should not
      for (let i = 0; i < 10; i++) {
        checkRateLimit(`${testId}-auth`, 'auth');
        checkRateLimit(`${testId}-api`, 'api');
      }
      const authResult = checkRateLimit(`${testId}-auth`, 'auth');
      const apiResult = checkRateLimit(`${testId}-api`, 'api');
      expect(authResult.allowed).toBe(false);
      expect(apiResult.allowed).toBe(true);
    });

    it('webhook type allows more requests than api type', () => {
      // webhook: 200/min, api: 100/min
      // After 100 requests, api is blocked but webhook is not
      for (let i = 0; i < 100; i++) {
        checkRateLimit(`${testId}-wh`, 'webhook');
        checkRateLimit(`${testId}-api2`, 'api');
      }
      const webhookResult = checkRateLimit(`${testId}-wh`, 'webhook');
      const apiResult = checkRateLimit(`${testId}-api2`, 'api');
      expect(apiResult.allowed).toBe(false);
      expect(webhookResult.allowed).toBe(true);
    });

    it('defaults to api type when no type specified', () => {
      const result = checkRateLimit(testId);
      // api limit is 100, remaining should be 99
      expect(result.remaining).toBe(99);
    });
  });
});
