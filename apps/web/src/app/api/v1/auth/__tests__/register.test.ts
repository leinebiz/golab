import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockPrisma, mockHash } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    organization: { create: vi.fn() },
    address: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  mockHash: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('bcryptjs', () => ({ default: { hash: mockHash }, hash: mockHash }));

// ---------------------------------------------------------------------------
// Import route handler under test
// ---------------------------------------------------------------------------
import { POST } from '../../auth/register/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    email: 'test@example.com',
    password: 'StrongP@ssw0rd1',
    confirmPassword: 'StrongP@ssw0rd1',
    name: 'Test User',
    companyName: 'Test Corp',
    addressLine1: '123 Main St',
    city: 'Johannesburg',
    province: 'Gauteng',
    postalCode: '2000',
    country: 'ZA',
    paymentType: 'COD',
    ...overrides,
  };
}

function createRequest(body: unknown) {
  return new Request('http://localhost/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/** Sets up a passing $transaction mock that invokes the callback with tx stubs. */
function mockSuccessfulTransaction(overrides?: Partial<{ userCreate: ReturnType<typeof vi.fn> }>) {
  const userCreate = overrides?.userCreate ?? vi.fn().mockResolvedValue({ id: 'u1' });
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      user: { create: userCreate },
      organization: { create: vi.fn().mockResolvedValue({ id: 'o1' }) },
      address: { create: vi.fn().mockResolvedValue({}) },
    };
    return fn(tx);
  });
  return { userCreate };
}

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue('hashed-password');
  });

  it('creates user, organization, and address in a transaction (201)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockSuccessfulTransaction();

    const res = await POST(createRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.userId).toBeDefined();
    expect(json.message).toContain('Registration successful');
  });

  it('returns 409 for duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    const res = await POST(createRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.message).toMatch(/already exists/i);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await POST(createRequest({ email: 'bad' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/validation/i);
    expect(json.details).toBeDefined();
  });

  it('returns 400 when passwords do not match', async () => {
    const body = validBody({ confirmPassword: 'Mismatch123456' });
    const res = await POST(createRequest(body));

    expect(res.status).toBe(400);
  });

  it('calls bcrypt.hash with salt rounds 12', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockSuccessfulTransaction();

    await POST(createRequest(validBody()));

    expect(mockHash).toHaveBeenCalledWith('StrongP@ssw0rd1', 12);
  });

  it('returns 500 when transaction throws', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValue(new Error('DB failure'));

    const res = await POST(createRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toMatch(/unexpected/i);
  });

  it('lowercases email before duplicate check and storage', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const txUserCreate = vi.fn().mockResolvedValue({ id: 'u1' });
    mockSuccessfulTransaction({ userCreate: txUserCreate });

    await POST(createRequest(validBody({ email: 'Mixed@Example.com' })));

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'mixed@example.com' },
    });
    expect(txUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'mixed@example.com' }),
      }),
    );
  });
});
