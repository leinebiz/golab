'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateLaboratorySchema, type CreateLaboratoryInput } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface LabFormProps {
  defaultValues?: Partial<CreateLaboratoryInput>;
  onSubmit: (data: CreateLaboratoryInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function LabForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
}: LabFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateLaboratoryInput>({
    resolver: zodResolver(CreateLaboratorySchema),
    defaultValues: { isActive: true, ...defaultValues },
  });

  const isActive = watch('isActive');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="e.g. Cape Town Analytical Lab" />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input id="code" {...register('code')} placeholder="e.g. CPT-LAB-001" />
          {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization ID *</Label>
          <Input
            id="organizationId"
            {...register('organizationId')}
            placeholder="Organization CUID"
          />
          {errors.organizationId && (
            <p className="text-sm text-red-600">{errors.organizationId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            {...register('contactEmail')}
            placeholder="lab@example.com"
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-600">{errors.contactEmail.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact Phone *</Label>
          <Input id="contactPhone" {...register('contactPhone')} placeholder="+27 21 123 4567" />
          {errors.contactPhone && (
            <p className="text-sm text-red-600">{errors.contactPhone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude *</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register('latitude')}
            placeholder="-33.9249"
          />
          {errors.latitude && <p className="text-sm text-red-600">{errors.latitude.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude *</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register('longitude')}
            placeholder="18.4241"
          />
          {errors.longitude && <p className="text-sm text-red-600">{errors.longitude.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="accreditationBody">Accreditation Body</Label>
          <Input
            id="accreditationBody"
            {...register('accreditationBody')}
            placeholder="e.g. SANAS"
          />
          {errors.accreditationBody && (
            <p className="text-sm text-red-600">{errors.accreditationBody.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="accreditationNumber">Accreditation Number</Label>
          <Input
            id="accreditationNumber"
            {...register('accreditationNumber')}
            placeholder="e.g. T0123"
          />
          {errors.accreditationNumber && (
            <p className="text-sm text-red-600">{errors.accreditationNumber.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setValue('isActive', checked)}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
