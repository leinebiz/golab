'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CreditApplicationFormProps {
  organizationId: string;
  organizationName: string;
}

export function CreditApplicationForm({
  organizationId,
  organizationName,
}: CreditApplicationFormProps) {
  const router = useRouter();
  const [requestedLimit, setRequestedLimit] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!requestedLimit || Number(requestedLimit) <= 0) {
      setError('Please enter a valid credit limit amount.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);
      formData.append('requestedLimit', requestedLimit);
      formData.append('reason', reason);
      for (const file of files) {
        formData.append('documents', file);
      }

      const res = await fetch('/api/v1/credit/apply', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit application');
        return;
      }

      router.push('/portal/customer/finances');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-white p-6 dark:bg-gray-800 dark:border-gray-700 space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Applying for</p>
          <p className="font-medium">{organizationName}</p>
        </div>

        <div>
          <label htmlFor="requestedLimit" className="block text-sm font-medium mb-1">
            Requested Credit Limit (ZAR)
          </label>
          <Input
            id="requestedLimit"
            type="number"
            min="1000"
            step="500"
            value={requestedLimit}
            onChange={(e) => setRequestedLimit(e.target.value)}
            placeholder="e.g. 50000"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum R1,000. The approved amount may differ from your request.
          </p>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium mb-1">
            Reason for Credit Application
          </label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Describe your testing volume and why a credit account would be beneficial..."
          />
        </div>

        <div>
          <label htmlFor="documents" className="block text-sm font-medium mb-1">
            Supporting Documents
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Upload company registration, financial statements, or other relevant documents. PDF or
            image files accepted.
          </p>
          <input
            id="documents"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm"
          />
          {files.length > 0 && (
            <ul className="mt-2 text-xs text-gray-500">
              {files.map((f, i) => (
                <li key={i}>
                  {f.name} ({(f.size / 1024).toFixed(0)} KB)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
