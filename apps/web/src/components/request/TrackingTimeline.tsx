'use client';

import type { WaybillStatus } from '@golab/database';
import { cn } from '@/lib/utils';
import { CourierStatusBadge } from './CourierStatusBadge';

export interface TimelineEvent {
  timestamp: string;
  status: WaybillStatus;
  location?: string | null;
  description: string;
}

interface TrackingTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TrackingTimeline({ events, className }: TrackingTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No tracking events yet.</p>;
  }

  // Show most recent first
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ol className={cn('relative border-l border-gray-200 dark:border-gray-700', className)}>
      {sorted.map((event, idx) => (
        <li key={`${event.timestamp}-${idx}`} className="mb-6 ml-6">
          {/* Dot */}
          <span
            className={cn(
              'absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900',
              idx === 0 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
            )}
          />

          {/* Content */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CourierStatusBadge status={event.status} />
              <time className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</time>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{event.description}</p>
            {event.location && <p className="text-xs text-gray-400">{event.location}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
