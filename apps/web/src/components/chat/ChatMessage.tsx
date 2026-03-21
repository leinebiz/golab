'use client';

import { cn } from '@/lib/utils';

export interface ChatMessageSource {
  sourceType: string;
  sourceId: string;
}

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatMessageSource[];
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, sources, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex w-full gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
          G
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 text-sm',
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900',
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {isStreaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />}
        {sources && sources.length > 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            <p className="text-xs font-medium text-gray-500">Sources:</p>
            <ul className="mt-1 space-y-0.5">
              {sources.map((source, idx) => (
                <li key={idx} className="text-xs text-gray-400">
                  {source.sourceType}/{source.sourceId}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
          U
        </div>
      )}
    </div>
  );
}
