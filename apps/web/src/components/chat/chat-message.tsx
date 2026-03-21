'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SourceCitation } from './source-citation';

interface Source {
  sourceType: string;
  sourceId: string;
  distance: number;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, sources, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-3 p-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            'text-xs font-semibold',
            isUser ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700',
          )}
        >
          {isUser ? 'You' : 'GL'}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2.5 text-sm',
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900',
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {isStreaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />}
        {!isUser && sources && sources.length > 0 && <SourceCitation sources={sources} />}
      </div>
    </div>
  );
}
