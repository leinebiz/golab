'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Phone, RefreshCw, CheckCircle, XCircle, Download, Send } from 'lucide-react';
import { ProgressBar } from '@/components/request/progress-bar';
import { StatusBadge } from '@/components/request/status-badge';
import { StatusTimeline } from '@/components/request/status-timeline';
import { SubRequestCard } from '@/components/request/sub-request-card';
import type { SubRequestCardData } from '@/components/request/sub-request-card';

// ---- Types ----

interface TransitionEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  triggeredBy: string;
  reason: string | null;
  createdAt: string;
}

interface DocumentEntry {
  type: string;
  label: string;
  url: string;
}

interface QuoteData {
  id: string;
  quoteNumber: string;
  totalAmount: string;
  isAccepted: boolean | null;
  expiresAt: string;
}

interface RequestDetail {
  id: string;
  reference: string;
  status: string;
  turnaroundType: string;
  specialInstructions: string | null;
  customerAction: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  closedAt: string | null;
  subRequests: SubRequestCardData[];
  quote: QuoteData | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
  } | null;
  transitions: TransitionEntry[];
  documents: DocumentEntry[];
}

// ---- Component ----

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/requests/${params.id}`);
      if (res.status === 404) {
        setError('Request not found');
        return;
      }
      if (!res.ok) throw new Error('Failed to load request');
      const json = await res.json();
      setRequest(json.data);
    } catch {
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAction = async (endpoint: string, body?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/requests/${params.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Action failed');
      }
      // Refresh detail after action
      await fetchDetail();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Action failed';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-600">{error ?? 'Request not found'}</p>
        <Link href="/customer/requests" className="text-blue-600 hover:underline text-sm">
          Back to requests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/customer/requests" className="hover:text-foreground">
          Requests
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{request.reference}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{request.reference}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={request.status} />
            <span className="text-sm text-muted-foreground">
              {request.turnaroundType === 'EXPEDITED' ? 'Expedited' : 'Standard'} turnaround
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar currentStatus={request.status} />

      {/* Customer action buttons */}
      <CustomerActions
        status={request.status}
        actionLoading={actionLoading}
        onAccept={() => handleAction('accept')}
        onReject={() => handleAction('reject', { reason: 'Customer declined' })}
        onClose={() => router.push('/customer/requests')}
      />

      {/* Quote summary */}
      {request.quote && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Quote</h3>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-lg font-bold">
              R{' '}
              {Number(request.quote.totalAmount).toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-sm text-muted-foreground">{request.quote.quoteNumber}</span>
            {request.quote.isAccepted === true && (
              <span className="text-xs text-green-600 font-medium">Accepted</span>
            )}
            {request.quote.isAccepted === false && (
              <span className="text-xs text-red-600 font-medium">Rejected</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content: sub-requests */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Lab Assignments</h2>
          {request.subRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab assignments yet.</p>
          ) : (
            request.subRequests.map((sr) => <SubRequestCard key={sr.id} subRequest={sr} />)
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Documents */}
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Documents</h3>
            {request.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents available.</p>
            ) : (
              <div className="space-y-2">
                {request.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {doc.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Status History</h3>
            <StatusTimeline transitions={request.transitions} />
          </div>

          {/* Special instructions */}
          {request.specialInstructions && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Special Instructions
              </h3>
              <p className="text-sm">{request.specialInstructions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Customer Action Buttons ----

interface CustomerActionsProps {
  status: string;
  actionLoading: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

function CustomerActions({
  status,
  actionLoading,
  onAccept,
  onReject,
  onClose,
}: CustomerActionsProps) {
  if (status === 'PENDING_CUSTOMER_REVIEW') {
    return (
      <div className="flex flex-wrap gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="w-full mb-1">
          <p className="text-sm font-medium text-yellow-800">Your action is required</p>
          <p className="text-xs text-yellow-700">Review the quote and accept or reject it.</p>
        </div>
        <button
          disabled={actionLoading}
          onClick={onAccept}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" />
          Accept Quote
        </button>
        <button
          disabled={actionLoading}
          onClick={onReject}
          className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Reject Quote
        </button>
      </div>
    );
  }

  if (status === 'PENDING_CUSTOMER_ACTION') {
    return (
      <div className="flex flex-wrap gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="w-full mb-1">
          <p className="text-sm font-medium text-yellow-800">Your action is required</p>
          <p className="text-xs text-yellow-700">Testing is complete. Choose how to proceed.</p>
        </div>
        <button
          disabled={actionLoading}
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" />
          Accept &amp; Close
        </button>
        <button
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <Phone className="h-4 w-4" />
          Request Callback
        </button>
        <button
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Request Retest
        </button>
        <button
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send to Another Lab
        </button>
      </div>
    );
  }

  return null;
}
