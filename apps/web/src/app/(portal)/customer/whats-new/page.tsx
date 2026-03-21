'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReleaseNote {
  version: string;
  date: string;
  sections: {
    title: string;
    items: string[];
  }[];
}

/**
 * Static release notes. In production these would be fetched from the
 * GitHub Releases API or a CMS. Keeping them inline avoids an external
 * dependency for the initial implementation.
 */
const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.1.0',
    date: '2026-03-21',
    sections: [
      {
        title: 'Features',
        items: [
          'Initial GoLab portal launch with customer, lab, and admin dashboards',
          'Test request wizard with multi-step form and real-time quote calculation',
          'PDF generation for request forms, quotes, invoices, and certificates',
          'Courier integration for sample pickup and tracking',
          'Real-time notifications via email and in-app alerts',
          'Role-based access control with customer, lab, admin, and finance roles',
        ],
      },
    ],
  },
];

const LAST_VIEWED_KEY = 'golab:whats-new:last-viewed';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): string | null {
  return localStorage.getItem(LAST_VIEWED_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

/** Simple markdown-like rendering for bold text and inline code */
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`(.+?)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>',
    );
}

export default function WhatsNewPage() {
  const lastViewed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasMarkedViewed = useRef(false);

  useEffect(() => {
    if (!hasMarkedViewed.current && RELEASE_NOTES.length > 0) {
      const latest = RELEASE_NOTES[0].version;
      if (lastViewed !== latest) {
        localStorage.setItem(LAST_VIEWED_KEY, latest);
      }
      hasMarkedViewed.current = true;
    }
  }, [lastViewed]);

  const latestVersion = RELEASE_NOTES[0]?.version;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{"What's New"}</h1>
        <p className="text-gray-500 mt-1">Stay up to date with the latest improvements to GoLab.</p>
      </div>

      <div className="space-y-4">
        {RELEASE_NOTES.map((release) => {
          const isNew = lastViewed !== null && release.version > lastViewed;
          const isLatest = release.version === latestVersion;

          return (
            <Card key={release.version}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle>v{release.version}</CardTitle>
                  {isLatest && <Badge variant="default">Latest</Badge>}
                  {isNew && <Badge variant="success">New</Badge>}
                  <span className="text-sm text-gray-400 ml-auto">{release.date}</span>
                </div>
              </CardHeader>
              <CardContent>
                {release.sections.map((section) => (
                  <div key={section.title} className="mb-4 last:mb-0">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{section.title}</h3>
                    <ul className="space-y-1.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                          <span dangerouslySetInnerHTML={{ __html: renderMarkdown(item) }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
