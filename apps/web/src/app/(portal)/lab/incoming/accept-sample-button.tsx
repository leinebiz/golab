'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function AcceptSampleButton({ subRequestId }: { subRequestId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/sub-requests/${subRequestId}/accept-sample`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to accept sample');
        return;
      }

      router.refresh();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleAccept} disabled={loading} className="w-full">
      {loading ? 'Accepting...' : 'Accept Sample'}
    </Button>
  );
}
