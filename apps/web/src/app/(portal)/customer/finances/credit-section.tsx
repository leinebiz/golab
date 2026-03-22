'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditApplicationForm } from './credit-application-form';

interface CreditSectionProps {
  canApply: boolean;
  isPending: boolean;
}

export function CreditApplicationSection({ canApply, isPending }: CreditSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isPending || submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Submitted</CardTitle>
          <CardDescription>
            Your credit application has been submitted and is pending review. We will notify you
            once a decision is made.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canApply) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply for Credit</CardTitle>
        <CardDescription>
          Submit a credit application to enable 30-day payment terms on your orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>Start Application</Button>
        ) : (
          <CreditApplicationForm
            onSuccess={() => {
              setSubmitted(true);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
