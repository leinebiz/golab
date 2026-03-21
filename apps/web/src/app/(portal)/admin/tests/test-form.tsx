'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTestSchema, type CreateTestInput } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface TestFormProps {
  defaultValues?: Partial<CreateTestInput>;
  onSubmit: (data: CreateTestInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const CATEGORIES = [
  'Chemical Analysis',
  'Microbiological',
  'Physical Testing',
  'Environmental',
  'Food Safety',
  'Water Quality',
  'Soil Analysis',
  'Materials Testing',
  'Other',
];

const SAMPLE_TYPES = [
  'Water',
  'Soil',
  'Food',
  'Air',
  'Blood',
  'Tissue',
  'Material',
  'Chemical',
  'Other',
];

export function TestForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
}: TestFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateTestInput>({
    resolver: zodResolver(CreateTestSchema),
    defaultValues: {
      accreditation: 'ACCREDITED',
      isActive: true,
      toleranceApplicable: false,
      ...defaultValues,
    },
  });

  const toleranceApplicable = watch('toleranceApplicable');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="e.g. E. coli Count" />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input id="code" {...register('code')} placeholder="e.g. ECOLI-001" />
          {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select id="category" {...register('category')}>
            <option value="">Select category...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sampleType">Sample Type *</Label>
          <Select id="sampleType" {...register('sampleType')}>
            <option value="">Select sample type...</option>
            {SAMPLE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          {errors.sampleType && <p className="text-sm text-red-600">{errors.sampleType.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="accreditation">Accreditation Status *</Label>
          <Select id="accreditation" {...register('accreditation')}>
            <option value="ACCREDITED">Accredited</option>
            <option value="NON_ACCREDITED">Non-Accredited</option>
          </Select>
          {errors.accreditation && (
            <p className="text-sm text-red-600">{errors.accreditation.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (ZAR) *</Label>
          <Input id="basePrice" {...register('basePrice')} placeholder="e.g. 150.00" />
          {errors.basePrice && <p className="text-sm text-red-600">{errors.basePrice.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="standardTatDays">Standard TAT (days) *</Label>
          <Input id="standardTatDays" type="number" min={1} {...register('standardTatDays')} />
          {errors.standardTatDays && (
            <p className="text-sm text-red-600">{errors.standardTatDays.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expeditedTatDays">Expedited TAT (days)</Label>
          <Input id="expeditedTatDays" type="number" min={1} {...register('expeditedTatDays')} />
          {errors.expeditedTatDays && (
            <p className="text-sm text-red-600">{errors.expeditedTatDays.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expediteSurchargePercent">Expedite Surcharge (%)</Label>
          <Input
            id="expediteSurchargePercent"
            type="number"
            min={0}
            max={100}
            step={0.1}
            {...register('expediteSurchargePercent')}
          />
          {errors.expediteSurchargePercent && (
            <p className="text-sm text-red-600">{errors.expediteSurchargePercent.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          {...register('description')}
          placeholder="Optional description..."
        />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="toleranceApplicable"
            checked={toleranceApplicable}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              setValue('toleranceApplicable', !!checked)
            }
          />
          <Label htmlFor="toleranceApplicable">Tolerance Applicable</Label>
        </div>
        {toleranceApplicable && (
          <div className="space-y-2 ml-6">
            <Label htmlFor="toleranceUnit">Tolerance Unit</Label>
            <Input id="toleranceUnit" {...register('toleranceUnit')} placeholder="e.g. mg/L" />
            {errors.toleranceUnit && (
              <p className="text-sm text-red-600">{errors.toleranceUnit.message}</p>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
