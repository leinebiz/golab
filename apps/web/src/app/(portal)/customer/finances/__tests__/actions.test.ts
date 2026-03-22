import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies before importing the module under test
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    creditAccount: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { submitCreditApplication } from '../actions';
import { auth } from '@/lib/auth/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as any as ReturnType<typeof vi.fn>;

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  return fd;
}

describe('submitCreditApplication validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user with an org
    mockAuth.mockResolvedValue({
      user: { id: 'u1', role: 'CUSTOMER_ADMIN', organizationId: 'org1' },
      expires: '',
    });
  });

  it('returns error when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await submitCreditApplication(makeFormData({}));
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when user has no organizationId', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', role: 'CUSTOMER_ADMIN', organizationId: '' },
      expires: '',
    });
    const result = await submitCreditApplication(makeFormData({}));
    expect(result).toEqual({
      success: false,
      error: 'No organization associated with your account',
    });
  });

  it('returns error when companyReg is missing', async () => {
    const result = await submitCreditApplication(
      makeFormData({ requestedLimit: '5000', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Company registration number is required',
    });
  });

  it('returns error when companyReg is empty/whitespace', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: '   ', requestedLimit: '5000', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Company registration number is required',
    });
  });

  it('returns error when requestedLimit is missing', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Requested credit limit is required',
    });
  });

  it('returns error when requestedLimit is empty', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', requestedLimit: '', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Requested credit limit is required',
    });
  });

  it('returns error when reason is missing', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', requestedLimit: '5000' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Reason for application is required',
    });
  });

  it('returns error when reason is whitespace only', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', requestedLimit: '5000', reason: '  ' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Reason for application is required',
    });
  });

  it('returns error when requestedLimit is not a number', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', requestedLimit: 'abc', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Credit limit must be a positive number with at most 2 decimal places',
    });
  });

  it('returns error when requestedLimit is 0', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', requestedLimit: '0', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Requested credit limit must be a positive number within allowed range',
    });
  });

  it('returns error when requestedLimit is negative', async () => {
    const result = await submitCreditApplication(
      makeFormData({ companyReg: 'REG123', requestedLimit: '-500', reason: 'Need credit' }),
    );
    expect(result).toEqual({
      success: false,
      error: 'Credit limit must be a positive number with at most 2 decimal places',
    });
  });
});
