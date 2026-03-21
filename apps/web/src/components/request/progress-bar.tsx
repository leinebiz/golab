'use client';

import { cn } from '@/lib/utils';
import { REQUEST_STATUS_LABELS } from '@golab/shared';

/**
 * Ordered workflow stages for the customer-facing progress bar.
 * Statuses are grouped into high-level stages so the bar stays concise.
 */
const PROGRESS_STAGES = [
  { key: 'submitted', label: 'Submitted', statuses: ['DRAFT', 'QUOTE_CALCULATED'] },
  { key: 'review', label: 'Review', statuses: ['PENDING_CUSTOMER_REVIEW'] },
  {
    key: 'payment',
    label: 'Payment',
    statuses: [
      'ACCEPTED_BY_CUSTOMER',
      'INVOICE_GENERATED',
      'AWAITING_COD_PAYMENT',
      'PAYMENT_RECEIVED',
      'CREDIT_APPROVED_FOR_REQUEST',
    ],
  },
  { key: 'testing', label: 'Testing', statuses: ['IN_PROGRESS'] },
  { key: 'action', label: 'Action Required', statuses: ['PENDING_CUSTOMER_ACTION'] },
  { key: 'closed', label: 'Closed', statuses: ['CLOSED'] },
];

const TERMINAL_STATUSES = new Set(['CANCELLED', 'ON_HOLD']);

interface ProgressBarProps {
  currentStatus: string;
  className?: string;
}

export function ProgressBar({ currentStatus, className }: ProgressBarProps) {
  if (TERMINAL_STATUSES.has(currentStatus)) {
    const label = REQUEST_STATUS_LABELS[currentStatus] ?? currentStatus;
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <span className="text-sm font-semibold text-orange-600">{label}</span>
      </div>
    );
  }

  const currentStageIndex = PROGRESS_STAGES.findIndex((stage) =>
    stage.statuses.includes(currentStatus),
  );

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1">
        {PROGRESS_STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
              {/* Bar segment */}
              <div
                className={cn(
                  'h-2 w-full rounded-full transition-colors',
                  isCompleted && 'bg-green-500',
                  isCurrent && 'bg-blue-500',
                  !isCompleted && !isCurrent && 'bg-gray-200',
                )}
              />
              {/* Label */}
              <span
                className={cn(
                  'text-[10px] leading-tight text-center',
                  isCurrent ? 'font-semibold text-blue-700' : 'text-muted-foreground',
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
