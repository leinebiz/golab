'use client';

import { Badge } from '@/components/ui/badge';
import { REQUEST_STATUS_LABELS, SUB_REQUEST_STATUS_LABELS, STATUS_COLORS } from '@golab/shared';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'gray'
  | 'outline';

const COLOR_TO_VARIANT: Record<string, BadgeVariant> = {
  gray: 'gray',
  blue: 'default',
  green: 'success',
  yellow: 'warning',
  orange: 'warning',
  red: 'destructive',
};

interface StatusBadgeProps {
  status: string;
  type?: 'request' | 'subRequest';
  className?: string;
}

export function StatusBadge({ status, type = 'request', className }: StatusBadgeProps) {
  const labels = type === 'request' ? REQUEST_STATUS_LABELS : SUB_REQUEST_STATUS_LABELS;
  const label = labels[status] ?? status;
  const color = STATUS_COLORS[status] ?? 'gray';
  const variant = COLOR_TO_VARIANT[color] ?? 'gray';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
