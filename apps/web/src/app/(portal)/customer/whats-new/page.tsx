'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Wrench, Bug, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  type: 'feature' | 'improvement' | 'fix';
}

const TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; className: string }> = {
  feature: { icon: Sparkles, label: 'New Feature', className: 'bg-blue-100 text-blue-800' },
  improvement: { icon: Wrench, label: 'Improvement', className: 'bg-green-100 text-green-800' },
  fix: { icon: Bug, label: 'Bug Fix', className: 'bg-amber-100 text-amber-800' },
};

export default function WhatsNewPage() {
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [lastViewed, setLastViewed] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/whats-new')
      .then((res) => res.json())
      .then((json) => {
        setReleases(json.data?.releases ?? []);
        setLastViewed(json.data?.lastViewedVersion ?? null);
        const latest = json.data?.latestVersion;
        if (latest) setExpanded(new Set([latest]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (version: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  };

  const markAllRead = async () => {
    const latest = releases[0]?.version;
    if (!latest) return;
    try {
      const res = await fetch('/api/v1/whats-new/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: latest }),
      });
      if (res.ok) setLastViewed(latest);
    } catch {
      // silent
    }
  };

  const isUnread = (version: string): boolean => {
    if (!lastViewed) return true;
    return version > lastViewed;
  };

  const unreadCount = releases.filter((r) => isUnread(r.version)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">What&apos;s New</h1>
          <p className="mt-1 text-sm text-gray-500">
            Stay up to date with the latest platform updates
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Check className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {releases.length === 0 && (
        <p className="py-8 text-center text-gray-500">No release notes yet.</p>
      )}

      <div className="space-y-4">
        {releases.map((release) => {
          const config = TYPE_CONFIG[release.type] ?? TYPE_CONFIG.feature;
          const Icon = config.icon;
          const open = expanded.has(release.version);
          const unread = isUnread(release.version);

          return (
            <div
              key={release.version}
              className={`rounded-lg border ${unread ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'}`}
            >
              <button
                onClick={() => toggleExpand(release.version)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {unread && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">v{release.version}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {release.title} &middot; {release.date}
                    </p>
                  </div>
                </div>
                {open ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {open && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <ul className="space-y-1.5">
                    {release.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
