'use client';

import type { WaybillStatus } from '@golab/database';
import { cn } from '@/lib/utils';

interface TrackingEvent {
  timestamp: string;
  status: WaybillStatus;
  description: string;
  location?: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  className?: string;
}

const STATUS_ICONS: Record<string, string> = {
  BOOKED: 'B',
  COLLECTED: 'C',
  IN_TRANSIT: 'T',
  OUT_FOR_DELIVERY: 'O',
  DELIVERED: 'D',
  FAILED: 'F',
  RETURNED: 'R',
};

const STATUS_COLORS: Record<string, string> = {
  BOOKED: 'bg-blue-500',
  COLLECTED: 'bg-blue-600',
  IN_TRANSIT: 'bg-yellow-500',
  OUT_FOR_DELIVERY: 'bg-yellow-600',
  DELIVERED: 'bg-green-500',
  FAILED: 'bg-red-500',
  RETURNED: 'bg-red-400',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TrackingTimeline({ events, className }: TrackingTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No tracking events yet.</p>;
  }

  // Show most recent first
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className={cn('relative', className)}>
      <div className="space-y-0">
        {sortedEvents.map((event, index) => {
          const isFirst = index === 0;
          const isLast = index === sortedEvents.length - 1;
          const dotColor = STATUS_COLORS[event.status] ?? 'bg-gray-400';

          return (
            <div
              key={`${event.timestamp}-${event.status}`}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[15px] top-[30px] h-[calc(100%-20px)] w-0.5 bg-border" />
              )}

              {/* Status dot */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                  dotColor,
                  isFirst && 'ring-2 ring-offset-2 ring-offset-background',
                  isFirst && event.status === 'DELIVERED' && 'ring-green-500',
                  isFirst && event.status !== 'DELIVERED' && 'ring-primary',
                )}
              >
                {STATUS_ICONS[event.status] ?? '?'}
              </div>

              {/* Event details */}
              <div className="flex-1 pt-0.5">
                <p className={cn('text-sm font-medium', isFirst && 'font-semibold')}>
                  {event.description}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTimestamp(event.timestamp)}</span>
                  {event.location && (
                    <>
                      <span aria-hidden="true">-</span>
                      <span>{event.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
