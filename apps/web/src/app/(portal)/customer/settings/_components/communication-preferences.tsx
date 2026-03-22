'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface CommunicationPreferencesProps {
  organizationId: string;
}

const CHANNEL_OPTIONS = [
  { value: 'PORTAL', label: 'Portal notifications' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
] as const;

export function CommunicationPreferences({ organizationId }: CommunicationPreferencesProps) {
  const [channel, setChannel] = useState<string>('EMAIL');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchPreference() {
      try {
        const res = await fetch(`/api/v1/organizations/${organizationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.preferredCommChannel) {
            setChannel(data.preferredCommChannel);
          }
        }
      } catch (error: unknown) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPreference();
  }, [organizationId]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredCommChannel: channel }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Communication preferences saved.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Preferences</CardTitle>
        <CardDescription>
          Choose how you prefer to receive notifications about your requests and updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Preferred Communication Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            This determines how status updates, certificates, and invoices are communicated to your
            team.
          </p>
        </div>

        {message && (
          <p
            className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={save} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardFooter>
    </Card>
  );
}
