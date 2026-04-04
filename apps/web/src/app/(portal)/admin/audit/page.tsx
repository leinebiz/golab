'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuditEntry {
  id: string;
  source: 'audit_log' | 'status_transition';
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  actorName: string | null;
  actorType: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}

const ENTITY_TYPES = [
  'All',
  'Request',
  'SubRequest',
  'Certificate',
  'Invoice',
  'Payment',
  'CreditAccount',
  'Waybill',
  'User',
  'Organization',
  'Disclaimer',
] as const;

function formatDetails(entry: AuditEntry): string {
  if (entry.source === 'status_transition' && entry.fromStatus && entry.toStatus) {
    return `${entry.fromStatus} \u2192 ${entry.toStatus}`;
  }
  if (entry.changes && typeof entry.changes === 'object') {
    const keys = Object.keys(entry.changes);
    if (keys.length === 0) return '\u2014';
    if (keys.length <= 3) return keys.join(', ') + ' changed';
    return `${keys.length} fields changed`;
  }
  return '\u2014';
}

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);

  const [entityType, setEntityType] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input by 300ms
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (entityType !== 'All') params.set('entityType', entityType);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityType, from, to, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [entityType, from, to, debouncedSearch]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-gray-500">Complete activity log across all entities</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Entity Type</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <Input
                type="text"
                placeholder="Search entity ID or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              No audit entries found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={`${entry.source}-${entry.id}`}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.actorName ?? entry.actorId ?? 'System'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.source === 'status_transition' ? 'default' : 'secondary'}
                        className={
                          entry.source === 'status_transition'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{entry.entityType}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm font-mono">
                      {entry.entityId}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      {formatDetails(entry)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}{' '}
            entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
