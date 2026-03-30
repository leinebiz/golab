'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  LogOut,
  FileEdit,
  Send,
  Mail,
  Bell,
  CreditCard,
  FileCheck,
  ClipboardList,
  Users,
  Building2,
  FlaskConical,
  Shield,
  Settings,
  AlertTriangle,
  Truck,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  category: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorType: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

interface AuditUser {
  actorEmail: string;
  actorName: string | null;
}

// ─── Action display config ──────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  'login.success': 'Logged in',
  'login.failed': 'Login denied',
  logout: 'Logged out',
  'request.create': 'Created request',
  'request.update': 'Updated request',
  'request.status_change': 'Changed request status',
  'request.submit': 'Submitted request',
  'request.approve': 'Approved request',
  'request.reject': 'Rejected request',
  'subrequest.create': 'Created sub-request',
  'subrequest.update': 'Updated sub-request',
  'subrequest.status_change': 'Changed sub-request status',
  'quote.generate': 'Generated quote',
  'quote.accept': 'Accepted quote',
  'quote.reject': 'Rejected quote',
  'invoice.create': 'Created invoice',
  'invoice.update': 'Updated invoice',
  'payment.record': 'Recorded payment',
  'payment.confirm': 'Confirmed payment',
  'certificate.issue': 'Issued certificate',
  'certificate.download': 'Downloaded certificate',
  'credit.apply': 'Applied for credit',
  'credit.approve': 'Approved credit',
  'credit.reject': 'Rejected credit',
  'credit.update': 'Updated credit',
  'organization.create': 'Created organization',
  'organization.update': 'Updated organization',
  'user.create': 'Created user',
  'user.update': 'Updated user',
  'user.deactivate': 'Deactivated user',
  'comms.send': 'Sent message',
  'comms.draft': 'Saved draft',
  'comms.resend': 'Resent message',
  'comms.receive': 'Received message',
  'notification.send': 'Sent notification',
  'notification.resend': 'Resent notification',
  'template.update': 'Updated template',
  'template.create': 'Created template',
  'disclaimer.create': 'Created disclaimer',
  'disclaimer.update': 'Updated disclaimer',
  'disclaimer.delete': 'Deleted disclaimer',
  'sample.receive': 'Received sample',
  'sample.issue': 'Reported sample issue',
  'results.upload': 'Uploaded results',
  'waybill.create': 'Created waybill',
  'system.seed': 'Seeded data',
  'system.migration': 'Ran migration',
};

function ActionIcon({ action }: { action: string }) {
  const prefix = action.split('.')[0];
  const iconClass = 'h-4 w-4';
  switch (prefix) {
    case 'login':
    case 'logout':
      return action.includes('failed') ? (
        <AlertTriangle className={`${iconClass} text-red-500`} />
      ) : (
        <LogIn className={`${iconClass} text-blue-500`} />
      );
    case 'request':
    case 'subrequest':
      return <ClipboardList className={`${iconClass} text-indigo-500`} />;
    case 'quote':
    case 'invoice':
    case 'payment':
      return <CreditCard className={`${iconClass} text-emerald-500`} />;
    case 'credit':
      return <CreditCard className={`${iconClass} text-amber-500`} />;
    case 'certificate':
      return <FileCheck className={`${iconClass} text-green-500`} />;
    case 'comms':
      return <Mail className={`${iconClass} text-sky-500`} />;
    case 'notification':
      return <Bell className={`${iconClass} text-violet-500`} />;
    case 'template':
      return <Settings className={`${iconClass} text-slate-500`} />;
    case 'organization':
      return <Building2 className={`${iconClass} text-slate-600`} />;
    case 'user':
      return <Users className={`${iconClass} text-slate-600`} />;
    case 'disclaimer':
      return <FileEdit className={`${iconClass} text-slate-500`} />;
    case 'sample':
    case 'results':
      return <FlaskConical className={`${iconClass} text-purple-500`} />;
    case 'waybill':
      return <Truck className={`${iconClass} text-orange-500`} />;
    case 'system':
      return <Shield className={`${iconClass} text-slate-400`} />;
    default:
      return <FileEdit className={`${iconClass} text-slate-400`} />;
  }
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'finance', label: 'Finance' },
  { value: 'comms', label: 'Communications' },
  { value: 'data', label: 'Data Changes' },
  { value: 'system', label: 'System' },
];

function categoryBadgeVariant(cat: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (cat) {
    case 'auth':
      return 'default';
    case 'workflow':
      return 'secondary';
    case 'finance':
      return 'outline';
    case 'comms':
      return 'default';
    default:
      return 'secondary';
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function ChangeDetails({ changes }: { changes: Record<string, { old: unknown; new: unknown }> }) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {entries.map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="flex items-start gap-2 text-xs">
          <span className="font-mono text-slate-500 w-32 shrink-0 text-right">{field}:</span>
          <span className="text-red-600 line-through truncate max-w-[200px]">
            {formatValue(oldVal)}
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="text-green-700 truncate max-w-[200px]">{formatValue(newVal)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [actorEmail, setActorEmail] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<AuditUser[]>([]);

  const pageSize = 50;

  // Fetch distinct users for filter dropdown
  useEffect(() => {
    fetch('/api/v1/audit-log/users')
      .then((r) => r.json())
      .then((json) => setUsers(json.data ?? []))
      .catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (category !== 'all') params.set('category', category);
      if (actorEmail !== 'all') params.set('actorEmail', actorEmail);
      if (search) params.set('search', search);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/v1/audit-log?${params}`);
      const json = await res.json();
      setEntries(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, actorEmail, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    setPage(1);
  }, [category, actorEmail, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / pageSize);

  // Group entries by date
  const grouped: Record<string, AuditEntry[]> = {};
  for (const entry of entries) {
    const dateKey = formatDate(entry.createdAt);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(entry);
  }

  function clearFilters() {
    setCategory('all');
    setActorEmail('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  }

  const hasActiveFilters =
    category !== 'all' || actorEmail !== 'all' || search !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete log of all system activity, communications, and user actions
        </p>
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search actions, entities, users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actorEmail} onValueChange={setActorEmail}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.actorEmail} value={u.actorEmail}>
                    {u.actorName ?? u.actorEmail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-slate-100' : ''}
            >
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? 'Less' : 'More'}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">From:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">To:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {total} {total === 1 ? 'entry' : 'entries'}
          {hasActiveFilters ? ' (filtered)' : ''}
        </p>
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">
              {hasActiveFilters
                ? 'No entries match your filters.'
                : 'No audit entries recorded yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateEntries]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm px-2 py-1.5 rounded-md mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {dateLabel}
                </span>
              </div>

              <div className="space-y-1">
                {dateEntries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-lg border transition-all ${
                        isExpanded
                          ? 'border-slate-300 bg-white shadow-sm'
                          : 'border-transparent hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <ActionIcon action={entry.action} />

                        {/* Time */}
                        <span className="text-xs text-slate-400 font-mono w-20 shrink-0">
                          {formatTime(entry.createdAt)}
                        </span>

                        {/* Action */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </span>
                            {entry.entityLabel && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {entry.entityLabel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {entry.entityType}
                            {entry.entityId ? ` · ${entry.entityId.slice(0, 12)}...` : ''}
                          </p>
                        </div>

                        {/* Actor */}
                        <div className="w-40 shrink-0 text-right">
                          <p className="text-sm text-slate-700 truncate">
                            {entry.actorName ?? entry.actorEmail ?? entry.actorType}
                          </p>
                          {entry.actorEmail && entry.actorName && (
                            <p className="text-xs text-slate-400 truncate">{entry.actorEmail}</p>
                          )}
                        </div>

                        {/* Category badge */}
                        <Badge
                          variant={categoryBadgeVariant(entry.category)}
                          className="text-[10px] w-20 justify-center shrink-0"
                        >
                          {entry.category}
                        </Badge>

                        {/* Expand indicator */}
                        {(hasChanges || entry.metadata || entry.ipAddress) &&
                          (isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          ))}
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            {/* Changes */}
                            {hasChanges && (
                              <div>
                                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                  Changes
                                </h4>
                                <ChangeDetails
                                  changes={
                                    entry.changes as Record<string, { old: unknown; new: unknown }>
                                  }
                                />
                              </div>
                            )}

                            {/* Metadata */}
                            <div>
                              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                Details
                              </h4>
                              <div className="space-y-1 text-xs">
                                <div className="flex gap-2">
                                  <span className="text-slate-500 w-20">Action:</span>
                                  <span className="font-mono text-slate-700">{entry.action}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-slate-500 w-20">Entity:</span>
                                  <span className="text-slate-700">
                                    {entry.entityType} {entry.entityId ?? ''}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-slate-500 w-20">Actor type:</span>
                                  <span className="text-slate-700">{entry.actorType}</span>
                                </div>
                                {entry.ipAddress && (
                                  <div className="flex gap-2">
                                    <span className="text-slate-500 w-20">IP:</span>
                                    <span className="font-mono text-slate-700">
                                      {entry.ipAddress}
                                    </span>
                                  </div>
                                )}
                                {entry.userAgent && (
                                  <div className="flex gap-2">
                                    <span className="text-slate-500 w-20">Browser:</span>
                                    <span className="text-slate-700 truncate max-w-[300px]">
                                      {entry.userAgent}
                                    </span>
                                  </div>
                                )}
                                {entry.metadata &&
                                  Object.entries(entry.metadata).map(([key, val]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="text-slate-500 w-20">{key}:</span>
                                      <span className="text-slate-700">{formatValue(val)}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
