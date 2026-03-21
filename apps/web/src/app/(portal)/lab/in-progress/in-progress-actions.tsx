'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface InProgressActionsProps {
  subRequestId: string;
  currentStatus: string;
  currentEta: string | null;
}

export function InProgressActions({
  subRequestId,
  currentStatus,
  currentEta,
}: InProgressActionsProps) {
  const [eta, setEta] = useState(currentEta ? currentEta.slice(0, 10) : '');
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSetEta() {
    if (!eta) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/sub-requests/${subRequestId}/turnaround`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCompletionAt: new Date(eta).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to update ETA');
        return;
      }
      router.refresh();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFlagDelay() {
    if (delayReason.length < 5) {
      alert('Please provide a delay reason (at least 5 characters).');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        flagDelay: true,
        delayReason,
      };
      if (eta) {
        payload.expectedCompletionAt = new Date(eta).toISOString();
      }

      const res = await fetch(`/api/v1/sub-requests/${subRequestId}/turnaround`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to flag delay');
        return;
      }
      setShowDelayForm(false);
      setDelayReason('');
      router.refresh();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleMarkComplete() {
    router.push(`/portal/lab/upload?subRequest=${subRequestId}`);
  }

  const canFlagDelay = [
    'TESTING_IN_PROGRESS',
    'SAMPLE_ACCEPTED_BY_LAB',
    'TESTING_SCHEDULED',
  ].includes(currentStatus);
  const canMarkComplete = ['TESTING_IN_PROGRESS', 'TESTING_DELAYED'].includes(currentStatus);

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`eta-${subRequestId}`} className="text-xs">
            Set ETA
          </Label>
          <Input
            id={`eta-${subRequestId}`}
            type="date"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="w-40"
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleSetEta} disabled={loading || !eta}>
          Update ETA
        </Button>
        {canFlagDelay && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDelayForm(!showDelayForm)}
            disabled={loading}
          >
            Flag Delay
          </Button>
        )}
        {canMarkComplete && (
          <Button size="sm" onClick={handleMarkComplete} disabled={loading}>
            Mark Complete
          </Button>
        )}
      </div>

      {showDelayForm && (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
          <Label htmlFor={`delay-${subRequestId}`} className="text-xs font-medium text-red-700">
            Delay Reason
          </Label>
          <Textarea
            id={`delay-${subRequestId}`}
            value={delayReason}
            onChange={(e) => setDelayReason(e.target.value)}
            placeholder="Explain the reason for the delay..."
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleFlagDelay}
              disabled={loading || delayReason.length < 5}
            >
              {loading ? 'Submitting...' : 'Confirm Delay'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDelayForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
