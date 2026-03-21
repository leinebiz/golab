'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultToleranceSchema, type DefaultToleranceInput } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface TestCatalogueEntry {
  id: string;
  code: string;
  name: string;
  category: string;
  toleranceUnit: string | null;
}

interface ToleranceEntry {
  id: string;
  testCatalogueId: string;
  testCatalogue: TestCatalogueEntry;
  minValue: number | null;
  maxValue: number | null;
  unit: string;
  notes: string | null;
}

// Demo test catalogue - in production fetched from /api/v1/tests
const DEMO_TESTS: TestCatalogueEntry[] = [
  { id: 'test-1', code: 'WQ-PH', name: 'pH Level', category: 'Water', toleranceUnit: 'pH' },
  {
    id: 'test-2',
    code: 'WQ-TDS',
    name: 'Total Dissolved Solids',
    category: 'Water',
    toleranceUnit: 'mg/L',
  },
  { id: 'test-3', code: 'SL-PB', name: 'Lead Content', category: 'Soil', toleranceUnit: 'mg/kg' },
  { id: 'test-4', code: 'FD-EC', name: 'E. coli Count', category: 'Food', toleranceUnit: 'CFU/g' },
  {
    id: 'test-5',
    code: 'WQ-CL',
    name: 'Chlorine Residual',
    category: 'Water',
    toleranceUnit: 'mg/L',
  },
];

export default function TolerancesPage() {
  const [tolerances, setTolerances] = useState<ToleranceEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTolerance, setEditingTolerance] = useState<ToleranceEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DefaultToleranceInput>({
    resolver: zodResolver(DefaultToleranceSchema),
    defaultValues: {
      testCatalogueId: '',
      minValue: undefined,
      maxValue: undefined,
      unit: '',
      notes: '',
    },
  });

  const openCreateDialog = () => {
    setEditingTolerance(null);
    setSelectedTestId('');
    reset({ testCatalogueId: '', minValue: undefined, maxValue: undefined, unit: '', notes: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (tolerance: ToleranceEntry) => {
    setEditingTolerance(tolerance);
    setSelectedTestId(tolerance.testCatalogueId);
    reset({
      testCatalogueId: tolerance.testCatalogueId,
      minValue: tolerance.minValue ?? undefined,
      maxValue: tolerance.maxValue ?? undefined,
      unit: tolerance.unit,
      notes: tolerance.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onTestSelect = (testId: string) => {
    setSelectedTestId(testId);
    setValue('testCatalogueId', testId);
    const test = DEMO_TESTS.find((t) => t.id === testId);
    if (test?.toleranceUnit) {
      setValue('unit', test.toleranceUnit);
    }
  };

  const onSubmit = async (data: DefaultToleranceInput) => {
    setSaving(true);
    try {
      const test = DEMO_TESTS.find((t) => t.id === data.testCatalogueId);
      if (!test) return;

      if (editingTolerance) {
        setTolerances((prev) =>
          prev.map((t) =>
            t.id === editingTolerance.id
              ? {
                  ...t,
                  testCatalogueId: data.testCatalogueId,
                  testCatalogue: test,
                  minValue: data.minValue ?? null,
                  maxValue: data.maxValue ?? null,
                  unit: data.unit,
                  notes: data.notes ?? null,
                }
              : t,
          ),
        );
      } else {
        const newTolerance: ToleranceEntry = {
          id: `tol-${Date.now()}`,
          testCatalogueId: data.testCatalogueId,
          testCatalogue: test,
          minValue: data.minValue ?? null,
          maxValue: data.maxValue ?? null,
          unit: data.unit,
          notes: data.notes ?? null,
        };
        setTolerances((prev) => [newTolerance, ...prev]);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteTolerance = (id: string) => {
    setTolerances((prev) => prev.filter((t) => t.id !== id));
  };

  const availableTests = DEMO_TESTS.filter(
    (test) =>
      !tolerances.some((t) => t.testCatalogueId === test.id && t.id !== editingTolerance?.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Default Tolerances</h1>
        <p className="text-gray-500 mt-1">
          Set default acceptable ranges for test results. These are applied automatically to new
          requests unless overridden.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tolerance Thresholds</CardTitle>
            <CardDescription>
              {tolerances.length} tolerance{tolerances.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Tolerance
          </Button>
        </CardHeader>
        <CardContent>
          {tolerances.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No default tolerances configured yet. Add tolerances to automatically flag
              out-of-range results.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-gray-500">Test</th>
                    <th className="pb-2 font-medium text-gray-500">Category</th>
                    <th className="pb-2 font-medium text-gray-500">Min</th>
                    <th className="pb-2 font-medium text-gray-500">Max</th>
                    <th className="pb-2 font-medium text-gray-500">Unit</th>
                    <th className="pb-2 font-medium text-gray-500">Notes</th>
                    <th className="pb-2 font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tolerances.map((tolerance) => (
                    <tr key={tolerance.id}>
                      <td className="py-3">
                        <p className="font-medium">{tolerance.testCatalogue.name}</p>
                        <p className="text-gray-400 text-xs">{tolerance.testCatalogue.code}</p>
                      </td>
                      <td className="py-3 text-gray-600">{tolerance.testCatalogue.category}</td>
                      <td className="py-3 font-mono">
                        {tolerance.minValue != null ? tolerance.minValue : '-'}
                      </td>
                      <td className="py-3 font-mono">
                        {tolerance.maxValue != null ? tolerance.maxValue : '-'}
                      </td>
                      <td className="py-3 text-gray-600">{tolerance.unit}</td>
                      <td className="py-3 text-gray-500 max-w-[200px] truncate">
                        {tolerance.notes ?? '-'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(tolerance)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTolerance(tolerance.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTolerance ? 'Edit Tolerance' : 'Add Default Tolerance'}
            </DialogTitle>
            <DialogDescription>
              {editingTolerance
                ? 'Update the tolerance threshold.'
                : 'Set acceptable min/max values for a test.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Test</Label>
              <Select value={selectedTestId} onValueChange={onTestSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a test" />
                </SelectTrigger>
                <SelectContent>
                  {availableTests.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.name} ({test.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.testCatalogueId && (
                <p className="text-sm text-red-600">{errors.testCatalogueId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minValue">Minimum Value</Label>
                <Input
                  id="minValue"
                  type="number"
                  step="any"
                  {...register('minValue', { valueAsNumber: true })}
                />
                {errors.minValue && (
                  <p className="text-sm text-red-600">{errors.minValue.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxValue">Maximum Value</Label>
                <Input
                  id="maxValue"
                  type="number"
                  step="any"
                  {...register('maxValue', { valueAsNumber: true })}
                />
                {errors.maxValue && (
                  <p className="text-sm text-red-600">{errors.maxValue.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="mg/L, pH, CFU/g..." {...register('unit')} />
              {errors.unit && <p className="text-sm text-red-600">{errors.unit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this tolerance threshold..."
                {...register('notes')}
              />
              {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingTolerance ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
