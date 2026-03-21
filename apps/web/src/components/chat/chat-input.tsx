'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue('');
    },
    [value, disabled, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about GoLab services..."
        disabled={disabled}
        className="flex-1"
        autoComplete="off"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
