'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TestQueryParams {
  search?: string;
  category?: string;
  accreditation?: string;
  page?: number;
  limit?: number;
}

export function useTests(params: TestQueryParams) {
  return useQuery({
    queryKey: ['tests', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      if (params.category) sp.set('category', params.category);
      if (params.accreditation) sp.set('accreditation', params.accreditation);
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      const res = await fetch(`/api/v1/tests?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tests');
      return res.json();
    },
  });
}

export function useTest(id: string) {
  return useQuery({
    queryKey: ['test', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/tests/${id}`);
      if (!res.ok) throw new Error('Failed to fetch test');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/v1/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to create test');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] });
    },
  });
}

export function useUpdateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/v1/tests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update test');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] });
      qc.invalidateQueries({ queryKey: ['test'] });
    },
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/tests/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to delete test');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] });
    },
  });
}
