'use client';

import type { WaybillStatus } from '@golab/database';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<
  WaybillStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  }
> = {
  BOOKED: { label: 'Booked', variant: 'info' },
  COLLECTED: { label: 'Collected', variant: 'info' },
  IN_TRANSIT: { label: 'In Transit', variant: 'warning' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', variant: 'warning' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  RETURNED: { label: 'Returned', variant: 'destructive' },
};

interface StatusBadgeProps {
  status: WaybillStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
