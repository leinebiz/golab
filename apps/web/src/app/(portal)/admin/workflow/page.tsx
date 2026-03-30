'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Mail,
  Bell,
  MessageCircle,
  Search,
  Copy,
  Check,
  Pencil,
  RefreshCw,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
interface NotificationTemplate {
  id: string;
  eventType: string;
  channel: 'PORTAL' | 'EMAIL' | 'WHATSAPP';
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
}

// ── Placeholder definitions ──────────────────────────────────
const PLACEHOLDERS: { key: string; description: string; example: string }[] = [
  { key: '{{requestRef}}', description: 'Request reference number', example: 'REQ-20260301-00001' },
  {
    key: '{{customerName}}',
    description: 'Customer organization name',
    example: 'ABC Mining (Pty) Ltd',
  },
  { key: '{{contactName}}', description: 'Contact person name', example: 'John Smith' },
  { key: '{{labName}}', description: 'Laboratory name', example: 'Cape Town Analytical Lab' },
  { key: '{{amount}}', description: 'Monetary amount (formatted)', example: 'R 1,250.00' },
  { key: '{{creditLimit}}', description: 'Approved credit limit', example: 'R 50,000.00' },
  { key: '{{quoteNumber}}', description: 'Quote reference number', example: 'QTE-20260301-00001' },
  {
    key: '{{invoiceNumber}}',
    description: 'Invoice reference number',
    example: 'INV-20260301-00001',
  },
  { key: '{{waybillNumber}}', description: 'Waybill/tracking number', example: 'WB-20260301-001' },
  {
    key: '{{reason}}',
    description: 'Reason for action (delay, decline, etc.)',
    example: 'Insufficient documentation',
  },
  { key: '{{dueDate}}', description: 'Due date', example: '15 Apr 2026' },
  {
    key: '{{portalUrl}}',
    description: 'Link to the portal',
    example: 'https://portal.golab.co.za',
  },
  { key: '{{collectionDate}}', description: 'Scheduled collection date', example: '28 Mar 2026' },
  {
    key: '{{testNames}}',
    description: 'List of test names',
    example: 'Water pH Analysis, Electrical Conductivity',
  },
];

// ── Event type display info ──────────────────────────────────
const EVENT_CATEGORIES: {
  label: string;
  events: { type: string; label: string; description: string }[];
}[] = [
  {
    label: 'Onboarding',
    events: [
      {
        type: 'profile.created',
        label: 'Profile Created',
        description: 'New user account registered',
      },
    ],
  },
  {
    label: 'Credit',
    events: [
      {
        type: 'credit.submitted',
        label: 'Credit Submitted',
        description: 'Credit application submitted for review',
      },
      {
        type: 'credit.approved',
        label: 'Credit Approved',
        description: 'Credit application approved',
      },
      {
        type: 'credit.declined',
        label: 'Credit Declined',
        description: 'Credit application declined',
      },
    ],
  },
  {
    label: 'Quoting',
    events: [
      {
        type: 'quote.ready',
        label: 'Quote Ready',
        description: 'Quote generated, awaiting customer review',
      },
      {
        type: 'quote.accepted',
        label: 'Quote Accepted',
        description: 'Customer accepted the quote',
      },
    ],
  },
  {
    label: 'Payments',
    events: [
      {
        type: 'payment_link.issued',
        label: 'Payment Link Issued',
        description: 'Payment link sent to customer',
      },
      {
        type: 'payment.confirmed',
        label: 'Payment Confirmed',
        description: 'Payment received and confirmed',
      },
      {
        type: 'invoice.generated',
        label: 'Invoice Generated',
        description: 'Invoice created for request',
      },
    ],
  },
  {
    label: 'Logistics',
    events: [
      {
        type: 'collection.scheduled',
        label: 'Collection Scheduled',
        description: 'Courier pickup scheduled',
      },
      {
        type: 'waybill.available',
        label: 'Waybill Available',
        description: 'Waybill ready for download',
      },
      {
        type: 'sample.collected',
        label: 'Sample Collected',
        description: 'Samples collected by courier',
      },
      {
        type: 'sample.delivered',
        label: 'Sample Delivered',
        description: 'Samples delivered to laboratory',
      },
    ],
  },
  {
    label: 'Laboratory',
    events: [
      {
        type: 'lab.accepted_sample',
        label: 'Lab Accepted Sample',
        description: 'Lab received and accepted samples',
      },
      {
        type: 'sample.exception',
        label: 'Sample Exception',
        description: 'Issue reported with samples',
      },
      {
        type: 'testing.delayed',
        label: 'Testing Delayed',
        description: 'Testing delayed — reason provided',
      },
      {
        type: 'testing.completed',
        label: 'Testing Completed',
        description: 'Lab finished all testing',
      },
    ],
  },
  {
    label: 'Review & Release',
    events: [
      {
        type: 'certificate.awaiting_review',
        label: 'Certificate Awaiting Review',
        description: 'Certificate uploaded, pending GoLab review',
      },
      {
        type: 'results.ready',
        label: 'Results Ready',
        description: 'Results approved and available for download',
      },
    ],
  },
  {
    label: 'Customer Actions',
    events: [
      {
        type: 'customer.action_required',
        label: 'Action Required',
        description: 'Customer needs to take action',
      },
      {
        type: 'request.closed',
        label: 'Request Closed',
        description: 'Request completed and closed',
      },
    ],
  },
];

const ALL_EVENTS = EVENT_CATEGORIES.flatMap((c) => c.events);

// ── Request workflow steps ────────────────────────────────────
const REQUEST_WORKFLOW = [
  { status: 'DRAFT', label: 'Draft', color: 'bg-slate-400' },
  { status: 'QUOTE_CALCULATED', label: 'Quote Calculated', color: 'bg-blue-500' },
  { status: 'PENDING_CUSTOMER_REVIEW', label: 'Pending Review', color: 'bg-yellow-500' },
  { status: 'ACCEPTED_BY_CUSTOMER', label: 'Accepted', color: 'bg-green-500' },
  { status: 'INVOICE_GENERATED', label: 'Invoice Generated', color: 'bg-blue-500' },
  { status: 'AWAITING_COD_PAYMENT', label: 'Awaiting Payment', color: 'bg-orange-500' },
  { status: 'PAYMENT_RECEIVED', label: 'Payment Received', color: 'bg-green-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-600' },
  { status: 'PENDING_CUSTOMER_ACTION', label: 'Action Required', color: 'bg-yellow-500' },
  { status: 'CLOSED', label: 'Closed', color: 'bg-slate-500' },
];

const SUB_REQUEST_WORKFLOW = [
  { status: 'PICKUP_REQUESTED', label: 'Pickup Requested', color: 'bg-slate-400' },
  { status: 'WAYBILL_AVAILABLE', label: 'Waybill Available', color: 'bg-blue-400' },
  { status: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', color: 'bg-blue-500' },
  { status: 'SAMPLE_COLLECTED', label: 'Collected', color: 'bg-green-400' },
  { status: 'IN_TRANSIT_TO_LAB', label: 'In Transit', color: 'bg-blue-500' },
  { status: 'DELIVERED_TO_LAB', label: 'Delivered', color: 'bg-green-500' },
  { status: 'SAMPLE_ACCEPTED_BY_LAB', label: 'Lab Accepted', color: 'bg-green-600' },
  { status: 'TESTING_SCHEDULED', label: 'Testing Scheduled', color: 'bg-blue-500' },
  { status: 'TESTING_IN_PROGRESS', label: 'Testing', color: 'bg-blue-600' },
  { status: 'TESTING_COMPLETED', label: 'Testing Done', color: 'bg-green-500' },
  { status: 'AWAITING_GOLAB_REVIEW', label: 'GoLab Review', color: 'bg-yellow-500' },
  { status: 'APPROVED_FOR_RELEASE', label: 'Approved', color: 'bg-green-600' },
  { status: 'RELEASED_TO_CUSTOMER', label: 'Released', color: 'bg-green-700' },
];

// ── Channel icon helper ──────────────────────────────────────
function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'EMAIL':
      return <Mail className="h-4 w-4" />;
    case 'WHATSAPP':
      return <MessageCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function channelLabel(channel: string) {
  switch (channel) {
    case 'EMAIL':
      return 'Email';
    case 'WHATSAPP':
      return 'WhatsApp';
    default:
      return 'Portal';
  }
}

// ── Main page ────────────────────────────────────────────────
export default function WorkflowPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Form state for editor
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editActive, setEditActive] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/notification-templates');
      const json = await res.json();
      setTemplates(json.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function seedDefaults() {
    setSeeding(true);
    try {
      const res = await fetch('/api/v1/notification-templates/seed', { method: 'POST' });
      const json = await res.json();
      if (json.data?.created > 0) {
        await fetchTemplates();
      }
    } finally {
      setSeeding(false);
    }
  }

  function openEditor(tpl: NotificationTemplate) {
    setEditingTemplate(tpl);
    setEditSubject(tpl.subject);
    setEditBody(tpl.body);
    setEditActive(tpl.isActive);
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/notification-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editSubject,
          body: editBody,
          isActive: editActive,
        }),
      });
      if (res.ok) {
        setEditingTemplate(null);
        await fetchTemplates();
      }
    } finally {
      setSaving(false);
    }
  }

  function copyPlaceholder(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function insertPlaceholder(key: string) {
    setEditBody((prev) => prev + key);
  }

  // Group templates by event type
  const templatesByEvent: Record<string, NotificationTemplate[]> = {};
  for (const tpl of templates) {
    if (!templatesByEvent[tpl.eventType]) templatesByEvent[tpl.eventType] = [];
    templatesByEvent[tpl.eventType].push(tpl);
  }

  const filteredEvents = ALL_EVENTS.filter(
    (e) =>
      !search ||
      e.label.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Workflow & Notifications</h1>
        <p className="text-sm text-slate-600 mt-1">
          Visualize the request lifecycle and customize notification templates
        </p>
      </div>

      <Tabs defaultValue="workflow">
        <TabsList>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="templates">Notification Templates</TabsTrigger>
          <TabsTrigger value="placeholders">Placeholders Reference</TabsTrigger>
        </TabsList>

        {/* ── Workflow Tab ─────────────────────────────────────── */}
        <TabsContent value="workflow" className="space-y-6 mt-6">
          {/* Request lifecycle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {REQUEST_WORKFLOW.map((step, i) => (
                  <div key={step.status} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <div className={`h-2.5 w-2.5 rounded-full ${step.color}`} />
                      <span className="text-sm font-medium text-slate-700">{step.label}</span>
                    </div>
                    {i < REQUEST_WORKFLOW.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  CANCELLED — can branch from Draft, Pending Review, or Accepted
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ON_HOLD — admin can pause from Draft, Pending Review, or Accepted
                </Badge>
                <Badge variant="outline" className="text-xs">
                  CREDIT_APPROVED — skips payment step for credit customers
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sub-request lifecycle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sub-Request Lifecycle (per Lab)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {SUB_REQUEST_WORKFLOW.map((step, i) => (
                  <div key={step.status} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <div className={`h-2.5 w-2.5 rounded-full ${step.color}`} />
                      <span className="text-sm font-medium text-slate-700">{step.label}</span>
                    </div>
                    {i < SUB_REQUEST_WORKFLOW.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                  SAMPLE_EXCEPTION — can occur after lab acceptance
                </Badge>
                <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                  TESTING_DELAYED — lab reports delay with reason
                </Badge>
                <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                  RETURNED_TO_LAB — GoLab sends back for corrections
                </Badge>
                <Badge variant="outline" className="text-xs text-red-700 border-red-300">
                  SAMPLE_REJECTED — lab rejects sample entirely
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Notification event mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Triggers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {EVENT_CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">{cat.label}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cat.events.map((ev) => {
                        const tpls = templatesByEvent[ev.type] ?? [];
                        const channels = tpls.map((t) => t.channel);
                        return (
                          <div
                            key={ev.type}
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-800">{ev.label}</p>
                              <p className="text-xs text-slate-500">{ev.description}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {['PORTAL', 'EMAIL', 'WHATSAPP'].map((ch) => (
                                <div
                                  key={ch}
                                  className={`p-1 rounded ${channels.includes(ch as NotificationTemplate['channel']) ? 'text-blue-600' : 'text-slate-300'}`}
                                  title={`${channelLabel(ch)}: ${channels.includes(ch as NotificationTemplate['channel']) ? 'configured' : 'not configured'}`}
                                >
                                  <ChannelIcon channel={ch} />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Templates Tab ────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
              <RefreshCw className={`h-4 w-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
              {seeding
                ? 'Seeding...'
                : templates.length === 0
                  ? 'Load Default Templates'
                  : 'Seed Missing'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading templates...</div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600 mb-4">
                  No templates in the database yet. Click &quot;Load Default Templates&quot; to seed
                  the default notification templates from the system configuration.
                </p>
                <Button onClick={seedDefaults} disabled={seeding}>
                  {seeding ? 'Seeding...' : 'Load Default Templates'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {EVENT_CATEGORIES.map((cat) => {
                const catEvents = cat.events.filter((e) =>
                  filteredEvents.some((f) => f.type === e.type),
                );
                if (catEvents.length === 0) return null;

                return (
                  <div key={cat.label}>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {cat.label}
                    </h3>
                    <div className="space-y-2">
                      {catEvents.map((ev) => {
                        const tpls = templatesByEvent[ev.type] ?? [];
                        if (tpls.length === 0) return null;

                        return (
                          <Card key={ev.type}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{ev.label}</p>
                                  <p className="text-xs text-slate-500 font-mono">{ev.type}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {tpls.map((tpl) => (
                                  <div
                                    key={tpl.id}
                                    className={`rounded-lg border p-3 cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm ${
                                      tpl.isActive
                                        ? 'border-slate-200 bg-white'
                                        : 'border-slate-200 bg-slate-50 opacity-60'
                                    }`}
                                    onClick={() => openEditor(tpl)}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5">
                                        <ChannelIcon channel={tpl.channel} />
                                        <span className="text-xs font-medium text-slate-600">
                                          {channelLabel(tpl.channel)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {!tpl.isActive && (
                                          <Badge variant="secondary" className="text-[10px]">
                                            Disabled
                                          </Badge>
                                        )}
                                        <Pencil className="h-3 w-3 text-slate-400" />
                                      </div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                      {tpl.subject}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                      {tpl.body}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Placeholders Reference Tab ────────────────────────── */}
        <TabsContent value="placeholders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Placeholders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Use these placeholders in your notification templates. They will be replaced with
                actual values when the notification is sent. Click to copy.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PLACEHOLDERS.map((ph) => (
                  <div
                    key={ph.key}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 hover:border-blue-300 transition-colors cursor-pointer group"
                    onClick={() => copyPlaceholder(ph.key)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {ph.key}
                        </code>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{ph.description}</p>
                      <p className="text-xs text-slate-400 italic">e.g. {ph.example}</p>
                    </div>
                    <button
                      className="p-1.5 rounded text-slate-400 hover:text-blue-600 transition-colors"
                      title="Copy placeholder"
                    >
                      {copiedKey === ph.key ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Template Editor Dialog ────────────────────────────── */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelIcon channel={editingTemplate?.channel ?? 'PORTAL'} />
              Edit {channelLabel(editingTemplate?.channel ?? 'PORTAL')} Template
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono text-xs">{editingTemplate?.eventType}</span>
              {' — '}
              {ALL_EVENTS.find((e) => e.type === editingTemplate?.eventType)?.description ?? ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-subject">Subject / Title</Label>
                <Input
                  id="tpl-subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Notification subject line"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpl-body">Body</Label>
                <textarea
                  id="tpl-body"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={8}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-slate-800"
                  placeholder="Notification body text with {{placeholders}}"
                />
                <p className="text-xs text-slate-500">
                  Use {'{{placeholders}}'} for dynamic content. Click a placeholder on the right to
                  insert it.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="tpl-active" checked={editActive} onCheckedChange={setEditActive} />
                <Label htmlFor="tpl-active">
                  Active —{' '}
                  {editActive
                    ? 'notifications will be sent'
                    : 'notifications disabled for this channel'}
                </Label>
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Preview
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {editSubject || '(no subject)'}
                </p>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                  {editBody || '(no body)'}
                </p>
              </div>
            </div>

            {/* Placeholders sidebar */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Insert Placeholder
              </p>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph.key}
                    type="button"
                    onClick={() => insertPlaceholder(ph.key)}
                    className="w-full text-left rounded-md border border-slate-200 px-2.5 py-1.5 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <code className="text-xs font-mono text-blue-700">{ph.key}</code>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {ph.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
