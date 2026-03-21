'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage, type ChatMessageSource } from './ChatMessage';
import { HumanEscalation } from './HumanEscalation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatMessageSource[];
}

interface ChatPanelProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export function ChatPanel({ conversationId, onConversationCreated }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Load messages when conversation changes
  useEffect(() => {
    setActiveConversationId(conversationId);
    if (!conversationId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      const res = await fetch(`/api/v1/chat/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map(
            (m: { id: string; role: string; content: string; sources?: ChatMessageSource[] }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              sources: m.sources as ChatMessageSource[] | undefined,
            }),
          ),
        );
      }
    }

    loadMessages();
  }, [conversationId]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      let convId = activeConversationId;

      // Create conversation if needed
      if (!convId) {
        const createRes = await fetch('/api/v1/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmed.slice(0, 100) }),
        });
        if (!createRes.ok) throw new Error('Failed to create conversation');
        const created = await createRes.json();
        convId = created.id as string;
        setActiveConversationId(convId);
        if (convId) onConversationCreated?.(convId);
      }

      const res = await fetch(`/api/v1/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullContent = '';
        let sources: ChatMessageSource[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'text') {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                } else if (parsed.type === 'sources') {
                  sources = parsed.sources;
                }
              } catch {
                // Skip malformed SSE data
              }
            }
          }
        }

        setStreamingContent('');
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: fullContent,
            sources: sources.length > 0 ? sources : undefined,
          },
        ]);
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: data.assistantMessage?.id ?? `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.assistantMessage?.content ?? '',
            sources: data.assistantMessage?.sources,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full items-center justify-center text-center text-gray-400">
            <div>
              <p className="text-lg font-medium">GoLab Support</p>
              <p className="mt-1 text-sm">
                Ask about your testing requests, results, or anything else.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
        ))}
        {streamingContent && (
          <ChatMessage role="assistant" content={streamingContent} isStreaming />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Escalation */}
      {activeConversationId && messages.length >= 4 && (
        <div className="px-4 pb-2">
          <HumanEscalation conversationId={activeConversationId} />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 self-end"
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
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
