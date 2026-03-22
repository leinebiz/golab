'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RequestsSearchFormProps {
  currentSearch: string;
  tab: string;
}

export function RequestsSearchForm({ currentSearch, tab }: RequestsSearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentSearch);

  const handleSearch = useCallback(
    (searchTerm: string) => {
      const params = new URLSearchParams();
      if (tab && tab !== 'all') params.set('tab', tab);
      if (searchTerm) params.set('search', searchTerm);
      const qs = params.toString();

      startTransition(() => {
        router.push(`/admin/requests${qs ? `?${qs}` : ''}`);
      });
    },
    [router, tab],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearch(value);
      }}
      className="flex flex-col gap-4 sm:flex-row"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by reference or customer..."
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // Debounce-free: search on submit, but also on clear
            if (e.target.value === '' && currentSearch) {
              handleSearch('');
            }
          }}
          className="pl-10"
          disabled={isPending}
        />
      </div>
    </form>
  );
}
