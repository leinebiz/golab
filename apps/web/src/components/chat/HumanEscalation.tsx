'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface HumanEscalationProps {
  conversationId: string;
  onEscalated?: () => void;
}

export function HumanEscalation({ conversationId, onEscalated }: HumanEscalationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);

  async function handleEscalate() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '[System: Customer requested human callback support]',
          escalate: true,
        }),
      });
      if (res.ok) {
        setIsEscalated(true);
        onEscalated?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEscalated) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
        A GoLab team member will contact you shortly.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
      <p className="mb-2 text-sm text-yellow-800">Need to speak with a person?</p>
      <Button variant="outline" size="sm" onClick={handleEscalate} disabled={isSubmitting}>
        {isSubmitting ? 'Requesting...' : 'Request Human Callback'}
      </Button>
    </div>
  );
}
