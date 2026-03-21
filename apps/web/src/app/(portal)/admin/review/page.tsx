'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewPanel } from './review-panel';

interface CertificateListItem {
  id: string;
  fileName: string;
  format: string;
  createdAt: string;
  reviewAction: string | null;
  subRequest: {
    id: string;
    subReference: string;
    laboratory: { id: string; name: string; code: string };
    request: { id: string; reference: string };
    tests: Array<{
      testCatalogue: { id: string; code: string; name: string };
    }>;
  };
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function ReviewQueuePage() {
  const [certificates, setCertificates] = useState<CertificateListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);

  const fetchCertificates = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/certificates?status=pending&page=${page}&pageSize=25`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setCertificates(json.data);
      setPagination(json.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  function formatAge(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  const handleReviewComplete = useCallback(() => {
    setSelectedCertId(null);
    fetchCertificates(pagination.page);
  }, [fetchCertificates, pagination.page]);

  // If a certificate is selected, show the review panel
  if (selectedCertId) {
    return (
      <ReviewPanel
        certificateId={selectedCertId}
        onClose={() => setSelectedCertId(null)}
        onComplete={handleReviewComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Certificates awaiting GoLab review, oldest first.
          </p>
        </div>
        <Badge variant="info">{pagination.total} pending</Badge>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchCertificates()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && !error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Loading certificates...</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && certificates.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No certificates awaiting review.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Sub-Reference</th>
                    <th className="pb-3 pr-4 font-medium">Lab</th>
                    <th className="pb-3 pr-4 font-medium">Tests</th>
                    <th className="pb-3 pr-4 font-medium">Uploaded</th>
                    <th className="pb-3 pr-4 font-medium">Age</th>
                    <th className="pb-3 pr-4 font-medium">File</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {cert.subRequest.subReference}
                      </td>
                      <td className="py-3 pr-4">{cert.subRequest.laboratory.name}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {cert.subRequest.tests.map((t) => (
                            <Badge key={t.testCatalogue.id} variant="secondary" className="text-xs">
                              {t.testCatalogue.code}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {new Date(cert.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="warning">{formatAge(cert.createdAt)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600 max-w-[150px] truncate">
                        {cert.fileName}
                      </td>
                      <td className="py-3">
                        <Button size="sm" onClick={() => setSelectedCertId(cert.id)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchCertificates(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchCertificates(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
