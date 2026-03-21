'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { X, LifeBuoy, Minimize2 } from 'lucide-react';

interface Source {
  sourceType: string;
  sourceId: string;
  distance: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createConversation = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/v1/chat', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create conversation');
    const data = await res.json();
    const id = data.id as string;
    setConversationId(id);
    return id;
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      try {
        const convId = conversationId ?? (await createConversation());

        const res = await fetch(`/api/v1/chat/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!res.ok || !res.body) {
          throw new Error('Failed to send message');
        }

        // Stream the response
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
        };
        setMessages((prev) => [...prev, assistantMsg]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);
              if (event.type === 'sources') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      sources: event.sources,
                    };
                  }
                  return updated;
                });
              } else if (event.type === 'text') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    };
                  }
                  return updated;
                });
              }
              // event.type === 'done' or 'error' — streaming ends naturally
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again or escalate to human support.',
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error('Chat error:', err);
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, isStreaming, createConversation],
  );

  const handleEscalate = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await fetch('/api/v1/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'escalate',
        }),
      });
      if (res.ok) {
        setEscalated(true);
        const sysMsg: Message = {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content:
            'This conversation has been escalated to human support. A support agent will follow up with you shortly.',
        };
        setMessages((prev) => [...prev, sysMsg]);
      }
    } catch {
      // Escalation failed silently — the user can retry
    }
  }, [conversationId]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col rounded-lg border bg-white shadow-2xl',
        // Desktop: bottom-right panel
        'bottom-4 right-4 h-[600px] w-[400px]',
        // Mobile: full-screen
        'max-md:inset-0 max-md:h-full max-md:w-full max-md:rounded-none',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">GoLab Assistant</h2>
          <p className="text-xs text-gray-500">AI-powered support</p>
        </div>
        <div className="flex gap-1">
          {conversationId && !escalated && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEscalate}
              title="Escalate to human support"
              className="h-8 w-8"
            >
              <LifeBuoy className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close chat"
            className="h-8 w-8"
          >
            <span className="hidden md:block">
              <Minimize2 className="h-4 w-4" />
            </span>
            <span className="md:hidden">
              <X className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
              <p className="text-sm font-medium">Welcome to GoLab Support</p>
              <p className="mt-1 text-xs">
                Ask me about requests, test statuses, invoices, or anything GoLab-related.
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
              isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming || escalated} />
    </div>
  );
}
