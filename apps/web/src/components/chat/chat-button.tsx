'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { ChatPanel } from './chat-panel';

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating action button — hidden when panel is open */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
