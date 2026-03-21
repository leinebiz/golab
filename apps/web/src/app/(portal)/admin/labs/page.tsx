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
import { useLaboratories, useDeleteLaboratory } from './hooks';

interface LabRow {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  organization: { id: string; name: string };
  _count: { labTests: number };
}

const columnHelper = createColumnHelper<LabRow>();

export default function LaboratoriesPage() {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [deleteTarget, setDeleteTarget] = useState<LabRow | null>(null);

  const { data, isLoading, error } = useLaboratories({
    search,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  const deleteLab = useDeleteLaboratory();

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteLab.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteLab]);

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
            href={`/admin/labs/${info.row.original.id}/edit`}
            className="text-blue-600 hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('organization.name', { header: 'Organization' }),
      columnHelper.accessor('contactEmail', { header: 'Email' }),
      columnHelper.accessor('_count.labTests', {
        header: 'Tests',
        cell: (info) => info.getValue(),
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
            <Link href={`/admin/labs/${info.row.original.id}/edit`}>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laboratories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage laboratory directory and test capabilities.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/labs/matrix">
            <Button variant="outline">Lab-Test Matrix</Button>
          </Link>
          <Link href="/admin/labs/new">
            <Button>Add Laboratory</Button>
          </Link>
        </div>
      </div>

      <Input
        placeholder="Search by name or code..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        className="max-w-sm"
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">Failed to load laboratories.</div>
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
                  No laboratories found.
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
          <p className="text-center py-8 text-gray-500">No laboratories found.</p>
        ) : (
          (data?.data ?? []).map((lab: LabRow) => (
            <Card key={lab.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      href={`/admin/labs/${lab.id}/edit`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {lab.name}
                    </Link>
                    <p className="text-xs text-gray-500 font-mono">{lab.code}</p>
                  </div>
                  <Badge variant={lab.isActive ? 'success' : 'secondary'}>
                    {lab.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{lab.organization.name}</p>
                  <p>{lab.contactEmail}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {lab._count.labTests} test{lab._count.labTests !== 1 ? 's' : ''} configured
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/labs/${lab.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(lab)}>
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
            {data.pagination.total} laboratories
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
            <DialogTitle>Delete Laboratory</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate &quot;{deleteTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLab.isPending}>
              {deleteLab.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
