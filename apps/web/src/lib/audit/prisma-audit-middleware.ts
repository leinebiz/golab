import { prisma } from '@/lib/db';
import type { Prisma } from '@golab/database';
import { logger } from '../observability/logger';

// ─── Actions ────────────────────────────────────────────────────
export const AuditActions = {
  // Auth
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGOUT: 'logout',

  // Requests
  REQUEST_CREATE: 'request.create',
  REQUEST_UPDATE: 'request.update',
  REQUEST_STATUS_CHANGE: 'request.status_change',
  REQUEST_SUBMIT: 'request.submit',
  REQUEST_APPROVE: 'request.approve',
  REQUEST_REJECT: 'request.reject',

  // Sub-requests
  SUBREQUEST_CREATE: 'subrequest.create',
  SUBREQUEST_UPDATE: 'subrequest.update',
  SUBREQUEST_STATUS_CHANGE: 'subrequest.status_change',

  // Quotes & Invoices
  QUOTE_GENERATE: 'quote.generate',
  QUOTE_ACCEPT: 'quote.accept',
  QUOTE_REJECT: 'quote.reject',
  INVOICE_CREATE: 'invoice.create',
  INVOICE_UPDATE: 'invoice.update',
  PAYMENT_RECORD: 'payment.record',
  PAYMENT_CONFIRM: 'payment.confirm',

  // Certificates
  CERTIFICATE_ISSUE: 'certificate.issue',
  CERTIFICATE_DOWNLOAD: 'certificate.download',

  // Credit
  CREDIT_APPLY: 'credit.apply',
  CREDIT_APPROVE: 'credit.approve',
  CREDIT_REJECT: 'credit.reject',
  CREDIT_UPDATE: 'credit.update',

  // Organizations & Users
  ORG_CREATE: 'organization.create',
  ORG_UPDATE: 'organization.update',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',

  // Communications
  COMMS_SEND: 'comms.send',
  COMMS_DRAFT: 'comms.draft',
  COMMS_RESEND: 'comms.resend',
  COMMS_RECEIVE: 'comms.receive',
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_RESEND: 'notification.resend',

  // Templates & Workflow
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_CREATE: 'template.create',

  // Disclaimers
  DISCLAIMER_CREATE: 'disclaimer.create',
  DISCLAIMER_UPDATE: 'disclaimer.update',
  DISCLAIMER_DELETE: 'disclaimer.delete',

  // Samples & Lab
  SAMPLE_RECEIVE: 'sample.receive',
  SAMPLE_ISSUE: 'sample.issue',
  RESULTS_UPLOAD: 'results.upload',
  WAYBILL_CREATE: 'waybill.create',

  // System
  SYSTEM_SEED: 'system.seed',
  SYSTEM_MIGRATION: 'system.migration',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

// ─── Categories ─────────────────────────────────────────────────
const ACTION_CATEGORY_MAP: Record<string, string> = {
  login: 'auth',
  logout: 'auth',
  request: 'workflow',
  subrequest: 'workflow',
  quote: 'finance',
  invoice: 'finance',
  payment: 'finance',
  credit: 'finance',
  certificate: 'workflow',
  comms: 'comms',
  notification: 'comms',
  template: 'comms',
  organization: 'data',
  user: 'data',
  disclaimer: 'data',
  sample: 'workflow',
  results: 'workflow',
  waybill: 'workflow',
  system: 'system',
};

function categoryFromAction(action: string): string {
  const prefix = action.split('.')[0];
  return ACTION_CATEGORY_MAP[prefix] ?? 'data';
}

// ─── Change tracking ────────────────────────────────────────────
export function computeChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> {
  if (!before) return {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (key === 'updatedAt' || key === 'createdAt') continue;
    const oldVal = before[key];
    const newVal = after[key];
    // Normalize null/undefined/empty
    const oldNorm = oldVal === undefined || oldVal === '' ? null : oldVal;
    const newNorm = newVal === undefined || newVal === '' ? null : newVal;
    if (JSON.stringify(oldNorm) !== JSON.stringify(newNorm)) {
      changes[key] = { old: oldNorm, new: newNorm };
    }
  }
  return changes;
}

// ─── Main logging function ──────────────────────────────────────
interface AuditParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorType?: string;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditActivity(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        category: categoryFromAction(params.action),
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        entityLabel: params.entityLabel ?? undefined,
        actorId: params.actorId ?? undefined,
        actorName: params.actorName ?? undefined,
        actorEmail: params.actorEmail ?? undefined,
        actorType: params.actorType ?? 'user',
        changes: (params.changes ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    });
  } catch (err) {
    // Audit logging must never break the operation
    logger.error({ error: err, auditAction: params.action }, 'audit.log_failed');
  }
}

// ─── Helper: extract request metadata ───────────────────────────
export function extractRequestMeta(headers: Headers): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress:
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? null,
    userAgent: headers.get('user-agent') ?? null,
  };
}

// ─── Helper: log from session context ───────────────────────────
export async function logAuditFromSession(
  session: { user?: { id?: string; name?: string | null; email?: string | null } } | null,
  headers: Headers,
  params: Omit<AuditParams, 'actorId' | 'actorName' | 'actorEmail' | 'ipAddress' | 'userAgent'>,
): Promise<void> {
  const meta = extractRequestMeta(headers);
  await logAuditActivity({
    ...params,
    actorId: session?.user?.id ?? null,
    actorName: session?.user?.name ?? null,
    actorEmail: session?.user?.email ?? null,
    ...meta,
  });
}
