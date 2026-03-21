'use client';

import { useState, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, type ColumnDef, flexRender } from '@tanstack/react-table';
import { Search, Plus, Pencil, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LabFormDialog } from './lab-form-dialog';
import { LabTestMappingDialog } from './lab-test-mapping-dialog';

interface Laboratory {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organization: { id: string; name: string };
  location: { lat: number; lng: number; address: string };
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  _count: { labTests: number };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const columns: ColumnDef<Laboratory>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'organization.name',
    header: 'Organization',
  },
  { accessorKey: 'contactEmail', header: 'Email' },
  { accessorKey: 'contactPhone', header: 'Phone' },
  {
    id: 'tests',
    header: 'Tests',
    cell: ({ row }) => <span>{row.original._count.labTests}</span>,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'destructive'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

export default function LaboratoriesPage() {
  const [data, setData] = useState<Laboratory[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);
  const [mappingLab, setMappingLab] = useState<Laboratory | null>(null);

  const fetchLabs = useCallback(async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/v1/laboratories?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabs(1, search);
  }, [fetchLabs, search]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function handleEdit(lab: Laboratory) {
    setEditingLab(lab);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingLab(null);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingLab(null);
    fetchLabs(pagination.page, search);
  }

  function handleTestMapping(lab: Laboratory) {
    setMappingLab(lab);
  }

  function handleMappingClose() {
    setMappingLab(null);
    fetchLabs(pagination.page, search);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laboratories</h1>
          <p className="text-sm text-gray-500">Manage partner laboratories and test capabilities</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Lab
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search labs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                    <TableHead className="w-24" />
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-gray-500"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-gray-500"
                    >
                      No laboratories found
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
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(row.original)}
                            title="Edit lab"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestMapping(row.original)}
                            title="Manage test capabilities"
                          >
                            <FlaskConical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-8 text-gray-500">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No laboratories found</p>
        ) : (
          data.map((lab) => (
            <Card key={lab.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{lab.name}</CardTitle>
                  <Badge variant={lab.isActive ? 'success' : 'destructive'}>
                    {lab.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Code:</span> {lab.code}
                  </div>
                  <div>
                    <span className="font-medium">Org:</span> {lab.organization.name}
                  </div>
                  <div>
                    <span className="font-medium">Tests:</span> {lab._count.labTests}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {lab.contactEmail}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(lab)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTestMapping(lab)}>
                    <FlaskConical className="h-3 w-3" /> Tests
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} labs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchLabs(pagination.page - 1, search)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLabs(pagination.page + 1, search)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <LabFormDialog open={formOpen} onClose={handleFormClose} lab={editingLab} />
      {mappingLab && <LabTestMappingDialog lab={mappingLab} onClose={handleMappingClose} />}
    </div>
  );
}
