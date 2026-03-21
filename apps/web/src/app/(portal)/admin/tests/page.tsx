'use client';

import { useState, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, type ColumnDef, flexRender } from '@tanstack/react-table';
import { Search, Plus, Pencil } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEST_CATEGORIES, type TestCategory } from '@golab/shared';
import { TestFormDialog } from './test-form-dialog';

interface TestCatalogueItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  accreditation: 'ACCREDITED' | 'NON_ACCREDITED';
  standardTatDays: number;
  expeditedTatDays: number | null;
  basePrice: string;
  expediteSurcharge: string | null;
  toleranceApplicable: boolean;
  toleranceUnit: string | null;
  isActive: boolean;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const columns: ColumnDef<TestCatalogueItem>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'category', header: 'Category' },
  {
    accessorKey: 'accreditation',
    header: 'Accreditation',
    cell: ({ row }) => (
      <Badge variant={row.original.accreditation === 'ACCREDITED' ? 'success' : 'secondary'}>
        {row.original.accreditation === 'ACCREDITED' ? 'Accredited' : 'Non-accredited'}
      </Badge>
    ),
  },
  {
    accessorKey: 'standardTatDays',
    header: 'TAT (days)',
    cell: ({ row }) => {
      const std = row.original.standardTatDays;
      const exp = row.original.expeditedTatDays;
      return exp ? `${std} / ${exp}` : `${std}`;
    },
  },
  {
    accessorKey: 'basePrice',
    header: 'Price (ZAR)',
    cell: ({ row }) => `R ${Number(row.original.basePrice).toFixed(2)}`,
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

export default function TestCataloguePage() {
  const [data, setData] = useState<TestCatalogueItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestCatalogueItem | null>(null);

  const fetchTests = useCallback(async (page = 1, searchTerm = '', category = 'all') => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (searchTerm) params.set('search', searchTerm);
    if (category !== 'all') params.set('category', category);

    const res = await fetch(`/api/v1/tests?${params}`);
    const json = await res.json();
    setData(json.data ?? []);
    setPagination(json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTests(1, search, categoryFilter);
  }, [fetchTests, search, categoryFilter]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function handleEdit(test: TestCatalogueItem) {
    setEditingTest(test);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingTest(null);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingTest(null);
    fetchTests(pagination.page, search, categoryFilter);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test Catalogue</h1>
          <p className="text-sm text-gray-500">
            Manage available tests, pricing, and accreditation status
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Test
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TEST_CATEGORIES.map((cat: TestCategory) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    <TableHead className="w-12" />
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
                      No tests found
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(row.original)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
          <p className="text-center py-8 text-gray-500">No tests found</p>
        ) : (
          data.map((test) => (
            <Card key={test.id} className="cursor-pointer" onClick={() => handleEdit(test)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{test.name}</CardTitle>
                  <Badge variant={test.isActive ? 'success' : 'destructive'}>
                    {test.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Code:</span> {test.code}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {test.category}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> R{' '}
                    {Number(test.basePrice).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">TAT:</span> {test.standardTatDays} days
                  </div>
                  <div>
                    <Badge variant={test.accreditation === 'ACCREDITED' ? 'success' : 'secondary'}>
                      {test.accreditation === 'ACCREDITED' ? 'Accredited' : 'Non-accredited'}
                    </Badge>
                  </div>
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
            {pagination.total} tests
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchTests(pagination.page - 1, search, categoryFilter)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchTests(pagination.page + 1, search, categoryFilter)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <TestFormDialog open={dialogOpen} onClose={handleDialogClose} test={editingTest} />
    </div>
  );
}
