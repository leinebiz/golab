'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateAddressSchema } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { MapPin, Pencil, Trash2, Star } from 'lucide-react';

interface Address {
  id: string;
  type: string;
  line1: string;
  line2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressesSectionProps {
  organizationId: string;
}

const ADDRESS_TYPES = ['BILLING', 'COLLECTION', 'DELIVERY'] as const;
const ADDRESS_TYPE_LABELS: Record<string, string> = {
  BILLING: 'Billing',
  COLLECTION: 'Collection',
  DELIVERY: 'Delivery',
  LAB_RECEIVING: 'Lab Receiving',
};

type AddressType = 'BILLING' | 'COLLECTION' | 'DELIVERY' | 'LAB_RECEIVING';

export function AddressesSection({ organizationId }: AddressesSectionProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(CreateAddressSchema),
    defaultValues: {
      type: 'COLLECTION' as AddressType,
      line1: '',
      line2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'ZA',
      isDefault: false,
    },
  });

  const watchedType = watch('type');

  useEffect(() => {
    async function fetchAddresses() {
      try {
        const res = await fetch(`/api/v1/organizations/${organizationId}/addresses`);
        if (res.ok) {
          const data = await res.json();
          setAddresses(data);
        }
      } catch {
        // Fetch error
      } finally {
        setLoading(false);
      }
    }
    fetchAddresses();
  }, [organizationId]);

  const openCreateDialog = () => {
    setEditingAddress(null);
    reset({
      type: 'COLLECTION' as AddressType,
      line1: '',
      line2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'ZA',
      isDefault: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    reset({
      type: address.type as AddressType,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setDialogOpen(true);
  };

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const action = editingAddress ? 'updateAddress' : 'createAddress';
      const res = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: action,
          ...(editingAddress ? { addressId: editingAddress.id } : {}),
          ...data,
        }),
      });
      if (!res.ok) throw new Error('Failed to save address');
      const saved = (await res.json()) as Address;

      if (editingAddress) {
        setAddresses((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      } else {
        setAddresses((prev) => [saved, ...prev]);
      }
      setDialogOpen(false);
    } catch {
      // Error handling - in production show toast notification
    } finally {
      setSaving(false);
    }
  });

  const deleteAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'deleteAddress', addressId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
    } catch {
      // Error handling
    }
  };

  const setDefault = async (addressId: string) => {
    try {
      const res = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'setDefaultAddress', addressId }),
      });
      if (!res.ok) throw new Error('Failed to set default');
      const updated = (await res.json()) as Address;
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === updated.id) return updated;
          if (a.type === updated.type && a.isDefault) return { ...a, isDefault: false };
          return a;
        }),
      );
    } catch {
      // Error handling
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Addresses</CardTitle>
            <CardDescription>Manage billing, collection, and delivery addresses.</CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm">
            Add Address
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No addresses yet. Add your first address to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={address.isDefault ? 'default' : 'secondary'}>
                          {ADDRESS_TYPE_LABELS[address.type] ?? address.type}
                        </Badge>
                        {address.isDefault && <Badge variant="success">Default</Badge>}
                      </div>
                      <p className="text-sm mt-1">{address.line1}</p>
                      {address.line2 && <p className="text-sm text-gray-500">{address.line2}</p>}
                      <p className="text-sm text-gray-500">
                        {address.city}, {address.province} {address.postalCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDefault(address.id)}
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(address)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAddress(address.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add Address'}</DialogTitle>
            <DialogDescription>
              {editingAddress
                ? 'Update the address details below.'
                : 'Enter the details for the new address.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Address Type</Label>
              <Select value={watchedType} onValueChange={(v) => setValue('type', v as AddressType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ADDRESS_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-600">{errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line1">Address Line 1</Label>
              <Input id="line1" {...register('line1')} />
              {errors.line1 && <p className="text-sm text-red-600">{errors.line1.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line2">Address Line 2</Label>
              <Input id="line2" {...register('line2')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
                {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input id="province" {...register('province')} />
                {errors.province && (
                  <p className="text-sm text-red-600">{errors.province.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" {...register('postalCode')} />
                {errors.postalCode && (
                  <p className="text-sm text-red-600">{errors.postalCode.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingAddress ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
