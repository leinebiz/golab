'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateLaboratoryInput } from '@golab/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LabForm } from '../../lab-form';
import { useLaboratory, useUpdateLaboratory, useLabTests, useSetLabTests } from '../../hooks';
import { useTests } from '../../../tests/hooks';

interface LabTestEntry {
  id: string;
  testCatalogueId: string;
  accreditation: string;
  labTatDays: number;
  labPrice: string | null;
  isActive: boolean;
  testCatalogue: { id: string; name: string; code: string; category: string };
}

export default function EditLaboratoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lab, isLoading, error } = useLaboratory(id);
  const updateLab = useUpdateLaboratory();
  const { data: labTests } = useLabTests(id);
  const { data: allTestsData } = useTests({ limit: 100 });
  const setLabTests = useSetLabTests();

  const handleSubmit = async (data: CreateLaboratoryInput) => {
    try {
      await updateLab.mutateAsync({ id, data });
      router.push('/admin/labs');
    } catch {
      // Error shown via mutation state
    }
  };

  const handleToggleTest = async (testId: string, currentlyEnabled: boolean) => {
    if (!labTests) return;
    const currentList = labTests as LabTestEntry[];

    let updatedTests;
    if (currentlyEnabled) {
      updatedTests = currentList
        .filter((lt) => lt.testCatalogueId !== testId)
        .map((lt) => ({
          testCatalogueId: lt.testCatalogueId,
          accreditation: lt.accreditation as 'ACCREDITED' | 'NON_ACCREDITED',
          labTatDays: lt.labTatDays,
          labPrice: lt.labPrice ?? undefined,
          isActive: lt.isActive,
        }));
    } else {
      updatedTests = [
        ...currentList.map((lt) => ({
          testCatalogueId: lt.testCatalogueId,
          accreditation: lt.accreditation as 'ACCREDITED' | 'NON_ACCREDITED',
          labTatDays: lt.labTatDays,
          labPrice: lt.labPrice ?? undefined,
          isActive: lt.isActive,
        })),
        {
          testCatalogueId: testId,
          accreditation: 'ACCREDITED' as const,
          labTatDays: 5,
          isActive: true,
        },
      ];
    }

    await setLabTests.mutateAsync({ labId: id, tests: updatedTests });
  };

  if (isLoading)
    return <div className="flex justify-center py-12 text-gray-500">Loading laboratory...</div>;
  if (error || !lab)
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          Laboratory not found or failed to load.
        </div>
        <Link href="/admin/labs">
          <Button variant="outline">Back to Laboratories</Button>
        </Link>
      </div>
    );

  const location = lab.location as Record<string, unknown> | null;
  const enabledTestIds = new Set(
    (labTests as LabTestEntry[] | undefined)?.map((lt) => lt.testCatalogueId) ?? [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/labs">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Laboratory: {lab.name}</h1>
      </div>
      {updateLab.isError && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">{updateLab.error.message}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Laboratory Details</CardTitle>
        </CardHeader>
        <CardContent>
          <LabForm
            defaultValues={{
              name: lab.name,
              code: lab.code,
              organizationId: lab.organizationId,
              contactEmail: lab.contactEmail,
              contactPhone: lab.contactPhone,
              latitude: (location?.latitude as number) ?? 0,
              longitude: (location?.longitude as number) ?? 0,
              accreditationBody: (location?.accreditationBody as string) ?? '',
              accreditationNumber: (location?.accreditationNumber as string) ?? '',
              isActive: lab.isActive,
            }}
            onSubmit={handleSubmit}
            isSubmitting={updateLab.isPending}
            submitLabel="Update Laboratory"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Select the tests this laboratory can perform.
          </p>
          {setLabTests.isPending && (
            <div className="text-sm text-blue-600 mb-2">Updating test capabilities...</div>
          )}
          <div className="space-y-2">
            {allTestsData?.data?.map(
              (test: { id: string; name: string; code: string; category: string }) => {
                const isEnabled = enabledTestIds.has(test.id);
                const labTest = (labTests as LabTestEntry[] | undefined)?.find(
                  (lt) => lt.testCatalogueId === test.id,
                );
                return (
                  <div
                    key={test.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleTest(test.id, isEnabled)}
                      disabled={setLabTests.isPending}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{test.name}</span>
                      <span className="text-xs text-gray-500 ml-2 font-mono">{test.code}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {test.category}
                    </Badge>
                    {isEnabled && labTest && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{labTest.labTatDays}d TAT</span>
                        <Badge
                          variant={labTest.accreditation === 'ACCREDITED' ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {labTest.accreditation === 'ACCREDITED' ? 'Accr.' : 'Non-Accr.'}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              },
            ) ?? <p className="text-gray-500">Loading tests...</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
