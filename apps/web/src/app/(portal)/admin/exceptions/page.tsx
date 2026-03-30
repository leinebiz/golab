'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';

interface SampleIssue {
  id: string;
  issueType: string;
  comments: string;
  resolution: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
  subRequestId: string;
  subReference: string;
  subRequestStatus: string;
  requestId: string;
  requestReference: string;
  organizationName: string;
  labName: string;
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  INSUFFICIENT_SAMPLE: 'Insufficient Sample',
  SAMPLE_DAMAGED: 'Sample Damaged',
  INCORRECT_TEST_CHOSEN: 'Incorrect Test',
  INCORRECT_PACKAGING: 'Incorrect Packaging',
  OTHER: 'Other',
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
  INSUFFICIENT_SAMPLE: 'bg-yellow-100 text-yellow-800',
  SAMPLE_DAMAGED: 'bg-red-100 text-red-800',
  INCORRECT_TEST_CHOSEN: 'bg-blue-100 text-blue-800',
  INCORRECT_PACKAGING: 'bg-orange-100 text-orange-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export default function ExceptionsPage() {
  const [issues, setIssues] = useState<SampleIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/exceptions?status=${filter}`);
      if (res.ok) {
        const json = await res.json();
        setIssues(json.data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleResolve = async (issueId: string) => {
    if (!resolution.trim() || resolution.trim().length < 5) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/exceptions/${issueId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: resolution.trim() }),
      });
      if (res.ok) {
        setResolveId(null);
        setResolution('');
        fetchIssues();
      }
    } catch {
      // silently handle
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exception Management</h1>
          <p className="text-sm text-gray-500">
            Track, manage and resolve sample issues reported by laboratories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'open' | 'resolved' | 'all')}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="open">Open Issues</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">Open</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{issues.filter((i) => !i.resolvedAt).length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Resolved</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{issues.filter((i) => i.resolvedAt).length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{issues.length}</p>
        </div>
      </div>

      {/* Issues table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400">Loading exceptions...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <CheckCircle className="h-12 w-12 mb-3" />
          <p>No {filter === 'open' ? 'open' : ''} exceptions found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Lab</th>
                <th className="px-4 py-3 font-medium">Issue Type</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{issue.requestReference}</div>
                    <div className="text-xs text-gray-400">{issue.subReference}</div>
                  </td>
                  <td className="px-4 py-3">{issue.organizationName}</td>
                  <td className="px-4 py-3">{issue.labName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ISSUE_TYPE_COLORS[issue.issueType] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">{issue.comments}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {issue.resolvedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        <AlertTriangle className="h-3 w-3" />
                        Open
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!issue.resolvedAt && (
                      <button
                        onClick={() => {
                          setResolveId(issue.id);
                          setResolution('');
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Resolve
                      </button>
                    )}
                    {issue.resolvedAt && issue.resolution && (
                      <span className="text-xs text-gray-500">{issue.resolution}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve dialog */}
      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Resolve Exception</h3>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe the resolution (min 5 characters)..."
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setResolveId(null)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(resolveId)}
                disabled={submitting || resolution.trim().length < 5}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
