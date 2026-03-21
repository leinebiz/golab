'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAllLaboratories, useAllTests, useSetLabTests } from '../hooks';

interface TestItem {
  id: string;
  name: string;
  code: string;
  category: string;
}
interface LabItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export default function LabTestMatrixPage() {
  const { data: testsData, isLoading: loadingTests } = useAllTests();
  const { data: labsData, isLoading: loadingLabs } = useAllLaboratories();
  const setLabTests = useSetLabTests();
  const [loadingCell, setLoadingCell] = useState<string | null>(null);
  const [labTestMap, setLabTestMap] = useState<Record<string, Set<string>>>({});
  const [initialized, setInitialized] = useState(false);

  const labs: LabItem[] = labsData?.data ?? [];
  const tests: TestItem[] = testsData?.data ?? [];

  useEffect(() => {
    if (!labs.length || initialized) return;
    const fetchAll = async () => {
      const map: Record<string, Set<string>> = {};
      await Promise.all(
        labs.map(async (lab) => {
          try {
            const res = await fetch(`/api/v1/laboratories/${lab.id}/tests`);
            if (res.ok) {
              const data = await res.json();
              map[lab.id] = new Set(
                (data as { testCatalogueId: string }[]).map((lt) => lt.testCatalogueId),
              );
            }
          } catch {
            map[lab.id] = new Set();
          }
        }),
      );
      setLabTestMap(map);
      setInitialized(true);
    };
    fetchAll();
  }, [labs, initialized]);

  const handleToggle = useCallback(
    async (labId: string, testId: string, currentlyEnabled: boolean) => {
      const cellKey = `${labId}-${testId}`;
      setLoadingCell(cellKey);
      try {
        const res = await fetch(`/api/v1/laboratories/${labId}/tests`);
        const currentTests = res.ok ? await res.json() : [];

        type LT = {
          testCatalogueId: string;
          accreditation: string;
          labTatDays: number;
          labPrice: string | null;
          isActive: boolean;
        };
        let updatedTests;
        if (currentlyEnabled) {
          updatedTests = (currentTests as LT[])
            .filter((lt) => lt.testCatalogueId !== testId)
            .map((lt) => ({
              testCatalogueId: lt.testCatalogueId,
              accreditation: lt.accreditation,
              labTatDays: lt.labTatDays,
              labPrice: lt.labPrice ?? undefined,
              isActive: lt.isActive,
            }));
        } else {
          updatedTests = [
            ...(currentTests as LT[]).map((lt) => ({
              testCatalogueId: lt.testCatalogueId,
              accreditation: lt.accreditation,
              labTatDays: lt.labTatDays,
              labPrice: lt.labPrice ?? undefined,
              isActive: lt.isActive,
            })),
            { testCatalogueId: testId, accreditation: 'ACCREDITED', labTatDays: 5, isActive: true },
          ];
        }

        await setLabTests.mutateAsync({ labId, tests: updatedTests });
        setLabTestMap((prev) => {
          const newMap = { ...prev };
          const set = new Set(prev[labId] ?? []);
          if (currentlyEnabled) set.delete(testId);
          else set.add(testId);
          newMap[labId] = set;
          return newMap;
        });
      } finally {
        setLoadingCell(null);
      }
    },
    [setLabTests],
  );

  if (loadingTests || loadingLabs)
    return <div className="flex justify-center py-12 text-gray-500">Loading matrix data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/labs">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Lab-Test Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of which tests each laboratory can perform.
          </p>
        </div>
      </div>

      {labs.length === 0 || tests.length === 0 ? (
        <div className="rounded-md bg-yellow-50 p-4 text-yellow-700">
          {labs.length === 0 ? 'No active laboratories found. ' : ''}
          {tests.length === 0 ? 'No active tests found. ' : ''}
          Add some before using the matrix view.
        </div>
      ) : (
        <div className="overflow-auto rounded-md border bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 p-3 text-left font-medium min-w-[200px]">
                  Test / Lab
                </th>
                {labs.map((lab) => (
                  <th key={lab.id} className="p-3 text-center font-medium min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-mono">{lab.code}</span>
                      <span className="text-xs text-gray-500 font-normal">{lab.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{test.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {test.category}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{test.code}</span>
                  </td>
                  {labs.map((lab) => {
                    const isEnabled = labTestMap[lab.id]?.has(test.id) ?? false;
                    const cellKey = `${lab.id}-${test.id}`;
                    return (
                      <td key={lab.id} className="p-3 text-center">
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(lab.id, test.id, isEnabled)}
                          disabled={loadingCell === cellKey || !initialized}
                          className="mx-auto"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
