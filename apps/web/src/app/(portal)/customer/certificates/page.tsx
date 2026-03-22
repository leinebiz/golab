'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, type ColumnDef, flexRender } from '@tanstack/react-table';
import { Search, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ---- Types ----

interface CertificateListItem {
  id: string;
  format: string;
  reviewAction: string | null;
  fileName: string;
  createdAt: string;
  subRequest: {
    id: string;
    subReference: string;
    laboratory: { id: string; name: string; code: string };
    request: { id: string; reference: string; organizationId: string };
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

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Returned', value: 'returned' },
] as const;

const REVIEW_ACTION_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  RETURNED_TO_LAB: 'Returned to Lab',
  ON_HOLD: 'On Hold',
  REPLICATED_TO_GOLAB_FORMAT: 'Replicated',
};

const REVIEW_ACTION_VARIANTS: Record<string, string> = {
  APPROVED: 'success',
  RETURNED_TO_LAB: 'warning',
  ON_HOLD: 'warning',
  REPLICATED_TO_GOLAB_FORMAT: 'default',
};

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'gray'
  | 'outline';

function CertificateStatusBadge({ reviewAction }: { reviewAction: string | null }) {
  if (!reviewAction) {
    return <Badge variant="gray">Pending Review</Badge>;
  }
  const label = REVIEW_ACTION_LABELS[reviewAction] ?? reviewAction;
  const variant = (REVIEW_ACTION_VARIANTS[reviewAction] ?? 'gray') as BadgeVariant;
  return <Badge variant={variant}>{label}</Badge>;
}

// ---- Component ----

export default function CertificatesPage() {
  const [data, setData] = useState<CertificateListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCertificates = useCallback(
    async (page: number, status: string, searchTerm: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '25',
          status,
        });
        if (searchTerm) params.set('search', searchTerm);

        const res = await fetch(`/api/v1/certificates?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch certificates');
        const json = await res.json();
        setData(json.data);
        setPagination(json.pagination);
      } catch (err) {
        console.error('Failed to fetch certificates:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCertificates(1, statusFilter, debouncedSearch);
  }, [statusFilter, debouncedSearch, fetchCertificates]);

  const handlePageChange = (page: number) => {
    fetchCertificates(page, statusFilter, debouncedSearch);
  };

  const handleDownload = async (certificateId: string) => {
    try {
      const res = await fetch(`/api/v1/certificates/${certificateId}/download`);
      if (!res.ok) throw new Error('Failed to get download URL');
      const json = await res.json();
      window.open(json.data.url, '_blank');
    } catch {
      alert('Failed to download certificate. Please try again.');
    }
  };

  // ---- Table columns (desktop) ----
  const columns = useMemo<ColumnDef<CertificateListItem>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Request Ref',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.subRequest.request.reference}</span>
        ),
      },
      {
        accessorKey: 'testName',
        header: 'Test',
        cell: ({ row }) => {
          const tests = row.original.subRequest.tests;
          if (tests.length === 0) return '-';
          if (tests.length === 1) return tests[0].testCatalogue.name;
          return `${tests[0].testCatalogue.name} (+${tests.length - 1})`;
        },
      },
      {
        accessorKey: 'labName',
        header: 'Laboratory',
        cell: ({ row }) => row.original.subRequest.laboratory.name,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <CertificateStatusBadge reviewAction={row.original.reviewAction} />,
      },
      {
        accessorKey: 'format',
        header: 'Format',
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.format === 'LAB_ORIGINAL' ? 'Lab Original' : 'GoLab Branded'}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Uploaded',
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString('en-ZA', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={() => handleDownload(row.original.id)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          View and download test certificates for your requests
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1 border-b">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by request reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <p>No certificates found</p>
                      {statusFilter !== 'all' && (
                        <button
                          onClick={() => setStatusFilter('all')}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View all certificates
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No certificates found</p>
          </div>
        ) : (
          data.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{item.subRequest.request.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('en-ZA', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <CertificateStatusBadge reviewAction={item.reviewAction} />
              </div>
              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                <span>
                  {item.subRequest.tests.length > 0
                    ? item.subRequest.tests.map((t) => t.testCatalogue.name).join(', ')
                    : 'No tests'}
                </span>
                <span>{item.subRequest.laboratory.name}</span>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => handleDownload(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
