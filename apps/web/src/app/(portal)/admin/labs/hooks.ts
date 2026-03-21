'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LabQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useLaboratories(params: LabQueryParams) {
  return useQuery({
    queryKey: ['laboratories', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      const res = await fetch(`/api/v1/laboratories?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch laboratories');
      return res.json();
    },
  });
}

export function useLaboratory(id: string) {
  return useQuery({
    queryKey: ['laboratory', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/laboratories/${id}`);
      if (!res.ok) throw new Error('Failed to fetch laboratory');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateLaboratory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/v1/laboratories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to create laboratory');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['laboratories'] });
    },
  });
}

export function useUpdateLaboratory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/v1/laboratories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update laboratory');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['laboratories'] });
      qc.invalidateQueries({ queryKey: ['laboratory'] });
    },
  });
}

export function useDeleteLaboratory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/laboratories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to delete laboratory');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['laboratories'] });
    },
  });
}

export function useLabTests(labId: string) {
  return useQuery({
    queryKey: ['labTests', labId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/laboratories/${labId}/tests`);
      if (!res.ok) throw new Error('Failed to fetch lab tests');
      return res.json();
    },
    enabled: !!labId,
  });
}

export function useSetLabTests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ labId, tests }: { labId: string; tests: unknown[] }) => {
      const res = await fetch(`/api/v1/laboratories/${labId}/tests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tests }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update lab tests');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['labTests', variables.labId] });
      qc.invalidateQueries({ queryKey: ['laboratory'] });
    },
  });
}

export function useAllTests() {
  return useQuery({
    queryKey: ['allTests'],
    queryFn: async () => {
      const res = await fetch('/api/v1/tests?limit=100&activeOnly=true');
      if (!res.ok) throw new Error('Failed to fetch tests');
      return res.json();
    },
  });
}

export function useAllLaboratories() {
  return useQuery({
    queryKey: ['allLaboratories'],
    queryFn: async () => {
      const res = await fetch('/api/v1/laboratories?limit=100&activeOnly=true');
      if (!res.ok) throw new Error('Failed to fetch laboratories');
      return res.json();
    },
  });
}
