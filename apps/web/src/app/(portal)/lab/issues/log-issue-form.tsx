'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ISSUE_TYPES = [
  { value: 'INSUFFICIENT_SAMPLE', label: 'Insufficient Sample' },
  { value: 'SAMPLE_DAMAGED', label: 'Sample Damaged' },
  { value: 'INCORRECT_TEST_CHOSEN', label: 'Incorrect Test Chosen' },
  { value: 'INCORRECT_PACKAGING', label: 'Incorrect Packaging' },
  { value: 'OTHER', label: 'Other' },
] as const;

interface SubRequestOption {
  id: string;
  subReference: string;
  status: string;
}

export function LogIssueForm({ subRequests }: { subRequests: SubRequestOption[] }) {
  const [subRequestId, setSubRequestId] = useState('');
  const [issueType, setIssueType] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isOther = issueType === 'OTHER';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!subRequestId || !issueType) {
      setError('Please select a sub-request and issue type.');
      return;
    }

    if (isOther && comments.length < 10) {
      setError('Detailed comments (at least 10 characters) required for Other issue type.');
      return;
    }

    if (!comments.trim()) {
      setError('Please provide comments describing the issue.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/sub-requests/${subRequestId}/log-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType, comments }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to log issue');
        return;
      }

      setSubRequestId('');
      setIssueType('');
      setComments('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subRequest">Sub-Request</Label>
            <Select value={subRequestId} onValueChange={setSubRequestId}>
              <SelectTrigger id="subRequest">
                <SelectValue placeholder="Select sub-request..." />
              </SelectTrigger>
              <SelectContent>
                {subRequests.map((sr) => (
                  <SelectItem key={sr.id} value={sr.id}>
                    {sr.subReference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueType">Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issueType">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments {isOther && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                isOther
                  ? 'Please describe the issue in detail (minimum 10 characters)...'
                  : 'Describe the issue...'
              }
              rows={4}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} variant="destructive">
            {loading ? 'Logging Issue...' : 'Log Issue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
