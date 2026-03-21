'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SUB_REQUEST_STATUS_LABELS, STATUS_COLORS } from '@golab/shared';
import type { ValidationResult } from '@/lib/workflow/certificate-validation';

interface CertificateDetail {
  id: string;
  format: string;
  version: number;
  fileName: string;
  mimeType: string;
  originalFileKey: string;
  golabFileKey: string | null;
  isValidated: boolean;
  validationErrors: unknown;
  validatedAt: string | null;
  reviewAction: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  releasedAt: string | null;
  createdAt: string;
}

interface ReviewData {
  certificate: CertificateDetail;
  subRequest: {
    id: string;
    subReference: string;
    status: string;
    labAcceptedAt: string | null;
    testingStartedAt: string | null;
    testingCompletedAt: string | null;
  };
  request: {
    id: string;
    reference: string;
    status: string;
    turnaroundType: string;
    specialInstructions: string | null;
    createdAt: string;
  };
  customer: {
    id: string;
    name: string;
    registrationNumber: string | null;
    industry: string | null;
  };
  laboratory: {
    id: string;
    name: string;
    code: string;
    contactEmail: string;
  };
  tests: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    accreditation: string;
    sampleCount: number;
    accreditationRequired: boolean;
    tolerances: Array<{
      minValue: string | null;
      maxValue: string | null;
      unit: string;
      notes: string | null;
    }>;
  }>;
  history: Array<{
    from: string;
    to: string;
    reason: string | null;
    createdAt: string;
  }>;
}

type ReviewAction = 'APPROVED' | 'RETURNED_TO_LAB' | 'ON_HOLD' | 'REPLICATED_TO_GOLAB_FORMAT';

export default function ReviewCertificatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ReviewData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/certificates/${id}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to load certificate');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function runValidation() {
    setValidating(true);
    try {
      const res = await fetch(`/api/v1/certificates/${id}/validate`);
      if (!res.ok) throw new Error('Validation request failed');
      setValidation(await res.json());
    } catch {
      setError('Failed to run validation');
    } finally {
      setValidating(false);
    }
  }

  async function submitReview() {
    if (!selectedAction) return;

    if (selectedAction !== 'APPROVED' && reviewNotes.length < 5) {
      setError('Notes are required (min 5 characters) for non-approval actions');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/certificates/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          notes: reviewNotes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Review submission failed');
      }
      router.push('/admin/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetest() {
    if (!data) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sub-requests/${data.subRequest.id}/retest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Retest creation failed');
      }
      router.push('/admin/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getStatusBadgeClass(status: string): string {
    const color = STATUS_COLORS[status] ?? 'gray';
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return colorMap[color] ?? colorMap.gray;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading certificate details...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <Link href="/admin/review" className="text-sm text-blue-600 hover:text-blue-800">
          Back to Review Queue
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const isReviewable = data.subRequest.status === 'AWAITING_GOLAB_REVIEW';
  const alreadyReviewed = !!data.certificate.reviewAction;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/review" className="text-sm text-blue-600 hover:text-blue-800">
            &larr; Back to Review Queue
          </Link>
          <h1 className="text-2xl font-bold mt-2">Review: {data.subRequest.subReference}</h1>
          <p className="text-sm text-gray-500">Request {data.request.reference}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(data.subRequest.status)}`}
        >
          {SUB_REQUEST_STATUS_LABELS[data.subRequest.status] ?? data.subRequest.status}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Side-by-side layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: PDF viewer placeholder */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Certificate Document</h2>
          <div className="bg-gray-100 rounded-lg flex items-center justify-center min-h-[500px]">
            <div className="text-center space-y-3">
              <div className="text-4xl text-gray-400">PDF</div>
              <p className="text-sm text-gray-500">{data.certificate.fileName}</p>
              <p className="text-xs text-gray-400">
                Format: {data.certificate.format} | Version: {data.certificate.version}
              </p>
              <p className="text-xs text-gray-400">File key: {data.certificate.originalFileKey}</p>
            </div>
          </div>
        </div>

        {/* Right: Request details */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{data.customer.name}</dd>
              </div>
              {data.customer.registrationNumber && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Registration</dt>
                  <dd>{data.customer.registrationNumber}</dd>
                </div>
              )}
              {data.customer.industry && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Industry</dt>
                  <dd>{data.customer.industry}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Lab info */}
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Laboratory</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{data.laboratory.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Code</dt>
                <dd>{data.laboratory.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Contact</dt>
                <dd>{data.laboratory.contactEmail}</dd>
              </div>
            </dl>
          </div>

          {/* Tests */}
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Tests Requested ({data.tests.length})
            </h3>
            <div className="space-y-3">
              {data.tests.map((test) => (
                <div key={test.id} className="rounded-md bg-gray-50 p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{test.code}</span>
                      <span className="text-gray-500 ml-2">{test.name}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        test.accreditation === 'ACCREDITED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.accreditation}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Category: {test.category} | Samples: {test.sampleCount}
                    {test.accreditationRequired && ' | Accreditation required'}
                  </div>
                  {test.tolerances.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">Tolerances:</span>
                      {test.tolerances.map((tol, i) => (
                        <span key={i} className="ml-2">
                          {tol.minValue && `Min: ${tol.minValue}`}
                          {tol.minValue && tol.maxValue && ' / '}
                          {tol.maxValue && `Max: ${tol.maxValue}`}
                          {` ${tol.unit}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Request details */}
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Request Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Turnaround</dt>
                <dd>{data.request.turnaroundType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd>{formatDate(data.request.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Testing started</dt>
                <dd>{formatDate(data.subRequest.testingStartedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Testing completed</dt>
                <dd>{formatDate(data.subRequest.testingCompletedAt)}</dd>
              </div>
              {data.request.specialInstructions && (
                <div>
                  <dt className="text-gray-500 mb-1">Special Instructions</dt>
                  <dd className="bg-yellow-50 rounded p-2 text-xs">
                    {data.request.specialInstructions}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Validation */}
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Validation</h3>
              <button
                onClick={runValidation}
                disabled={validating}
                className="text-xs rounded-md bg-gray-100 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {validating ? 'Running...' : 'Run Validation'}
              </button>
            </div>
            {validation ? (
              <div className="space-y-2">
                <div
                  className={`text-sm font-medium ${validation.isValid ? 'text-green-700' : 'text-red-700'}`}
                >
                  {validation.isValid ? 'Passed' : 'Issues found'}
                </div>
                {validation.errors.map((e, i) => (
                  <div key={`err-${i}`} className="text-xs bg-red-50 rounded p-2 text-red-700">
                    <span className="font-medium">Error:</span> {e.message}
                    {e.expected && (
                      <div className="mt-0.5 text-red-500">
                        Expected: {e.expected} | Actual: {e.actual}
                      </div>
                    )}
                  </div>
                ))}
                {validation.warnings.map((w, i) => (
                  <div
                    key={`warn-${i}`}
                    className="text-xs bg-yellow-50 rounded p-2 text-yellow-700"
                  >
                    <span className="font-medium">Warning:</span> {w.message}
                    {w.expected && (
                      <div className="mt-0.5 text-yellow-600">
                        Expected: {w.expected} | Actual: {w.actual}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : data.certificate.isValidated ? (
              <p className="text-xs text-gray-500">
                Previously validated on {formatDate(data.certificate.validatedAt)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Not yet validated</p>
            )}
          </div>

          {/* Review actions */}
          {isReviewable && !alreadyReviewed && (
            <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Review Actions</h3>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="review-notes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Review Notes
                  </label>
                  <textarea
                    id="review-notes"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add review notes (required for non-approval actions)..."
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setSelectedAction('APPROVED');
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                      selectedAction === 'APPROVED'
                        ? 'bg-green-600 text-white ring-2 ring-green-600'
                        : 'bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAction('RETURNED_TO_LAB');
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                      selectedAction === 'RETURNED_TO_LAB'
                        ? 'bg-orange-600 text-white ring-2 ring-orange-600'
                        : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    Return to Lab
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAction('ON_HOLD');
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                      selectedAction === 'ON_HOLD'
                        ? 'bg-yellow-600 text-white ring-2 ring-yellow-600'
                        : 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    Hold
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAction('REPLICATED_TO_GOLAB_FORMAT');
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                      selectedAction === 'REPLICATED_TO_GOLAB_FORMAT'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600'
                        : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    Replicate
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={submitReview}
                    disabled={!selectedAction || submitting}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    onClick={handleRetest}
                    disabled={submitting}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    Request Retest
                  </button>
                </div>
              </div>
            </div>
          )}

          {alreadyReviewed && (
            <div className="bg-green-50 rounded-lg ring-1 ring-green-200 p-6">
              <h3 className="text-sm font-semibold text-green-900 mb-2">Review Completed</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-green-700">Action</dt>
                  <dd className="font-medium text-green-900">{data.certificate.reviewAction}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-green-700">Reviewed</dt>
                  <dd>{formatDate(data.certificate.reviewedAt)}</dd>
                </div>
                {data.certificate.reviewNotes && (
                  <div>
                    <dt className="text-green-700">Notes</dt>
                    <dd className="mt-1 bg-white rounded p-2 text-xs">
                      {data.certificate.reviewNotes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Status history */}
          {data.history.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status History</h3>
              <div className="space-y-2">
                {data.history.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="text-gray-400 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </span>
                    <div>
                      <span className="text-gray-500">{entry.from}</span>
                      <span className="mx-1">&rarr;</span>
                      <span className="font-medium">{entry.to}</span>
                      {entry.reason && <span className="text-gray-400 ml-2">({entry.reason})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
