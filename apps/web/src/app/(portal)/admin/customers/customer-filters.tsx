'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerFiltersProps {
  currentSearch: string;
  currentPayment: string;
}

export function CustomerFilters({ currentSearch, currentPayment }: CustomerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete('page');
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name or registration number..."
          defaultValue={currentSearch}
          onChange={(e) => updateParams('search', e.target.value)}
          className="pl-10"
        />
      </div>
      <Select
        defaultValue={currentPayment}
        onValueChange={(value) => updateParams('payment', value)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Payment type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All payment types</SelectItem>
          <SelectItem value="CREDIT">Credit</SelectItem>
          <SelectItem value="COD">Cash on Delivery</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
