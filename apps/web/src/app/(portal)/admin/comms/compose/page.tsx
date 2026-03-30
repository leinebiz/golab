'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Save, Mail, MessageCircle, Bell, Copy, Check } from 'lucide-react';

interface OrgOption {
  id: string;
  name: string;
}
interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

const PLACEHOLDERS = [
  { key: '{{requestRef}}', desc: 'Request reference' },
  { key: '{{customerName}}', desc: 'Customer name' },
  { key: '{{contactName}}', desc: 'Contact person' },
  { key: '{{portalUrl}}', desc: 'Portal URL' },
  { key: '{{amount}}', desc: 'Amount' },
  { key: '{{dueDate}}', desc: 'Due date' },
];

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'PORTAL' | 'WHATSAPP'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch orgs
  useEffect(() => {
    fetch('/api/v1/organizations?limit=100')
      .then((r) => r.json())
      .then((json) => {
        const items = json.data ?? json ?? [];
        setOrgs(items.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })));
      })
      .catch(() => {});
  }, []);

  // Fetch users when org changes
  useEffect(() => {
    if (!selectedOrg) {
      setUsers([]);
      return;
    }
    fetch(`/api/v1/users?organizationId=${selectedOrg}&limit=50`)
      .then((r) => r.json())
      .then((json) => {
        const items = json.data ?? json ?? [];
        setUsers(
          items.map((u: { id: string; name: string | null; email: string }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          })),
        );
      })
      .catch(() => setUsers([]));
  }, [selectedOrg]);

  // Load draft if editing
  useEffect(() => {
    if (!draftId) return;
    fetch(`/api/v1/admin-messages/${draftId}`)
      .then((r) => r.json())
      .then((json) => {
        const d = json.data;
        if (d) {
          setSubject(d.subject ?? '');
          setBody(d.body ?? '');
          setChannel(d.channel ?? 'EMAIL');
          if (d.organizationId) setSelectedOrg(d.organizationId);
          if (d.recipientId) setSelectedUser(d.recipientId);
        }
      })
      .catch(() => {});
  }, [draftId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organizationId: selectedOrg || undefined,
        recipientId: selectedUser || undefined,
        channel,
        subject,
        body,
        action: 'draft',
      };

      const url = draftId ? `/api/v1/admin-messages/${draftId}` : '/api/v1/admin-messages';
      const method = draftId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to save draft');
        return;
      }

      router.push('/admin/comms');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const payload = {
        organizationId: selectedOrg || undefined,
        recipientId: selectedUser || undefined,
        channel,
        subject,
        body,
        action: 'send',
      };

      const url = draftId ? `/api/v1/admin-messages/${draftId}` : '/api/v1/admin-messages';
      const method = draftId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to send');
        return;
      }

      router.push('/admin/comms');
    } finally {
      setSending(false);
    }
  }

  function copyPlaceholder(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/comms">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {draftId ? 'Edit Draft' : 'Compose Message'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recipient */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org">Organization</Label>
                  <select
                    id="org"
                    value={selectedOrg}
                    onChange={(e) => {
                      setSelectedOrg(e.target.value);
                      setSelectedUser('');
                    }}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All organizations</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user">Recipient</Label>
                  <select
                    id="user"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    disabled={!selectedOrg}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">All users in org</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Channel selector */}
              <div className="space-y-2">
                <Label>Channel</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'EMAIL' as const, label: 'Email', icon: Mail },
                    { value: 'PORTAL' as const, label: 'Portal', icon: Bell },
                    { value: 'WHATSAPP' as const, label: 'WhatsApp', icon: MessageCircle },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setChannel(value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        channel === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message Body</Label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  placeholder="Write your message here. Use {{placeholders}} for dynamic content..."
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono text-slate-800 leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{subject || '(No subject)'}</p>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">
                  {body || '(Empty message)'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href="/admin/comms">
              <Button variant="outline">Cancel</Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving || sending}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={handleSend} disabled={saving || sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Now'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar — placeholders */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Template Placeholders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-3">
                Click to copy a placeholder, then paste it into your message.
              </p>
              <div className="space-y-1.5">
                {PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph.key}
                    type="button"
                    onClick={() => copyPlaceholder(ph.key)}
                    className="w-full flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div>
                      <code className="text-xs font-mono text-blue-700">{ph.key}</code>
                      <p className="text-[11px] text-slate-500">{ph.desc}</p>
                    </div>
                    {copiedKey === ph.key ? (
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <p>Select an organization to send to all users, or pick a specific recipient.</p>
              <p>
                Email messages are delivered via the configured email provider. Portal messages
                appear in the customer&apos;s notification inbox.
              </p>
              <p>Save as draft to continue editing later.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
