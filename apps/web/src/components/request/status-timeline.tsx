'use client';

import { REQUEST_STATUS_LABELS, SUB_REQUEST_STATUS_LABELS } from '@golab/shared';
import { StatusBadge } from './status-badge';

interface TimelineEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  triggeredBy: string;
  reason: string | null;
  createdAt: string;
}

interface StatusTimelineProps {
  transitions: TimelineEntry[];
  entityType?: 'request' | 'subRequest';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusTimeline({ transitions, entityType = 'request' }: StatusTimelineProps) {
  const labels = entityType === 'request' ? REQUEST_STATUS_LABELS : SUB_REQUEST_STATUS_LABELS;

  if (transitions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transitions recorded yet.</p>;
  }

  return (
    <div className="relative ml-3">
      {/* Vertical line */}
      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {transitions.map((t) => (
          <div key={t.id} className="relative pl-6">
            {/* Dot */}
            <div className="absolute left-[-4px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={t.toStatus} type={entityType} />
                <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {labels[t.fromStatus] ?? t.fromStatus} &rarr; {labels[t.toStatus] ?? t.toStatus}
              </p>
              <p className="text-xs text-muted-foreground">by {t.triggeredBy}</p>
              {t.reason && (
                <p className="text-xs italic text-muted-foreground">&quot;{t.reason}&quot;</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
