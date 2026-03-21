'use client';

import { useRouter } from 'next/navigation';
import type { CreateTestInput } from '@golab/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TestForm } from '../test-form';
import { useCreateTest } from '../hooks';

export default function NewTestPage() {
  const router = useRouter();
  const createTest = useCreateTest();

  const handleSubmit = async (data: CreateTestInput) => {
    try {
      await createTest.mutateAsync(data);
      router.push('/admin/tests');
    } catch {
      // Error displayed via mutation state
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/tests">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Test</h1>
      </div>
      {createTest.isError && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">{createTest.error.message}</div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TestForm
            onSubmit={handleSubmit}
            isSubmitting={createTest.isPending}
            submitLabel="Create Test"
          />
        </CardContent>
      </Card>
    </div>
  );
}
