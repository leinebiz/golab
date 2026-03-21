'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface Disclaimer {
  id: string;
  type: string;
  title: string;
  content: string;
  version: number;
  isActive: boolean;
  _count?: { acceptances: number };
  createdAt: string;
  updatedAt: string;
}

const DISCLAIMER_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'SAMPLE_HANDLING',
  'PAYMENT_TERMS',
  'OTHER',
] as const;

export default function DisclaimersPage() {
  const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Disclaimer | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    type: 'TERMS_OF_SERVICE',
    title: '',
    content: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchDisclaimers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/disclaimers');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setDisclaimers(data.disclaimers ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisclaimers();
  }, [fetchDisclaimers]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/disclaimers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setCreating(false);
      setForm({ type: 'TERMS_OF_SERVICE', title: '', content: '', isActive: true });
      await fetchDisclaimers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/disclaimers/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setEditing(null);
      setForm({ type: 'TERMS_OF_SERVICE', title: '', content: '', isActive: true });
      await fetchDisclaimers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disclaimer?')) return;
    try {
      const res = await fetch(`/api/v1/disclaimers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      await fetchDisclaimers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleToggleActive = async (d: Disclaimer) => {
    try {
      const res = await fetch(`/api/v1/disclaimers/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      await fetchDisclaimers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    }
  };

  const startEdit = (d: Disclaimer) => {
    setEditing(d);
    setCreating(false);
    setForm({ type: d.type, title: d.title, content: d.content, isActive: d.isActive });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ type: 'TERMS_OF_SERVICE', title: '', content: '', isActive: true });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditing(null);
    setForm({ type: 'TERMS_OF_SERVICE', title: '', content: '', isActive: true });
  };

  if (loading)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Disclaimers</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Disclaimers</h1>
        {!creating && !editing && (
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Disclaimer
          </button>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {(creating || editing) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Edit Disclaimer' : 'New Disclaimer'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="disc-type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="disc-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {DISCLAIMER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="disc-title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                id="disc-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Disclaimer title"
              />
            </div>
          </div>
          <div>
            <label htmlFor="disc-content" className="block text-sm font-medium text-gray-700">
              Content (Markdown)
            </label>
            <textarea
              id="disc-content"
              rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              placeholder="Enter disclaimer content in markdown..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="disc-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="disc-active" className="text-sm text-gray-700">
              Active
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={editing ? handleUpdate : handleCreate}
              disabled={saving || !form.title || !form.content}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
            <button
              onClick={cancelForm}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Acceptances
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {disclaimers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No disclaimers found. Create one to get started.
                </td>
              </tr>
            )}
            {disclaimers.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {d.type.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{d.title}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">v{d.version}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <button
                    onClick={() => handleToggleActive(d)}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {d.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {d._count?.acceptances ?? 0}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(d)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
