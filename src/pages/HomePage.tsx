import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { Extension, InstanceStats } from '../types/api';
import { useRecentExtensions } from '../hooks/useCollections';
import {
  Search,
  ArrowRight,
  Package,
  Terminal,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<InstanceStats | null>(null);
  const [recentExtensions, setRecentExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { recent, clear: clearRecent } = useRecentExtensions();

  useEffect(() => {
    let isMounted = true;
    const loadHomeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, extensionsData] = await Promise.all([
          api.getStats().catch(() => ({ published: 0, pending: 0, authors: 0 })),
          api
            .getExtensions({ limit: 6 })
            .catch(() => ({ data: [], pagination: { nextCursor: null, hasMore: false } })),
        ]);

        if (isMounted) {
          setStats(statsData);
          setRecentExtensions(extensionsData.data || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof ApiError ? err.message : 'Failed to connect to Twext server';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onNavigate('search');
    }
  };

  const registryUrl = `${api.getBaseUrl()}/@{namespace}/{id}/versions/{version}/download`;

  return (
    <div className="pb-16">
      {/* Masthead */}
      <section className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-2xl">
            <p className="label mb-4">This is TwextHub</p>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-ink leading-tight text-balance">
              Twext-compiled extensions for TurboWarp
            </h1>
            <p className="mt-3 text-[15px] text-ink-2 leading-relaxed">
              Publish with the Twext CLI, search the catalog by author or keyword, and load
              extensions straight into the TurboWarp editor.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-7 max-w-xl">
              <div className="relative">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, namespace, author, or tag…"
                  className="input pl-10 pr-24 py-3 text-[15px]"
                  aria-label="Search the registry"
                />
                <button type="submit" className="btn btn-primary absolute right-1.5 top-1.5">
                  Search
                </button>
              </div>
            </form>

            {stats && (
              <div className="mt-7 pt-6 border-t border-line">
                <span className="label text-ink-3">This instance</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-sm text-ink-2">
                  <span>
                    <strong className="text-ink font-semibold">{stats.published}</strong> published
                  </span>
                  <span aria-hidden="true" className="text-line">
                    ·
                  </span>
                  <span>
                    <strong className="text-ink font-semibold">{stats.authors}</strong> authors
                  </span>
                  <span aria-hidden="true" className="text-line">
                    ·
                  </span>
                  <span>
                    <strong className="text-ink font-semibold">{stats.pending}</strong> pending
                    review
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error state if server unreachable */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-rose-50 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 p-4 rounded-lg text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <strong>Registry status notice:</strong> {error}
              <p className="mt-1 text-rose-700 dark:text-rose-300">
                Check that the registry server is reachable, or ask the operator to verify the API
                endpoint configured via <code className="font-mono">config.yml</code> or{' '}
                <code className="font-mono">TWEXTHUB_API_URL</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed (local to this browser) */}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ink-3" />
              Recently viewed
            </h2>
            <button
              onClick={clearRecent}
              className="text-xs text-ink-3 hover:text-ink transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => (
              <button
                key={`${item.namespace}/${item.id}`}
                onClick={() => onNavigate(`ext/${item.namespace}/${item.id}`)}
                className="chip bg-surface dark:bg-surface border-line text-ink-2 hover:border-lilac-400 dark:hover:border-lilac-700 hover:text-ink transition-colors font-mono text-xs"
              >
                @{item.namespace}/{item.id}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recently Published */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-display font-semibold text-ink">Recently published</h2>
            <p className="text-sm text-ink-3 mt-0.5">
              Latest releases verified on this registry instance.
            </p>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="text-sm font-medium text-lilac-700 dark:text-lilac-300 hover:text-lilac-700 dark:hover:text-lilac-200 flex items-center gap-1 hover:underline underline-offset-4 shrink-0"
          >
            <span>View all extensions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="border border-line rounded-lg bg-surface divide-y divide-line overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-wash dark:bg-raised" />
            ))}
          </div>
        ) : recentExtensions.length > 0 ? (
          <div className="border border-line rounded-lg bg-surface divide-y divide-line overflow-hidden">
            {recentExtensions.map((ext) => {
              const authorNamespace =
                typeof ext.author === 'object' && ext.author !== null
                  ? ext.author.namespace
                  : ext.author || ext.namespace;
              const version =
                ext.latestVersion || (ext.versions && ext.versions[0]?.version) || '1.0.0';

              return (
                <button
                  key={`${ext.namespace}/${ext.id}`}
                  onClick={() => onNavigate(`ext/${ext.namespace}/${ext.id}`)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-wash dark:hover:bg-raised transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-ink font-semibold truncate">{ext.name}</span>
                    <span className="font-mono text-xs text-ink-3 truncate">
                      @{ext.namespace}/{ext.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs text-ink-3">v{version}</span>
                    <span className="hidden sm:inline text-ink-3 font-medium">
                      by {authorNamespace}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-surface px-5 py-6">
            <h3 className="text-base font-semibold text-ink">No extensions published yet</h3>
            <p className="mt-1 text-sm text-ink-3 leading-relaxed max-w-lg">
              Be the first to publish a Twext TurboWarp extension on this instance using the Twext
              CLI.
            </p>
            <div className="mt-3.5 flex items-center gap-2">
              <button onClick={() => onNavigate('search')} className="btn btn-ghost btn-sm">
                Browse Extensions
              </button>
            </div>
          </div>
        )}
      </section>

      {/* How to Publish & Install */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
          <div className="bg-surface p-6">
            <div className="flex items-center gap-2 text-ink font-semibold text-base">
              <Terminal className="w-4 h-4 text-lilac-700 dark:text-lilac-300" />
              <h3>Publish with the Twext CLI</h3>
            </div>
            <p className="mt-2 text-sm text-ink-2 leading-relaxed">
              Twext extensions are compiled locally with the Twext tooling and uploaded using
              standard registry commands:
            </p>
            <div className="mt-4 bg-zinc-950 text-zinc-100 p-4 rounded-lg font-mono text-sm space-y-2">
              <div className="text-zinc-500"># Authenticate with Twext</div>
              <div className="text-emerald-400">twext login</div>
              <div className="text-zinc-500 mt-2"># Compile & submit extension</div>
              <div className="text-emerald-400">twext publish</div>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              New publishers' first submissions are reviewed by an administrator before appearing
              publicly.
            </p>
          </div>

          <div className="bg-surface p-6">
            <div className="flex items-center gap-2 text-ink font-semibold text-base">
              <Package className="w-4 h-4 text-lilac-700 dark:text-lilac-300" />
              <h3>Install in TurboWarp</h3>
            </div>
            <p className="mt-2 text-sm text-ink-2 leading-relaxed">
              Load an extension in the TurboWarp editor using its registry URL:
            </p>
            <div className="mt-4 bg-wash dark:bg-raised border border-line p-4 rounded-lg text-sm space-y-2 font-mono">
              <div className="text-ink-2 font-sans text-xs">
                1. Open TurboWarp → <strong>Add Extension</strong> →{' '}
                <strong>Custom Extension</strong>
              </div>
              <div className="text-ink bg-surface dark:bg-surface p-2 border border-line rounded break-all select-all text-xs">
                {registryUrl}
              </div>
            </div>
            <div className="mt-3">
              <a
                href="https://turbowarp.org/editor"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-lilac-700 dark:text-lilac-300 hover:underline underline-offset-4 inline-flex items-center gap-1"
              >
                Open TurboWarp Editor <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
