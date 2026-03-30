'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Mail,
  Bell,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Send,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface InboxItem {
  id: string;
  type: 'message' | 'notification';
  channel: string;
  subject: string;
  body: string;
  status: string;
  recipientName: string | null;
  recipientEmail: string | null;
  organizationName: string | null;
  organizationId: string | null;
  requestRef: string | null;
  requestId: string | null;
  eventType?: string;
  sentByName?: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  resendCount?: number;
  createdAt: string;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'DELIVERED':
    case 'SENT':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'FAILED':
    case 'BOUNCED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'PENDING':
    case 'SENDING':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'DRAFT':
      return <FileEdit className="h-4 w-4 text-slate-400" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-400" />;
  }
}

function ChannelBadge({ channel }: { channel: string }) {
  switch (channel) {
    case 'EMAIL':
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Mail className="h-3 w-3" /> Email
        </Badge>
      );
    case 'WHATSAPP':
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Bell className="h-3 w-3" /> Portal
        </Badge>
      );
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    SENDING: 'Sending',
    SENT: 'Sent',
    DELIVERED: 'Delivered',
    FAILED: 'Failed',
    BOUNCED: 'Bounced',
    PENDING: 'Pending',
  };
  return map[status] ?? status;
}

function statusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'secondary' | 'default' {
  switch (status) {
    case 'DELIVERED':
    case 'SENT':
      return 'success';
    case 'FAILED':
    case 'BOUNCED':
      return 'destructive';
    case 'PENDING':
    case 'SENDING':
      return 'warning';
    case 'DRAFT':
      return 'secondary';
    default:
      return 'default';
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function CommsPage() {
  const [tab, setTab] = useState('inbox');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resending, setResending] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const pageSize = 20;

  // Fetch unread count for badge
  useEffect(() => {
    fetch('/api/v1/inbound-messages?countOnly=true')
      .then((r) => r.json())
      .then((json) => setUnreadCount(json.count ?? 0))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'inbox') {
        // Fetch inbound messages
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(search && { search }),
        });
        const res = await fetch(`/api/v1/inbound-messages?${params}`);
        const json = await res.json();
        const inbound = (json.data ?? []).map((m: Record<string, unknown>) => ({
          id: m.id,
          type: 'inbound' as const,
          channel: m.channel,
          subject: m.subject ?? '(No subject)',
          body: m.body,
          status: m.status as string,
          recipientName: null,
          recipientEmail: null,
          organizationName: (m.organization as Record<string, unknown> | null)?.name ?? null,
          organizationId: (m.organization as Record<string, unknown> | null)?.id ?? null,
          requestRef: (m.request as Record<string, unknown> | null)?.reference ?? null,
          requestId: (m.request as Record<string, unknown> | null)?.id ?? null,
          eventType: undefined,
          sentByName: (m.fromName as string) ?? (m.fromAddress as string),
          sentAt: null,
          deliveredAt: null,
          failureReason: null,
          resendCount: 0,
          createdAt: m.createdAt as string,
          fromAddress: m.fromAddress as string,
          isStarred: m.isStarred as boolean,
        }));
        setItems(inbound);
        setTotal(json.total ?? 0);
      } else {
        // Fetch outbound admin messages or notifications
        const params = new URLSearchParams({
          tab,
          page: String(page),
          pageSize: String(pageSize),
          ...(search && { search }),
        });
        const res = await fetch(`/api/v1/admin-messages?${params}`);
        const json = await res.json();
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  async function handleResend(item: InboxItem) {
    setResending(item.id);
    try {
      if (item.type === 'notification') {
        await fetch(`/api/v1/notifications/${item.id}/resend`, { method: 'POST' });
      } else {
        await fetch(`/api/v1/admin-messages/${item.id}/resend`, { method: 'POST' });
      }
      await fetchItems();
    } finally {
      setResending(null);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communications</h1>
          <p className="text-sm text-slate-600 mt-1">Central hub for all customer communications</p>
        </div>
        <Link href="/admin/comms/compose">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="notifications">System</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  {tab === 'drafts'
                    ? 'No drafts.'
                    : tab === 'failed'
                      ? 'No failed messages.'
                      : tab === 'notifications'
                        ? 'No system notifications sent yet.'
                        : 'No messages yet. Click Compose to send your first.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white px-4 py-3 transition-all cursor-pointer"
                >
                  <StatusIcon status={item.status} />

                  <Link
                    href={
                      item.type === 'message'
                        ? `/admin/comms/conversation/${item.id}`
                        : `/admin/comms/conversation/${item.id}?type=notification`
                    }
                    className="flex-1 min-w-0 flex items-center gap-3"
                  >
                    {/* Recipient */}
                    <div className="w-48 shrink-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.recipientName ?? item.organizationName ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.recipientEmail ?? item.organizationName ?? ''}
                      </p>
                    </div>

                    {/* Subject + preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {item.subject}
                        </p>
                        {item.type === 'notification' && item.eventType && (
                          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                            {item.eventType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.body.slice(0, 120)}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 shrink-0">
                      <ChannelBadge channel={item.channel} />
                      <Badge variant={statusBadgeVariant(item.status)} className="text-[10px]">
                        {statusLabel(item.status)}
                      </Badge>
                      {item.requestRef && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.requestRef}
                        </Badge>
                      )}
                    </div>
                  </Link>

                  {/* Date */}
                  <span className="text-xs text-slate-400 w-20 text-right shrink-0">
                    {formatDate(item.sentAt ?? item.createdAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {(item.status === 'FAILED' || item.status === 'BOUNCED') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={resending === item.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleResend(item);
                        }}
                      >
                        {resending === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3 mr-1" />
                        )}
                        Resend
                      </Button>
                    )}
                    {item.status === 'DRAFT' && item.type === 'message' && (
                      <Link
                        href={`/admin/comms/compose?draft=${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Send className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-slate-500">
                {total} {total === 1 ? 'message' : 'messages'}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
