'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useReactTable, getCoreRowModel, type ColumnDef, flexRender } from '@tanstack/react-table';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/request/status-badge';

// ---- Types ----

interface RequestListItem {
  id: string;
  reference: string;
  status: string;
  testsCount: number;
  labs: string[];
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Review', value: 'PENDING_CUSTOMER_REVIEW' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Action Required', value: 'PENDING_CUSTOMER_ACTION' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

// ---- Component ----

export default function CustomerRequestsPage() {
  const [data, setData] = useState<RequestListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRequests = useCallback(async (page: number, status: string, searchTerm: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (status !== 'ALL') params.set('status', status);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/v1/requests?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(1, statusFilter, debouncedSearch);
  }, [statusFilter, debouncedSearch, fetchRequests]);

  const handlePageChange = (page: number) => {
    fetchRequests(page, statusFilter, debouncedSearch);
  };

  // ---- Table columns (desktop) ----
  const columns = useMemo<ColumnDef<RequestListItem>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <Link
            href={`/customer/requests/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'testsCount',
        header: 'Tests',
      },
      {
        accessorKey: 'labs',
        header: 'Lab(s)',
        cell: ({ row }) => row.original.labs.join(', ') || '-',
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString('en-ZA', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Link
            href={`/customer/requests/${row.original.id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Eye className="h-4 w-4" />
            View
          </Link>
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
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-sm text-muted-foreground">View and manage your testing requests</p>
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
            placeholder="Search by reference..."
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
                    No requests found
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
          <p className="text-center text-muted-foreground py-8">No requests found</p>
        ) : (
          data.map((item) => (
            <Link
              key={item.id}
              href={`/customer/requests/${item.id}`}
              className="block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{item.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('en-ZA', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {item.testsCount} test{item.testsCount !== 1 ? 's' : ''}
                </span>
                <span>{item.labs.join(', ') || 'No lab assigned'}</span>
              </div>
            </Link>
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
