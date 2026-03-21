'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateTestInput } from '@golab/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TestForm } from '../../test-form';
import { useTest, useUpdateTest } from '../../hooks';

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: test, isLoading, error } = useTest(id);
  const updateTest = useUpdateTest();

  const handleSubmit = async (data: CreateTestInput) => {
    try {
      await updateTest.mutateAsync({ id, data });
      router.push('/admin/tests');
    } catch {
      // Error displayed via mutation state
    }
  };

  if (isLoading)
    return <div className="flex justify-center py-12 text-gray-500">Loading test...</div>;
  if (error || !test)
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          Test not found or failed to load.
        </div>
        <Link href="/admin/tests">
          <Button variant="outline">Back to Tests</Button>
        </Link>
      </div>
    );

  let expediteSurchargePercent: number | undefined;
  if (test.expediteSurcharge && test.basePrice && parseFloat(test.basePrice) > 0) {
    expediteSurchargePercent =
      (parseFloat(test.expediteSurcharge) / parseFloat(test.basePrice)) * 100;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/tests">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Test: {test.name}</h1>
      </div>
      {updateTest.isError && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">{updateTest.error.message}</div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TestForm
            defaultValues={{
              name: test.name,
              code: test.code,
              description: test.description ?? undefined,
              category: test.category,
              sampleType: '',
              accreditation: test.accreditation,
              basePrice: test.basePrice,
              standardTatDays: test.standardTatDays,
              expeditedTatDays: test.expeditedTatDays ?? undefined,
              expediteSurchargePercent,
              toleranceApplicable: test.toleranceApplicable,
              toleranceUnit: test.toleranceUnit ?? undefined,
              isActive: test.isActive,
            }}
            onSubmit={handleSubmit}
            isSubmitting={updateTest.isPending}
            submitLabel="Update Test"
          />
        </CardContent>
      </Card>
    </div>
  );
}
