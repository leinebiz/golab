'use client';

import { useState, useEffect } from 'react';
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

interface OrgOption {
  id: string;
  name: string;
}

interface LabFormDialogProps {
  open: boolean;
  onClose: () => void;
  lab: LabData | null;
}

export function LabFormDialog({ open, onClose, lab }: LabFormDialogProps) {
  const isEditing = !!lab;
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/v1/organizations?type=LAB_PARTNER&limit=100')
      .then((r) => r.json())
      .then((json) => {
        const items = json.data ?? json ?? [];
        setOrgs(items.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })));
      })
      .catch(() => setOrgs([]));
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      const payload: Record<string, unknown> = {
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
          {/* Code — system-generated, read-only when editing */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={lab.code} disabled className="bg-slate-50 text-slate-500" />
              <p className="text-xs text-slate-500">System-generated — cannot be changed</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={lab?.name ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organization</Label>
              {isEditing ? (
                <>
                  <Input
                    value={lab.organizationId}
                    disabled
                    className="bg-slate-50 text-slate-500 text-xs font-mono"
                  />
                  <p className="text-xs text-slate-500">Cannot be changed after creation</p>
                </>
              ) : (
                <select
                  id="organizationId"
                  name="organizationId"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-gray-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>
                    Select organization...
                  </option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={geocoding}
            onClick={async () => {
              const form = document.querySelector('form') as HTMLFormElement | null;
              if (!form) return;
              const address = (new FormData(form).get('address') as string)?.trim();
              if (!address) {
                setError('Enter an address first');
                return;
              }
              setGeocoding(true);
              setError(null);
              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
                  {
                    headers: { 'User-Agent': 'GoLab-Portal/1.0' },
                  },
                );
                const results = await res.json();
                if (results.length === 0) {
                  setError('Address not found — enter coordinates manually');
                  return;
                }
                const latInput = form.querySelector('#lat') as HTMLInputElement;
                const lngInput = form.querySelector('#lng') as HTMLInputElement;
                if (latInput) {
                  latInput.value = parseFloat(results[0].lat).toFixed(6);
                }
                if (lngInput) {
                  lngInput.value = parseFloat(results[0].lon).toFixed(6);
                }
              } catch {
                setError('Geocoding failed — enter coordinates manually');
              } finally {
                setGeocoding(false);
              }
            }}
          >
            {geocoding ? 'Looking up...' : 'Auto-fill coordinates from address'}
          </Button>

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
