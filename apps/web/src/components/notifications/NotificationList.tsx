'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import type { PortalNotification } from './NotificationBell';

interface NotificationListProps {
  notifications: PortalNotification[];
  onMarkRead: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationList({
  notifications,
  onMarkRead,
  onLoadMore,
  hasMore,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        No notifications
      </div>
    );
  }

  return (
    <div className="divide-y">
      {notifications.map((notification) => {
        const isUnread = !notification.readAt;
        return (
          <button
            key={notification.id}
            type="button"
            className={`w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
              isUnread ? 'bg-blue-50/50' : ''
            }`}
            onClick={() => {
              if (isUnread) onMarkRead(notification.id);
            }}
          >
            <div className="flex items-start gap-2">
              {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900`}
                >
                  {notification.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{notification.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatTimeAgo(notification.createdAt)}
                </p>
              </div>
            </div>
          </button>
        );
      })}
      {hasMore && onLoadMore && (
        <div className="p-3 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
