'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateOrganizationSchema, type UpdateOrganizationInput } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

interface CompanyDetailsFormProps {
  organizationId: string;
}

export function CompanyDetailsForm({ organizationId }: CompanyDetailsFormProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(UpdateOrganizationSchema),
    defaultValues: {
      name: '',
      registrationNumber: '',
      vatNumber: '',
      industry: '',
    },
  });

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await fetch(`/api/v1/organizations/${organizationId}`);
        if (res.ok) {
          const data = await res.json();
          reset({
            name: data.name ?? '',
            registrationNumber: data.registrationNumber ?? '',
            vatNumber: data.vatNumber ?? '',
            industry: data.industry ?? '',
          });
        }
      } catch {
        // Fetch error — form remains empty
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, [organizationId, reset]);

  const onSubmit = async (data: UpdateOrganizationInput) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Company details saved.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save company details.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>Update your organization information.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" placeholder="Acme Labs (Pty) Ltd" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                placeholder="2024/123456/07"
                {...register('registrationNumber')}
              />
              {errors.registrationNumber && (
                <p className="text-sm text-red-600">{errors.registrationNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input id="vatNumber" placeholder="4123456789" {...register('vatNumber')} />
              {errors.vatNumber && (
                <p className="text-sm text-red-600">{errors.vatNumber.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              placeholder="Mining, Agriculture, Manufacturing..."
              {...register('industry')}
            />
            {errors.industry && <p className="text-sm text-red-600">{errors.industry.message}</p>}
          </div>

          {message && (
            <p
              className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
            >
              {message.text}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving || !isDirty || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
