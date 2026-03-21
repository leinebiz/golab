import { logger } from '../observability/logger';

const AUDITED_MODELS = [
  'Request',
  'SubRequest',
  'Certificate',
  'Invoice',
  'Payment',
  'CreditAccount',
  'SampleIssue',
  'Waybill',
  'Organization',
  'User',
  'Disclaimer',
];

function computeChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> {
  if (!before) return {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (key === 'updatedAt') continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { old: before[key], new: after[key] };
    }
  }
  return changes;
}

/**
 * Log audit entries for mutations on audited models.
 * This is called by the application layer after Prisma operations,
 * rather than via Prisma middleware (removed in v6).
 */
export function logAuditEntry(params: {
  action: 'create' | 'update' | 'delete';
  model: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown>;
  actorId?: string | null;
  actorType?: string;
}) {
  if (!AUDITED_MODELS.includes(params.model)) return;

  const changes =
    params.action === 'update' && params.before && params.after
      ? computeChanges(params.before, params.after)
      : params.action === 'create'
        ? { created: true }
        : { deleted: true, snapshot: params.before };

  logger.info(
    {
      actorId: params.actorId ?? null,
      actorType: params.actorType ?? 'system',
      auditAction: `${params.model.toLowerCase()}.${params.action}`,
      entityType: params.model,
      entityId: params.entityId,
      changes,
    },
    'audit.entry',
  );
}
