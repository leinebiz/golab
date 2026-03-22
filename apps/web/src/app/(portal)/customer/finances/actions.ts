'use server';

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface CreditApplicationResult {
  success: boolean;
  error?: string;
}

export async function submitCreditApplication(
  formData: FormData,
): Promise<CreditApplicationResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  const user = session.user as { id: string; role: string; organizationId: string };
  if (!user.organizationId) {
    return { success: false, error: 'No organization associated with your account' };
  }

  const companyReg = formData.get('companyReg') as string | null;
  const vatNumber = formData.get('vatNumber') as string | null;
  const requestedLimit = formData.get('requestedLimit') as string | null;
  const reason = formData.get('reason') as string | null;

  if (!companyReg?.trim()) {
    return { success: false, error: 'Company registration number is required' };
  }
  if (!requestedLimit?.trim()) {
    return { success: false, error: 'Requested credit limit is required' };
  }
  if (!reason?.trim()) {
    return { success: false, error: 'Reason for application is required' };
  }

  const parsedLimit = parseFloat(requestedLimit);
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    return { success: false, error: 'Requested credit limit must be a positive number' };
  }

  // Check if there's already a pending application
  const existing = await prisma.creditAccount.findUnique({
    where: { organizationId: user.organizationId },
  });

  if (existing && existing.status === 'PENDING_REVIEW') {
    return { success: false, error: 'You already have a pending credit application' };
  }

  if (existing && existing.status === 'APPROVED') {
    return { success: false, error: 'You already have an approved credit account' };
  }

  const applicationDocs = {
    companyReg: companyReg.trim(),
    vatNumber: vatNumber?.trim() || null,
    requestedLimit: parsedLimit,
    reason: reason.trim(),
    submittedBy: user.id,
    submittedAt: new Date().toISOString(),
  };

  await prisma.creditAccount.upsert({
    where: { organizationId: user.organizationId },
    create: {
      organizationId: user.organizationId,
      status: 'PENDING_REVIEW',
      applicationDate: new Date(),
      applicationDocs,
    },
    update: {
      status: 'PENDING_REVIEW',
      applicationDate: new Date(),
      applicationDocs,
    },
  });

  revalidatePath('/customer/finances');

  return { success: true };
}
