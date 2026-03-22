'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { submitCreditApplication } from './actions';

interface CreditApplicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreditApplicationForm({ onSuccess, onCancel }: CreditApplicationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);

    const result = await submitCreditApplication(formData);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error ?? 'Failed to submit application');
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="companyReg" className="mb-1 block text-sm font-medium text-gray-700">
          Company Registration Number
        </label>
        <Input id="companyReg" name="companyReg" required placeholder="e.g. 2024/123456/07" />
      </div>
      <div>
        <label htmlFor="vatNumber" className="mb-1 block text-sm font-medium text-gray-700">
          VAT Number (optional)
        </label>
        <Input id="vatNumber" name="vatNumber" placeholder="e.g. 4123456789" />
      </div>
      <div>
        <label htmlFor="requestedLimit" className="mb-1 block text-sm font-medium text-gray-700">
          Requested Credit Limit (ZAR)
        </label>
        <Input
          id="requestedLimit"
          name="requestedLimit"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="e.g. 50000.00"
        />
      </div>
      <div>
        <label htmlFor="reason" className="mb-1 block text-sm font-medium text-gray-700">
          Reason for Credit Application
        </label>
        <Textarea
          id="reason"
          name="reason"
          required
          placeholder="Describe your testing needs and expected monthly volume..."
          rows={3}
        />
      </div>
      <div>
        <label htmlFor="documents" className="mb-1 block text-sm font-medium text-gray-700">
          Supporting Documents
        </label>
        <Input
          id="documents"
          name="documents"
          type="file"
          multiple
          accept=".pdf,.jpg,.png,.doc,.docx"
        />
        <p className="mt-1 text-xs text-gray-500">
          Upload company registration documents, financial statements, or trade references.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
