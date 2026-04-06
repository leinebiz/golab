import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockPrisma, mockRequireRole, mockExecuteTransition } = vi.hoisted(() => ({
  mockPrisma: {
    subRequest: { findUnique: vi.fn() },
    certificate: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  mockRequireRole: vi.fn(),
  mockExecuteTransition: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/middleware', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/workflow/engine', () => ({ executeTransition: mockExecuteTransition }));

// ---------------------------------------------------------------------------
// Import route handler
// ---------------------------------------------------------------------------
import { POST } from '../../sub-requests/[id]/upload-certificate/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSession() {
  mockRequireRole.mockResolvedValue({
    user: { id: 'user-1', role: 'LAB_STAFF' },
    expires: new Date().toISOString(),
  });
}

/**
 * Create a mock request that returns a controlled formData() result.
 * We mock formData() directly because jsdom's Request + FormData interop
 * can hang when the body is a real FormData.
 */
function createMockRequest(
  options: {
    file?: { name: string; type: string; size: number } | null;
  } = {},
) {
  const { file } = options;

  // Build a mock FormData with a controlled get() method
  const mockFile = file ? { name: file.name, type: file.type, size: file.size } : null;

  const formData = {
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      return null;
    }),
  };

  const request = {
    formData: vi.fn().mockResolvedValue(formData),
    headers: {
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'content-length') return String(file?.size ?? 0);
        return null;
      }),
    },
    method: 'POST',
    url: 'http://localhost/api/v1/sub-requests/sub-1/upload-certificate',
  } as unknown as Request;

  return request;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function subRequestFixture(overrides: Record<string, unknown> = {}) {
  return { id: 'sub-1', status: 'TESTING_COMPLETED', subReference: 'SR-001', ...overrides };
}

describe('POST /api/v1/sub-requests/[id]/upload-certificate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession();
    mockExecuteTransition.mockResolvedValue(undefined);
  });

  it('uploads PDF, creates certificate, and transitions status (201)', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(subRequestFixture());

    const fakeCert = {
      id: 'cert-1',
      subRequestId: 'sub-1',
      fileName: 'test-cert.pdf',
      format: 'LAB_ORIGINAL',
      version: 1,
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        certificate: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue(fakeCert),
        },
        subRequest: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const request = createMockRequest({
      file: { name: 'test-cert.pdf', type: 'application/pdf', size: 1024 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe('cert-1');
    expect(json.format).toBe('LAB_ORIGINAL');

    expect(mockExecuteTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'SubRequest',
        entityId: 'sub-1',
        targetStatus: 'AWAITING_GOLAB_REVIEW',
      }),
    );
  });

  it('returns 404 when sub-request does not exist', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(null);

    const request = createMockRequest({
      file: { name: 'test.pdf', type: 'application/pdf', size: 1024 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'missing' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });

  it('returns 400 when sub-request is in wrong status', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(
      subRequestFixture({ status: 'IN_TRANSIT_TO_LAB' }),
    );

    const request = createMockRequest({
      file: { name: 'test.pdf', type: 'application/pdf', size: 1024 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/cannot upload/i);
  });

  it('allows upload when status is RETURNED_TO_LAB', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(
      subRequestFixture({ status: 'RETURNED_TO_LAB', subReference: 'SR-002' }),
    );

    const fakeCert = { id: 'cert-2', fileName: 'revised.pdf' };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        certificate: {
          count: vi.fn().mockResolvedValue(1),
          create: vi.fn().mockResolvedValue(fakeCert),
        },
        subRequest: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const request = createMockRequest({
      file: { name: 'revised.pdf', type: 'application/pdf', size: 2048 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    expect(res.status).toBe(201);
  });

  it('returns 413 when Content-Length exceeds 20MB', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(subRequestFixture());

    const request = createMockRequest({
      file: { name: 'huge.pdf', type: 'application/pdf', size: 21 * 1024 * 1024 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toMatch(/too large/i);
  });

  it('returns 400 for non-PDF file type', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(subRequestFixture());

    const request = createMockRequest({
      file: { name: 'image.png', type: 'image/png', size: 1024 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/PDF/i);
  });

  it('returns 400 when no file is provided', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(subRequestFixture());

    const request = createMockRequest({ file: null });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no file/i);
  });

  it('calls requireRole with lab-related roles', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(subRequestFixture());

    mockPrisma.$transaction.mockResolvedValue({ id: 'cert-1', fileName: 'test.pdf' });

    const request = createMockRequest({
      file: { name: 'test.pdf', type: 'application/pdf', size: 1024 },
    });

    await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });

    expect(mockRequireRole).toHaveBeenCalledWith(['LAB_STAFF', 'LAB_MANAGER', 'ADMIN']);
  });

  it('returns 500 when transaction fails', async () => {
    mockPrisma.subRequest.findUnique.mockResolvedValue(subRequestFixture());

    mockPrisma.$transaction.mockRejectedValue(new Error('DB write failed'));

    const request = createMockRequest({
      file: { name: 'test.pdf', type: 'application/pdf', size: 1024 },
    });

    const res = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/internal server error/i);
  });
});
