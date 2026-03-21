'use client';

import { useRouter } from 'next/navigation';
import type { CreateLaboratoryInput } from '@golab/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LabForm } from '../lab-form';
import { useCreateLaboratory } from '../hooks';

export default function NewLaboratoryPage() {
  const router = useRouter();
  const createLab = useCreateLaboratory();

  const handleSubmit = async (data: CreateLaboratoryInput) => {
    try {
      await createLab.mutateAsync(data);
      router.push('/admin/labs');
    } catch {
      // Error displayed via mutation state
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/labs">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Laboratory</h1>
      </div>
      {createLab.isError && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">{createLab.error.message}</div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Details</CardTitle>
        </CardHeader>
        <CardContent>
          <LabForm
            onSubmit={handleSubmit}
            isSubmitting={createLab.isPending}
            submitLabel="Create Laboratory"
          />
        </CardContent>
      </Card>
    </div>
  );
}
