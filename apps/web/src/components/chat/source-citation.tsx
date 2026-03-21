'use client';

import React from 'react';

interface Source {
  sourceType: string;
  sourceId: string;
  distance: number;
}

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((source, idx) => (
        <span
          key={`${source.sourceType}-${source.sourceId}-${idx}`}
          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
          title={`Relevance: ${(1 - source.distance).toFixed(2)}`}
        >
          {source.sourceType}/{source.sourceId}
        </span>
      ))}
    </div>
  );
}
