'use client';

import { StatusBadge } from './status-badge';
import { FileCheck, FlaskConical } from 'lucide-react';

interface SubRequestTest {
  id: string;
  testName: string;
  sampleCount: number;
}

interface Certificate {
  id: string;
  fileName: string;
  format: string;
  releasedAt: string | null;
}

interface SubRequestCardData {
  id: string;
  subReference: string;
  labName: string;
  status: string;
  tests: SubRequestTest[];
  certificates: Certificate[];
  expectedCompletionAt: string | null;
}

interface SubRequestCardProps {
  subRequest: SubRequestCardData;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SubRequestCard({ subRequest }: SubRequestCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{subRequest.subReference}</p>
          <h4 className="text-base font-semibold">{subRequest.labName}</h4>
        </div>
        <StatusBadge status={subRequest.status} type="subRequest" />
      </div>

      {/* Tests */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <FlaskConical className="h-3 w-3" />
          <span>Tests</span>
        </div>
        {subRequest.tests.map((test) => (
          <div key={test.id} className="flex items-center justify-between text-sm">
            <span>{test.testName}</span>
            <span className="text-muted-foreground">&times;{test.sampleCount}</span>
          </div>
        ))}
      </div>

      {/* Expected completion */}
      {subRequest.expectedCompletionAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Expected: {formatDate(subRequest.expectedCompletionAt)}
        </p>
      )}

      {/* Certificates */}
      {subRequest.certificates.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <FileCheck className="h-3 w-3" />
            <span>Certificates</span>
          </div>
          {subRequest.certificates.map((cert) => (
            <a
              key={cert.id}
              href={`/api/v1/certificates/${cert.id}/download`}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <FileCheck className="h-3 w-3" />
              {cert.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export type { SubRequestCardData };
