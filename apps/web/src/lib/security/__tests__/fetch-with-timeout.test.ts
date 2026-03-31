import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithTimeout } from '../fetch-with-timeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through to normal fetch and returns the response', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithTimeout('https://example.com/api');
    expect(result).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('passes options through to fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await fetchWithTimeout('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[0]).toBe('https://example.com/api');
    expect(callArgs[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });
  });

  it('passes an AbortSignal to fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await fetchWithTimeout('https://example.com/api');

    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('does not include timeoutMs in the options passed to fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await fetchWithTimeout('https://example.com/api', { timeoutMs: 5000 });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty('timeoutMs');
  });

  it('aborts the request when timeout expires', async () => {
    vi.useFakeTimers();

    // Simulate a fetch that never resolves until aborted
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );

    const promise = fetchWithTimeout('https://example.com/slow', { timeoutMs: 100 });

    // Advance time past the timeout
    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow('aborted');

    vi.useRealTimers();
  });

  it('uses 30s as default timeout', async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );

    const promise = fetchWithTimeout('https://example.com/slow');

    // At 29s it should still be pending
    vi.advanceTimersByTime(29_000);
    // Can't easily assert pending, so advance past 30s and expect abort
    vi.advanceTimersByTime(2_000);

    await expect(promise).rejects.toThrow('aborted');

    vi.useRealTimers();
  });
});
