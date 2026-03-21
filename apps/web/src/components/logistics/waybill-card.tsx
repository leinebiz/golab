'use client';

import type { WaybillStatus } from '@golab/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils';

interface WaybillCardProps {
  waybill: {
    id: string;
    waybillNumber: string;
    courierProvider: string;
    status: WaybillStatus;
    estimatedDelivery?: Date | string | null;
    collectedAt?: Date | string | null;
    deliveredAt?: Date | string | null;
    createdAt: Date | string;
    subRequest?: {
      subReference: string;
      laboratory?: {
        name: string;
        code?: string;
      };
    } | null;
  };
  /** Base URL for the waybill PDF download */
  pdfBaseUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function WaybillCard({ waybill, pdfBaseUrl, className }: WaybillCardProps) {
  const pdfUrl = pdfBaseUrl
    ? `${pdfBaseUrl}/${waybill.id}/pdf`
    : `/api/v1/waybills/${waybill.id}/pdf`;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{waybill.waybillNumber}</CardTitle>
        <StatusBadge status={waybill.status} />
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {waybill.subRequest && (
            <>
              <dt className="text-muted-foreground">Sub-Request</dt>
              <dd className="font-medium">{waybill.subRequest.subReference}</dd>
            </>
          )}
          {waybill.subRequest?.laboratory && (
            <>
              <dt className="text-muted-foreground">Laboratory</dt>
              <dd className="font-medium">
                {waybill.subRequest.laboratory.name}
                {waybill.subRequest.laboratory.code && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({waybill.subRequest.laboratory.code})
                  </span>
                )}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Courier</dt>
          <dd className="font-medium">{waybill.courierProvider}</dd>

          <dt className="text-muted-foreground">Created</dt>
          <dd className="font-medium">{formatDate(waybill.createdAt)}</dd>

          {waybill.estimatedDelivery && (
            <>
              <dt className="text-muted-foreground">Est. Delivery</dt>
              <dd className="font-medium">{formatDate(waybill.estimatedDelivery)}</dd>
            </>
          )}

          {waybill.collectedAt && (
            <>
              <dt className="text-muted-foreground">Collected</dt>
              <dd className="font-medium">{formatDate(waybill.collectedAt)}</dd>
            </>
          )}

          {waybill.deliveredAt && (
            <>
              <dt className="text-muted-foreground">Delivered</dt>
              <dd className="font-medium">{formatDate(waybill.deliveredAt)}</dd>
            </>
          )}
        </dl>

        <div className="mt-4 flex gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Download Waybill
          </a>
          <a
            href={`/api/v1/waybills/${waybill.id}/track`}
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Refresh Tracking
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
