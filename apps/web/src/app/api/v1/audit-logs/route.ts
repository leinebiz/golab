import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

interface AuditLogRow {
  id: string;
  actorId: string | null;
  actor: { id: string; name: string | null; email: string } | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: unknown;
  metadata: unknown;
  createdAt: Date;
}

interface TransitionRow {
  id: string;
  requestId: string | null;
  subRequestId: string | null;
  request: { id: string; reference: string } | null;
  subRequest: { id: string; subReference: string } | null;
  fromStatus: string;
  toStatus: string;
  triggeredBy: string;
  metadata: unknown;
  createdAt: Date;
}

// ============================================================
// GET /api/v1/audit-logs
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN']);

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.get('pageSize') ?? '50', 10)));
    const entityType = params.get('entityType') ?? undefined;
    const action = params.get('action') ?? undefined;
    const actorId = params.get('actorId') ?? undefined;
    const from = params.get('from') ?? undefined;
    const to = params.get('to') ?? undefined;
    const search = params.get('search') ?? undefined;

    // Build date range filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    // ---- Query AuditLog records ----
    const auditWhere: Record<string, unknown> = {};
    if (entityType) auditWhere.entityType = entityType;
    if (action) auditWhere.action = action;
    if (actorId) auditWhere.actorId = actorId;
    if (from || to) auditWhere.createdAt = dateFilter;
    if (search) {
      auditWhere.OR = [
        { entityId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [auditLogs, auditCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: auditWhere,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: auditWhere }),
    ]);

    // ---- Query StatusTransition records ----
    const transitionWhere: Record<string, unknown> = {};
    if (entityType === 'Request') transitionWhere.requestId = { not: null };
    else if (entityType === 'SubRequest') transitionWhere.subRequestId = { not: null };
    else if (entityType && entityType !== 'Request' && entityType !== 'SubRequest') {
      // StatusTransitions only relate to Request/SubRequest; skip if other entity type
      transitionWhere.id = '__none__'; // will match nothing
    }
    if (from || to) transitionWhere.createdAt = dateFilter;
    if (search) {
      transitionWhere.OR = [
        { fromStatus: { contains: search, mode: 'insensitive' } },
        { toStatus: { contains: search, mode: 'insensitive' } },
        { triggeredBy: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transitions, transitionCount] = await Promise.all([
      prisma.statusTransition.findMany({
        where: transitionWhere,
        include: {
          request: { select: { id: true, reference: true } },
          subRequest: { select: { id: true, subReference: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.statusTransition.count({ where: transitionWhere }),
    ]);

    // ---- Merge & sort ----
    type AuditEntry = {
      id: string;
      source: 'audit_log' | 'status_transition';
      action: string;
      entityType: string;
      entityId: string;
      actorId: string | null;
      actorName: string | null;
      actorType: string;
      changes: unknown;
      metadata: unknown;
      fromStatus: string | null;
      toStatus: string | null;
      createdAt: string;
    };

    const auditEntries: AuditEntry[] = (auditLogs as AuditLogRow[]).map((log) => ({
      id: log.id,
      source: 'audit_log' as const,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorId: log.actorId,
      actorName: log.actor?.name ?? null,
      actorType: log.actorType,
      changes: log.changes,
      metadata: log.metadata,
      fromStatus: null,
      toStatus: null,
      createdAt: log.createdAt.toISOString(),
    }));

    const transitionEntries: AuditEntry[] = (transitions as TransitionRow[]).map((t) => {
      const isRequest = !!t.requestId;
      return {
        id: t.id,
        source: 'status_transition' as const,
        action: 'status_transition',
        entityType: isRequest ? 'Request' : 'SubRequest',
        entityId: isRequest
          ? (t.request?.reference ?? t.requestId ?? '')
          : (t.subRequest?.subReference ?? t.subRequestId ?? ''),
        actorId: t.triggeredBy,
        actorName: null,
        actorType: 'user',
        changes: null,
        metadata: t.metadata,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        createdAt: t.createdAt.toISOString(),
      };
    });

    const merged = [...auditEntries, ...transitionEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = auditCount + transitionCount;
    const start = (page - 1) * pageSize;
    const entries = merged.slice(start, start + pageSize);

    return NextResponse.json({ entries, total, page, pageSize });
  } catch (err) {
    return handleApiError(err, 'audit-logs.list.failed');
  }
}
