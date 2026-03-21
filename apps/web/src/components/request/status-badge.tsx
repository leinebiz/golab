'use client';

import { Badge } from '@/components/ui/badge';
import { REQUEST_STATUS_LABELS, SUB_REQUEST_STATUS_LABELS, STATUS_COLORS } from '@golab/shared';

type ColorVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'orange' | 'red';

const COLOR_TO_VARIANT: Record<string, ColorVariant> = {
  gray: 'gray',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  orange: 'orange',
  red: 'red',
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
