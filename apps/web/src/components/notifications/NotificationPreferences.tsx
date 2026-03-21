'use client';

import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import type { NotificationEventType } from '@/lib/notifications/types';

/** Human-readable labels for event types */
const EVENT_LABELS: Record<NotificationEventType, string> = {
  'quote.ready': 'Quote ready for review',
  'quote.accepted': 'Quote accepted',
  'invoice.generated': 'Invoice generated',
  'payment.confirmed': 'Payment confirmed',
  'credit.approved': 'Credit approved',
  'credit.declined': 'Credit declined',
  'sample.collected': 'Sample collected',
  'sample.delivered': 'Sample delivered to lab',
  'sample.exception': 'Sample issue reported',
  'testing.started': 'Testing started',
  'testing.completed': 'Testing completed',
  'results.ready': 'Results ready',
  'certificate.available': 'Certificate available',
  'request.status_changed': 'Request status changed',
};

const CHANNEL_LABELS = {
  PORTAL: 'Portal',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
} as const;

type ChannelKey = keyof typeof CHANNEL_LABELS;

export interface ChannelPreferences {
  PORTAL: boolean;
  EMAIL: boolean;
  WHATSAPP: boolean;
}

export type NotificationPreferencesMap = Record<string, ChannelPreferences>;

interface NotificationPreferencesProps {
  preferences: NotificationPreferencesMap;
  onChange: (eventType: string, channel: ChannelKey, enabled: boolean) => void;
}

const ALL_EVENTS: NotificationEventType[] = Object.keys(EVENT_LABELS) as NotificationEventType[];
const ALL_CHANNELS: ChannelKey[] = ['PORTAL', 'EMAIL', 'WHATSAPP'];

export function NotificationPreferences({ preferences, onChange }: NotificationPreferencesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose how you want to be notified for each event type.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-3 pr-8 text-left font-medium text-gray-700">Event</th>
              {ALL_CHANNELS.map((ch) => (
                <th key={ch} className="pb-3 text-center font-medium text-gray-700">
                  {CHANNEL_LABELS[ch]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ALL_EVENTS.map((eventType) => {
              const prefs = preferences[eventType] ?? {
                PORTAL: true,
                EMAIL: true,
                WHATSAPP: false,
              };
              return (
                <tr key={eventType}>
                  <td className="py-3 pr-8 text-gray-900">{EVENT_LABELS[eventType]}</td>
                  {ALL_CHANNELS.map((ch) => (
                    <td key={ch} className="py-3 text-center">
                      <Switch
                        checked={prefs[ch]}
                        onCheckedChange={(checked: boolean) => onChange(eventType, ch, checked)}
                        disabled={ch === 'PORTAL'}
                        aria-label={`${EVENT_LABELS[eventType]} via ${CHANNEL_LABELS[ch]}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Portal notifications cannot be disabled. They are always shown in the notification center.
      </p>
    </div>
  );
}
