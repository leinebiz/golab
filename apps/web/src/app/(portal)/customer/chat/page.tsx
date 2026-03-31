'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { cn } from '@/lib/utils';

interface ConversationSummary {
  id: string;
  title: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

// Simple external store for conversations to avoid setState-in-effect
let conversationCache: ConversationSummary[] = [];
let listeners: Array<() => void> = [];

function subscribeConversations(callback: () => void) {
  listeners.push(callback);
  // Fetch on first subscribe
  if (listeners.length === 1) {
    fetchConversations();
  }
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getConversationsSnapshot() {
  return conversationCache;
}

function getConversationsServerSnapshot() {
  return [] as ConversationSummary[];
}

function fetchConversations() {
  fetch('/api/v1/chat/conversations')
    .then((res) => (res.ok ? res.json() : []))
    .then((data: ConversationSummary[]) => {
      conversationCache = data;
      for (const l of listeners) l();
    })
    .catch((err) => {
      console.error('chat.fetchConversations.failed', err);
    });
}

export default function SupportChatPage() {
  const conversations = useSyncExternalStore(
    subscribeConversations,
    getConversationsSnapshot,
    getConversationsServerSnapshot,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleNewConversation() {
    setActiveId(null);
  }

  const handleConversationCreated = useCallback((id: string) => {
    setActiveId(id);
    fetchConversations();
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col border-r border-gray-200 bg-gray-50 transition-all',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden',
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Button variant="outline" size="sm" onClick={handleNewConversation}>
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-400">No conversations yet</p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={cn(
                'flex w-full flex-col gap-1 border-b border-gray-100 p-3 text-left hover:bg-gray-100',
                activeId === conv.id && 'bg-blue-50 hover:bg-blue-50',
              )}
            >
              <span className="truncate text-sm font-medium">
                {conv.title ?? 'Untitled conversation'}
              </span>
              <span className="text-xs text-gray-400">
                {conv._count.messages} message{conv._count.messages !== 1 ? 's' : ''}
                {conv.isResolved && ' (resolved)'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </Button>
          <h1 className="text-lg font-bold">Support Chat</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatPanel conversationId={activeId} onConversationCreated={handleConversationCreated} />
        </div>
      </div>
    </div>
  );
}
