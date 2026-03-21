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
import { Switch } from '@/components/ui/switch';

interface LabData {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  location: { lat: number; lng: number; address: string };
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
}

interface LabFormDialogProps {
  open: boolean;
  onClose: () => void;
  lab: LabData | null;
}

export function LabFormDialog({ open, onClose, lab }: LabFormDialogProps) {
  const isEditing = !!lab;
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
        organizationId: formData.get('organizationId') as string,
        location: {
          lat: parseFloat(formData.get('lat') as string),
          lng: parseFloat(formData.get('lng') as string),
          address: formData.get('address') as string,
        },
        contactEmail: formData.get('contactEmail') as string,
        contactPhone: formData.get('contactPhone') as string,
        isActive: formData.get('isActive') === 'on',
      };

      const url = isEditing ? `/api/v1/laboratories/${lab.id}` : '/api/v1/laboratories';
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
          <DialogTitle>{isEditing ? 'Edit Laboratory' : 'Add Laboratory'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update laboratory details.' : 'Register a new partner laboratory.'}
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
                defaultValue={lab?.code ?? ''}
                required
                placeholder="e.g. LAB-JHB-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={lab?.name ?? ''} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationId">Organization ID</Label>
            <Input
              id="organizationId"
              name="organizationId"
              defaultValue={lab?.organizationId ?? ''}
              required
              placeholder="Organization CUID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              defaultValue={lab?.location?.address ?? ''}
              required
              placeholder="Full street address"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                name="lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                defaultValue={lab?.location?.lat ?? ''}
                required
                placeholder="-33.9249"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                name="lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={lab?.location?.lng ?? ''}
                required
                placeholder="18.4241"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={lab?.contactEmail ?? ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                defaultValue={lab?.contactPhone ?? ''}
                required
                placeholder="+27..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Switch id="isActive" name="isActive" defaultChecked={lab?.isActive ?? true} />
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
