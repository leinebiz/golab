'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type PaginationState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTests, useDeleteTest } from './hooks';

interface TestRow {
  id: string;
  code: string;
  name: string;
  category: string;
  accreditation: string;
  basePrice: string;
  standardTatDays: number;
  expeditedTatDays: number | null;
  isActive: boolean;
}

const columnHelper = createColumnHelper<TestRow>();

export default function TestCataloguePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [accreditation, setAccreditation] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [deleteTarget, setDeleteTarget] = useState<TestRow | null>(null);

  const { data, isLoading, error } = useTests({
    search,
    category,
    accreditation,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  const deleteTest = useDeleteTest();

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteTest.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteTest]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: 'Code',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <Link
            href={`/admin/tests/${info.row.original.id}/edit`}
            className="text-blue-600 hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('category', { header: 'Category' }),
      columnHelper.accessor('accreditation', {
        header: 'Accreditation',
        cell: (info) => (
          <Badge variant={info.getValue() === 'ACCREDITED' ? 'success' : 'secondary'}>
            {info.getValue() === 'ACCREDITED' ? 'Accredited' : 'Non-Accredited'}
          </Badge>
        ),
      }),
      columnHelper.accessor('basePrice', {
        header: 'Base Price',
        cell: (info) => `R ${info.getValue()}`,
      }),
      columnHelper.accessor('standardTatDays', {
        header: 'TAT (days)',
        cell: (info) => {
          const exp = info.row.original.expeditedTatDays;
          return exp ? `${info.getValue()} / ${exp}` : `${info.getValue()}`;
        },
      }),
      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'success' : 'secondary'}>
            {info.getValue() ? 'Active' : 'Inactive'}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex gap-2 justify-end">
            <Link href={`/admin/tests/${info.row.original.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(info.row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.pagination?.totalPages ?? -1,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const categories = useMemo((): string[] => {
    if (!data?.data) return [];
    const cats = data.data.map((t: TestRow) => t.category) as string[];
    return [...new Set(cats)].sort();
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Test Catalogue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the catalogue of available laboratory tests.
          </p>
        </div>
        <Link href="/admin/tests/new">
          <Button>Add Test</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          className="max-w-sm"
        />
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={accreditation}
          onChange={(e) => {
            setAccreditation(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="">All Accreditation</option>
          <option value="ACCREDITED">Accredited</option>
          <option value="NON_ACCREDITED">Non-Accredited</option>
        </Select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          Failed to load tests. Please try again.
        </div>
      )}

      <div className="hidden md:block rounded-md border bg-white dark:bg-gray-900">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                  No tests found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center py-8 text-gray-500">Loading...</p>
        ) : (data?.data ?? []).length === 0 ? (
          <p className="text-center py-8 text-gray-500">No tests found.</p>
        ) : (
          (data?.data ?? []).map((test: TestRow) => (
            <Card key={test.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      href={`/admin/tests/${test.id}/edit`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {test.name}
                    </Link>
                    <p className="text-xs text-gray-500 font-mono">{test.code}</p>
                  </div>
                  <Badge variant={test.isActive ? 'success' : 'secondary'}>
                    {test.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap text-sm text-gray-600">
                  <span>{test.category}</span>
                  <span>|</span>
                  <Badge
                    variant={test.accreditation === 'ACCREDITED' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {test.accreditation === 'ACCREDITED' ? 'Accredited' : 'Non-Accredited'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>R {test.basePrice}</span>
                  <span>
                    {test.standardTatDays} day{test.standardTatDays !== 1 ? 's' : ''} TAT
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/tests/${test.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(test)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.pagination.total)} of{' '}
            {data.pagination.total} tests
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate &quot;{deleteTarget?.name}&quot;? This will mark
              it as inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTest.isPending}>
              {deleteTest.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
