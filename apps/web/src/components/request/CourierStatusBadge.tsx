'use client';

import type { WaybillStatus } from '@golab/database';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const STATUS_CONFIG: Record<WaybillStatus, { label: string; variant: BadgeProps['variant'] }> = {
  BOOKED: { label: 'Booked', variant: 'secondary' },
  COLLECTED: { label: 'Collected', variant: 'default' },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', variant: 'warning' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  RETURNED: { label: 'Returned', variant: 'destructive' },
};

interface CourierStatusBadgeProps {
  status: WaybillStatus;
  className?: string;
}

export function CourierStatusBadge({ status, className }: CourierStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
