'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEST_CATEGORIES, type TestCategory } from '@golab/shared';

interface TestData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  accreditation: 'ACCREDITED' | 'NON_ACCREDITED';
  standardTatDays: number;
  expeditedTatDays: number | null;
  basePrice: string;
  expediteSurcharge: string | null;
  toleranceApplicable: boolean;
  toleranceUnit: string | null;
  isActive: boolean;
}

interface TestFormDialogProps {
  open: boolean;
  onClose: () => void;
  test: TestData | null;
}

export function TestFormDialog({ open, onClose, test }: TestFormDialogProps) {
  const isEditing = !!test;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      const payload = {
        code: formData.get('code') as string,
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
        category: formData.get('category') as string,
        accreditation: formData.get('accreditation') as string,
        standardTatDays: parseInt(formData.get('standardTatDays') as string, 10),
        expeditedTatDays: formData.get('expeditedTatDays')
          ? parseInt(formData.get('expeditedTatDays') as string, 10)
          : undefined,
        basePrice: formData.get('basePrice') as string,
        expediteSurcharge: (formData.get('expediteSurcharge') as string) || undefined,
        toleranceApplicable: formData.get('toleranceApplicable') === 'on',
        toleranceUnit: (formData.get('toleranceUnit') as string) || undefined,
        isActive: formData.get('isActive') === 'on',
      };

      const url = isEditing ? `/api/v1/tests/${test.id}` : '/api/v1/tests';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'An error occurred');
        return;
      }

      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Test' : 'Add Test'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update test details and pricing.' : 'Add a new test to the catalogue.'}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                defaultValue={test?.code ?? ''}
                required
                placeholder="e.g. WTR-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={test?.name ?? ''} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={test?.description ?? ''}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={test?.category ?? 'Water'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEST_CATEGORIES.map((cat: TestCategory) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accreditation">Accreditation</Label>
              <Select name="accreditation" defaultValue={test?.accreditation ?? 'NON_ACCREDITED'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCREDITED">Accredited</SelectItem>
                  <SelectItem value="NON_ACCREDITED">Non-accredited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="standardTatDays">Standard TAT (days)</Label>
              <Input
                id="standardTatDays"
                name="standardTatDays"
                type="number"
                min={1}
                max={365}
                defaultValue={test?.standardTatDays ?? ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expeditedTatDays">Expedited TAT (days)</Label>
              <Input
                id="expeditedTatDays"
                name="expeditedTatDays"
                type="number"
                min={1}
                max={365}
                defaultValue={test?.expeditedTatDays ?? ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (ZAR)</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="text"
                inputMode="decimal"
                pattern="^\d+(\.\d{1,2})?$"
                defaultValue={test?.basePrice ? Number(test.basePrice).toFixed(2) : ''}
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expediteSurcharge">Expedite Surcharge (ZAR)</Label>
              <Input
                id="expediteSurcharge"
                name="expediteSurcharge"
                type="text"
                inputMode="decimal"
                pattern="^\d+(\.\d{1,2})?$"
                defaultValue={
                  test?.expediteSurcharge ? Number(test.expediteSurcharge).toFixed(2) : ''
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center space-x-3">
              <Switch
                id="toleranceApplicable"
                name="toleranceApplicable"
                defaultChecked={test?.toleranceApplicable ?? false}
              />
              <Label htmlFor="toleranceApplicable">Tolerance applicable</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toleranceUnit">Tolerance Unit</Label>
              <Input
                id="toleranceUnit"
                name="toleranceUnit"
                defaultValue={test?.toleranceUnit ?? ''}
                placeholder="e.g. mg/L, ppm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Switch id="isActive" name="isActive" defaultChecked={test?.isActive ?? true} />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
