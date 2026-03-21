'use client';

import { Download } from 'lucide-react';
import { useCallback } from 'react';

export interface CsvExportButtonProps {
  data: Array<Record<string, unknown>>;
  filename: string;
  headers?: Record<string, string>;
}

function escapeCsvField(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n'))
    return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function CsvExportButton({ data, filename, headers }: CsvExportButtonProps) {
  const handleExport = useCallback(() => {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const headerRow = keys.map((k) => escapeCsvField(headers?.[k] ?? k)).join(',');
    const rows = data.map((row) => keys.map((k) => escapeCsvField(row[k])).join(','));
    const csv = [headerRow, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, filename, headers]);

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
