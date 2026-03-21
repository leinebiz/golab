'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SUB_REQUEST_STATUS_LABELS, STATUS_COLORS } from '@golab/shared';

interface ReviewQueueItem {
  id: string;
  subReference: string;
  requestReference: string;
  requestId: string;
  status: string;
  customer: { id: string; name: string };
  laboratory: { id: string; name: string; code: string };
  tests: Array<{ code: string; name: string; sampleCount: number }>;
  latestCertificate: {
    id: string;
    fileName: string;
    format: string;
    createdAt: string;
    isValidated: boolean;
    reviewAction: string | null;
    reviewedById: string | null;
    reviewedAt: string | null;
  } | null;
  uploadedAt: string | null;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/certificates?page=${page}&limit=20`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to fetch review queue');
      }
      const data = await res.json();
      setItems(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue(pagination.page);
  }, [fetchQueue, pagination.page]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Certificates awaiting review, sorted by age (oldest first)
          </p>
        </div>
        <button
          onClick={() => fetchQueue(pagination.page)}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading review queue...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">No certificates awaiting review</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lab
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tests
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{item.subReference}</div>
                      <div className="text-gray-500 text-xs">{item.requestReference}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{item.laboratory.name}</div>
                      <div className="text-xs text-gray-400">{item.laboratory.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.customer.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.tests.map((t) => t.code).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(item.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}
                      >
                        {SUB_REQUEST_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.latestCertificate && (
                        <Link
                          href={`/admin/review/${item.latestCertificate.id}`}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
                        >
                          Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.totalPages, p.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
