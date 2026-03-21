'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, FileText, Users } from 'lucide-react';

const DISCLAIMER_TYPES = [
  'CUSTOMER_TERMS',
  'CUSTOMER_TESTING',
  'CUSTOMER_SAMPLE_HANDLING',
  'LAB_CONFIDENTIALITY',
  'LAB_SERVICE_TERMS',
] as const;

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER_TERMS: 'Customer Terms',
  CUSTOMER_TESTING: 'Customer Testing',
  CUSTOMER_SAMPLE_HANDLING: 'Sample Handling',
  LAB_CONFIDENTIALITY: 'Lab Confidentiality',
  LAB_SERVICE_TERMS: 'Lab Service Terms',
};

interface Acceptance {
  id: string;
  organizationId: string;
  acceptedById: string;
  acceptedAt: string;
  organization: { name: string };
}

interface Disclaimer {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  acceptances: Acceptance[];
  _count: { acceptances: number };
  createdAt: string;
}

export default function DisclaimersPage() {
  const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAcceptances, setShowAcceptances] = useState<Disclaimer | null>(null);
  const [formType, setFormType] = useState<string>(DISCLAIMER_TYPES[0]);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDisclaimers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/disclaimers?active=false');
      if (res.ok) {
        const data = await res.json();
        setDisclaimers(data.disclaimers);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisclaimers();
  }, [fetchDisclaimers]);

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/disclaimers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: formType, title: formTitle, content: formContent }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormTitle('');
        setFormContent('');
        await fetchDisclaimers();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (disclaimer: Disclaimer) => {
    await fetch(`/api/v1/disclaimers/${disclaimer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !disclaimer.isActive }),
    });
    await fetchDisclaimers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disclaimers</h1>
          <p className="text-sm text-gray-500">Manage versioned disclaimers and track acceptance</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Disclaimer
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : disclaimers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <FileText className="mx-auto mb-3 h-10 w-10" />
            <p>No disclaimers created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disclaimers.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{d.title}</CardTitle>
                      <Badge variant={d.isActive ? 'success' : 'secondary'}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {TYPE_LABELS[d.type] ?? d.type} &middot; Version {d.version} &middot; Created{' '}
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAcceptances(d)}>
                      <Users className="mr-1 h-3 w-3" />
                      {d._count.acceptances} accepted
                    </Button>
                    <Button
                      variant={d.isActive ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => handleToggleActive(d)}
                    >
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-600">
                  {d.content.length > 300 ? `${d.content.slice(0, 300)}...` : d.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Disclaimer</DialogTitle>
            <DialogDescription>
              A new version will be created and previous versions of the same type will be
              deactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCLAIMER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Terms of Service v3"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={8}
                placeholder="Full disclaimer text..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formTitle || !formContent}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acceptances dialog */}
      <Dialog open={!!showAcceptances} onOpenChange={() => setShowAcceptances(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acceptance History</DialogTitle>
            <DialogDescription>
              Organizations that accepted &quot;{showAcceptances?.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {showAcceptances?.acceptances.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No acceptances yet.</p>
            ) : (
              <div className="space-y-2">
                {showAcceptances?.acceptances.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded border p-3 text-sm"
                  >
                    <span className="font-medium">{a.organization.name}</span>
                    <span className="text-gray-500">
                      {new Date(a.acceptedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
