import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { api, ApiError } from '../services/api';
import { Extension, Pagination } from '../types/api';
import { ExtensionCard } from '../components/ExtensionCard';
import { StatusBadge } from '../components/StatusBadge';
import { useSavedExtensions } from '../hooks/useCollections';
import { extensionAuthor } from '../lib/collections';
import {
  EXPLORE_LIMITS,
  ExploreSort,
  ExploreViewMode,
  loadExplorePrefs,
  saveExplorePrefs,
} from '../lib/preferences';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List as ListIcon,
  AlertCircle,
  X,
  User as UserIcon,
  ArrowRight,
  Bookmark,
  ArrowDownWideNarrow,
} from 'lucide-react';

interface ExplorePageProps {
  initialQuery?: string;
  onNavigate: (route: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ initialQuery = '', onNavigate }) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ nextCursor: null, hasMore: false });
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState<number>(() => loadExplorePrefs().limit);
  const [viewMode, setViewMode] = useState<ExploreViewMode>(() => loadExplorePrefs().viewMode);
  const [sort, setSort] = useState<ExploreSort>(() => loadExplorePrefs().sort);
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSaved } = useSavedExtensions();

  useEffect(() => {
    saveExplorePrefs({ viewMode, limit, sort });
  }, [viewMode, limit, sort]);

  const displayedExtensions = useMemo(() => {
    let list = extensions;
    if (savedOnly) {
      list = list.filter((ext) => isSaved(ext.namespace, ext.id));
    }
    if (sort === 'newest') return list;
    return [...list].sort((a, b) => {
      if (sort === 'author') {
        const byAuthor = extensionAuthor(a).localeCompare(extensionAuthor(b));
        if (byAuthor !== 0) return byAuthor;
      }
      return a.name.localeCompare(b.name);
    });
  }, [extensions, savedOnly, sort, isSaved]);

  const fetchExtensions = useCallback(
    async (searchQ: string, cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        let res;
        if (searchQ.trim()) {
          res = await api.searchExtensions(searchQ.trim(), { cursor, limit });
        } else {
          res = await api.getExtensions({ cursor, limit });
        }
        setExtensions(res.data || []);
        setPagination(res.pagination || { nextCursor: null, hasMore: false });
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to load extensions';
        setError(msg);
        setExtensions([]);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    setCurrentCursor(undefined);
    setCursorHistory([]);
    fetchExtensions(activeQuery, undefined);
  }, [activeQuery, limit, fetchExtensions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(query);
  };

  const handleClearSearch = () => {
    setQuery('');
    setActiveQuery('');
  };

  const handleNextPage = () => {
    if (pagination.nextCursor) {
      setCursorHistory((prev) => [...prev, currentCursor || '']);
      setCurrentCursor(pagination.nextCursor);
      fetchExtensions(activeQuery, pagination.nextCursor);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevHistory = [...cursorHistory];
      const prevCursor = prevHistory.pop();
      setCursorHistory(prevHistory);
      const targetCursor = prevCursor || undefined;
      setCurrentCursor(targetCursor);
      fetchExtensions(activeQuery, targetCursor);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Explore Twext Extensions</h1>
          <p className="text-sm text-ink-3 mt-1">
            Browse published packages, search community authors, or discover newly submitted
            TurboWarp plugins.
          </p>
        </div>

        {/* View Switcher, Sort & Filters */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center border border-line rounded-lg bg-surface p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-lilac-50 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-lilac-50 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSavedOnly((v) => !v)}
            aria-pressed={savedOnly}
            title="Show only saved extensions"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border transition-colors ${
              savedOnly
                ? 'border-lilac-300 dark:border-lilac-700 text-lilac-700 dark:text-lilac-300 bg-lilac-50 dark:bg-lilac-950'
                : 'border-line text-ink-2 hover:bg-wash dark:hover:bg-raised'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" fill={savedOnly ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">Saved</span>
          </button>

          <div className="flex items-center gap-1.5 text-sm text-ink-2">
            <ArrowDownWideNarrow className="w-3.5 h-3.5 text-ink-3" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ExploreSort)}
              aria-label="Sort results"
              className="input w-auto px-2 py-1 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="name">Name (A–Z)</option>
              <option value="author">Author</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-ink-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-ink-3" />
            <span className="hidden sm:inline">Per page:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-label="Extensions per page"
              className="input w-auto px-2 py-1 text-sm"
            >
              {EXPLORE_LIMITS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex flex-col gap-2.5">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by extension title, namespace, author, or keywords..."
              className="input pl-9 pr-8 py-2 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-ink-3 hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </form>

        {activeQuery && (
          <div className="flex items-center justify-between text-sm text-ink-2">
            <span>
              Showing results for: <strong className="text-ink">"{activeQuery}"</strong>
            </span>
            <button
              onClick={handleClearSearch}
              className="text-lilac-700 dark:text-lilac-300 hover:underline underline-offset-4 text-xs"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Extensions Listing */}
      <h2 className="sr-only">Results</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-wash dark:bg-raised rounded-lg animate-pulse border border-line"
            />
          ))}
        </div>
      ) : displayedExtensions.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedExtensions.map((ext) => (
              <ExtensionCard
                key={`${ext.namespace}/${ext.id}`}
                extension={ext}
                onClick={() => onNavigate(`ext/${ext.namespace}/${ext.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {displayedExtensions.map((ext) => {
              const authorNamespace =
                typeof ext.author === 'object' && ext.author !== null
                  ? ext.author.namespace
                  : ext.author || ext.namespace;
              const authorDisplayName =
                typeof ext.author === 'object' && ext.author !== null
                  ? ext.author.displayName || authorNamespace
                  : authorNamespace;
              const version =
                ext.latestVersion || (ext.versions && ext.versions[0]?.version) || '1.0.0';

              return (
                <div
                  key={`${ext.namespace}/${ext.id}`}
                  onClick={() => onNavigate(`ext/${ext.namespace}/${ext.id}`)}
                  className="p-4 hover:bg-wash transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-3">
                        @{ext.namespace}/{ext.id}
                      </span>
                      <StatusBadge status={ext.status || 'published'} size="sm" />
                      <span className="chip bg-wash border-line text-ink-2 font-mono text-[11px]">
                        v{version}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-ink hover:text-lilac-700 dark:hover:text-lilac-300">
                      {ext.name}
                    </h3>
                    <p className="text-xs text-ink-2 line-clamp-1">
                      {ext.shortDescription || ext.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-ink-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-ink-3" />
                      <span className="text-ink font-medium">{authorDisplayName}</span>
                    </div>
                    <span className="text-lilac-700 dark:text-lilac-300 font-medium hover:underline inline-flex items-center gap-0.5">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="border border-line rounded-lg bg-surface px-5 py-8">
          <h3 className="text-sm font-semibold text-ink">
            {savedOnly
              ? 'No saved extensions in these results'
              : activeQuery
                ? `No extensions matching "${activeQuery}"`
                : 'No extensions found'}
          </h3>
          <p className="mt-1 text-xs text-ink-3 max-w-md leading-relaxed">
            {savedOnly
              ? 'Tap the bookmark icon on extension cards to save them for later, or turn off the Saved filter.'
              : activeQuery
                ? 'Try checking for typos or searching with broader keywords.'
                : 'The registry currently has no published extensions listed. You can publish the first!'}
          </p>
          {savedOnly ? (
            <button
              onClick={() => setSavedOnly(false)}
              className="mt-3 text-xs font-semibold text-lilac-700 dark:text-lilac-300 hover:underline"
            >
              Show all results
            </button>
          ) : (
            activeQuery && (
              <button
                onClick={handleClearSearch}
                className="mt-3 text-xs font-semibold text-lilac-700 dark:text-lilac-300 hover:underline"
              >
                Clear search filter
              </button>
            )
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-line text-xs">
        <div>
          {cursorHistory.length > 0 && (
            <span className="text-ink-3">Page {cursorHistory.length + 1}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={cursorHistory.length === 0 || loading}
            className="btn btn-secondary btn-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleNextPage}
            disabled={!pagination.hasMore || loading}
            className="btn btn-secondary btn-sm disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
