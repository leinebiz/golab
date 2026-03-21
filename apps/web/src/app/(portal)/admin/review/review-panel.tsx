'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewCertificateInput } from '@golab/shared';

interface CertificateDetail {
  id: string;
  fileName: string;
  format: string;
  version: number;
  createdAt: string;
  isValidated: boolean;
  validationErrors: Array<{ field: string; severity: string; message: string }> | null;
  subRequest: {
    id: string;
    subReference: string;
    status: string;
    laboratory: { id: string; name: string; code: string };
    request: {
      id: string;
      reference: string;
      organization: { id: string; name: string };
      turnaroundType: string;
      specialInstructions: string | null;
    };
    tests: Array<{
      sampleCount: number;
      accreditationRequired: boolean;
      testCatalogue: { id: string; code: string; name: string; category: string };
    }>;
  };
}

type ReviewAction = ReviewCertificateInput['action'];

const REVIEW_ACTIONS: {
  value: ReviewAction;
  label: string;
  colorClass: string;
}[] = [
  {
    value: 'APPROVED',
    label: 'Approve',
    colorClass:
      'peer-checked:bg-green-100 peer-checked:text-green-800 peer-checked:border-green-300',
  },
  {
    value: 'RETURNED_TO_LAB',
    label: 'Return to Lab',
    colorClass:
      'peer-checked:bg-yellow-100 peer-checked:text-yellow-800 peer-checked:border-yellow-300',
  },
  {
    value: 'ON_HOLD',
    label: 'Hold',
    colorClass: 'peer-checked:bg-gray-100 peer-checked:text-gray-900 peer-checked:border-gray-300',
  },
  {
    value: 'REPLICATED_TO_GOLAB_FORMAT',
    label: 'Replicate to GoLab Format',
    colorClass: 'peer-checked:bg-blue-100 peer-checked:text-blue-800 peer-checked:border-blue-300',
  },
];

interface ReviewPanelProps {
  certificateId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ReviewPanel({ certificateId, onClose, onComplete }: ReviewPanelProps) {
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors: formErrors },
  } = useForm<{ action: ReviewAction; notes: string }>({
    defaultValues: { action: 'APPROVED', notes: '' },
  });

  const selectedAction = watch('action');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [certRes, dlRes] = await Promise.all([
        fetch(`/api/v1/certificates/${certificateId}`),
        fetch(`/api/v1/certificates/${certificateId}/download`),
      ]);

      if (!certRes.ok) {
        const body = await certRes.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${certRes.status}`);
      }

      const certJson = await certRes.json();
      setCertificate(certJson.data);

      if (dlRes.ok) {
        const dlJson = await dlRes.json();
        setPdfUrl(dlJson.data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: { action: ReviewAction; notes: string }) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/v1/certificates/${certificateId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: data.action, notes: data.notes || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      onComplete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Review submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onClose}>
          Back to Queue
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Loading certificate...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onClose}>
          Back to Queue
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error ?? 'Certificate not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sub = certificate.subRequest;
  const req = sub.request;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onClose}>
          Back to Queue
        </Button>
        <h1 className="text-xl font-bold">Review: {sub.subReference}</h1>
        <Badge variant="info">{sub.status.replace(/_/g, ' ')}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: PDF Viewer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Certificate PDF</CardTitle>
          </CardHeader>
          <CardContent>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title={`Certificate ${certificate.fileName}`}
                className="w-full h-[600px] border rounded"
              />
            ) : (
              <div className="w-full h-[600px] bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">PDF preview unavailable</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {certificate.fileName} (v{certificate.version}, {certificate.format})
            </p>
          </CardContent>
        </Card>

        {/* Right: Request details + review form */}
        <div className="space-y-4">
          {/* Request info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">Request:</span>
                  <p className="font-mono">{req.reference}</p>
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <p>{req.organization.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Lab:</span>
                  <p>
                    {sub.laboratory.name} ({sub.laboratory.code})
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Turnaround:</span>
                  <p>{req.turnaroundType}</p>
                </div>
              </div>
              {req.specialInstructions && (
                <div>
                  <span className="text-gray-500">Special Instructions:</span>
                  <p className="mt-1 text-xs bg-yellow-50 p-2 rounded">{req.specialInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requested Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sub.tests.map((t) => (
                  <div
                    key={t.testCatalogue.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div>
                      <span className="font-mono text-xs mr-2">{t.testCatalogue.code}</span>
                      <span>{t.testCatalogue.name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {t.testCatalogue.category}
                      </Badge>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {t.sampleCount} sample{t.sampleCount !== 1 ? 's' : ''}
                      {t.accreditationRequired && (
                        <Badge variant="info" className="ml-1 text-xs">
                          Accredited
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Validation results */}
          {certificate.validationErrors && certificate.validationErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Validation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {certificate.validationErrors.map((v, i) => (
                    <div
                      key={i}
                      className={`text-xs p-2 rounded ${
                        v.severity === 'error'
                          ? 'bg-red-50 text-red-800'
                          : 'bg-yellow-50 text-yellow-800'
                      }`}
                    >
                      <span className="font-semibold uppercase">{v.severity}:</span> {v.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Action</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {REVIEW_ACTIONS.map((ra) => (
                    <label key={ra.value} className="cursor-pointer">
                      <input
                        type="radio"
                        value={ra.value}
                        {...register('action')}
                        className="sr-only peer"
                      />
                      <div
                        className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors peer-checked:ring-2 peer-checked:ring-gray-900 hover:bg-gray-50 ${ra.colorClass}`}
                      >
                        {ra.label}
                      </div>
                    </label>
                  ))}
                </div>

                <div>
                  <label
                    htmlFor="review-notes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Notes {selectedAction !== 'APPROVED' && <span className="text-red-500">*</span>}
                  </label>
                  <Textarea
                    id="review-notes"
                    placeholder={
                      selectedAction === 'APPROVED'
                        ? 'Optional notes...'
                        : 'Required: explain why certificate is not approved (min 5 characters)'
                    }
                    {...register('notes', {
                      validate: (value) => {
                        if (selectedAction !== 'APPROVED' && (!value || value.length < 5)) {
                          return 'Notes required when not approving (min 5 characters)';
                        }
                        return true;
                      },
                    })}
                  />
                  {formErrors.notes && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.notes.message}</p>
                  )}
                </div>

                {submitError && <p className="text-red-600 text-sm">{submitError}</p>}

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
