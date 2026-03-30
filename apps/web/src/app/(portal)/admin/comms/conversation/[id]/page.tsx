'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mail,
  Bell,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Loader2,
  Send,
  Building2,
  FileText,
  User,
} from 'lucide-react';

interface MessageDetail {
  id: string;
  channel: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  createdAt: string;
  organization?: { id: string; name: string } | null;
  recipient?: { id: string; name: string | null; email: string } | null;
  sentBy?: { id: string; name: string | null } | null;
  request?: { id: string; reference: string } | null;
  resends?: Array<{
    id: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
    sentBy: { name: string | null };
  }>;
  parentMessage?: { id: string; subject: string; sentAt: string | null } | null;
  // notification fields
  title?: string;
  type?: string;
  user?: { name: string | null; email: string; organization?: { id: string; name: string } | null };
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }
  > = {
    SENT: { label: 'Sent', variant: 'success' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
    PENDING: { label: 'Pending', variant: 'warning' },
    SENDING: { label: 'Sending', variant: 'warning' },
    FAILED: { label: 'Failed', variant: 'destructive' },
    BOUNCED: { label: 'Bounced', variant: 'destructive' },
    DRAFT: { label: 'Draft', variant: 'secondary' },
  };
  const entry = map[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'EMAIL':
      return <Mail className="h-5 w-5 text-blue-600" />;
    case 'WHATSAPP':
      return <MessageCircle className="h-5 w-5 text-green-600" />;
    default:
      return <Bell className="h-5 w-5 text-slate-600" />;
  }
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNotification = searchParams.get('type') === 'notification';

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isNotification) {
          // Fetch from notifications API
          const res = await fetch(`/api/v1/notifications?limit=1`);
          // For now, we'll try to get the notification by building a simple fetch
          // Since we don't have a single-notification endpoint, just show what we have
          setMessage(null);
        } else {
          const res = await fetch(`/api/v1/admin-messages/${id}`);
          const json = await res.json();
          setMessage(json.data ?? null);
        }
      } catch {
        setMessage(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isNotification]);

  async function handleResend() {
    if (!message) return;
    setResending(true);
    try {
      if (isNotification) {
        await fetch(`/api/v1/notifications/${id}/resend`, { method: 'POST' });
      } else {
        await fetch(`/api/v1/admin-messages/${id}/resend`, { method: 'POST' });
      }
      // Reload
      const res = await fetch(`/api/v1/admin-messages/${id}`);
      const json = await res.json();
      setMessage(json.data ?? null);
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="space-y-4">
        <Link href="/admin/comms">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-slate-500">Message not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/comms">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ChannelIcon channel={message.channel} />
            <h1 className="text-xl font-bold text-slate-900">{message.subject}</h1>
          </div>
        </div>
        <StatusBadge status={message.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Message body */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  {(message.sentBy?.name ?? 'A').charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {message.sentBy?.name ?? 'System'}
                  </p>
                  <p className="text-xs text-slate-500">
                    To: {message.recipient?.name ?? message.organization?.name ?? 'Unknown'}
                    {message.recipient?.email && (
                      <span className="text-slate-400"> &lt;{message.recipient.email}&gt;</span>
                    )}
                  </p>
                </div>
                <span className="ml-auto text-xs text-slate-400">
                  {formatDateTime(message.sentAt ?? message.createdAt)}
                </span>
              </div>

              <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {message.body}
              </div>
            </CardContent>
          </Card>

          {/* Failure reason */}
          {message.failureReason && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Delivery Failed</p>
                <p className="text-sm text-red-600 mt-1">{message.failureReason}</p>
              </div>
            </div>
          )}

          {/* Resend history */}
          {message.resends && message.resends.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Resend History ({message.resends.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {message.resends.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {r.status === 'SENT' || r.status === 'DELIVERED' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : r.status === 'FAILED' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-slate-700">
                          Resent by {r.sentBy.name ?? 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-slate-400">
                          {formatDateTime(r.sentAt ?? r.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {(message.status === 'FAILED' ||
              message.status === 'BOUNCED' ||
              message.status === 'SENT') && (
              <Button variant="outline" onClick={handleResend} disabled={resending}>
                {resending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Resend
              </Button>
            )}
            {message.status === 'DRAFT' && (
              <Link href={`/admin/comms/compose?draft=${message.id}`}>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Edit &amp; Send
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={message.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Channel</span>
                <span className="text-slate-800 capitalize">{message.channel.toLowerCase()}</span>
              </div>
              {message.sentAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Sent</span>
                  <span className="text-slate-800">{formatDateTime(message.sentAt)}</span>
                </div>
              )}
              {message.deliveredAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Delivered</span>
                  <span className="text-slate-800">{formatDateTime(message.deliveredAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-800">{formatDateTime(message.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recipient info */}
          {(message.organization || message.recipient) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Recipient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {message.organization && (
                  <Link
                    href={`/admin/customers/${message.organization.id}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Building2 className="h-4 w-4" />
                    {message.organization.name}
                  </Link>
                )}
                {message.recipient && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                      <p>{message.recipient.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{message.recipient.email}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related request */}
          {message.request && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Related Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/admin/requests/${message.request.id}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {message.request.reference}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Parent message */}
          {message.parentMessage && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Original Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/admin/comms/conversation/${message.parentMessage.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {message.parentMessage.subject}
                </Link>
                {message.parentMessage.sentAt && (
                  <p className="text-xs text-slate-500 mt-1">
                    Sent {formatDateTime(message.parentMessage.sentAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
