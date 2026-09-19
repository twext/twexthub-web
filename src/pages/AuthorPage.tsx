import React, { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { Extension, Pagination, User } from '../types/api';
import { ExtensionCard } from '../components/ExtensionCard';
import {
  ArrowLeft,
  Calendar,
  Package,
  AlertTriangle,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';

interface AuthorPageProps {
  namespace: string;
  onNavigate: (route: string) => void;
}

export const AuthorPage: React.FC<AuthorPageProps> = ({ namespace, onNavigate }) => {
  const [author, setAuthor] = useState<User | null>(null);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ nextCursor: null, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExtensions = useCallback(
    async (cursor?: string) => {
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await api.searchExtensions(namespace, cursor ? { cursor } : undefined);
        const own = (res.data || []).filter(
          (ext) =>
            ext.namespace === namespace ||
            (typeof ext.author === 'object' && ext.author?.namespace === namespace) ||
            ext.author === namespace,
        );
        setExtensions((prev) => (cursor ? [...prev, ...own] : own));
        setPagination(res.pagination || { nextCursor: null, hasMore: false });
      } catch (err: unknown) {
        setError(err instanceof ApiError ? err.message : 'Failed to load extensions');
        setExtensions([]);
      } finally {
        if (cursor) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [namespace],
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await api.getUser(namespace);
        if (isMounted) setAuthor(profile);
        await loadExtensions();
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof ApiError ? err.message : 'Failed to load author profile');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [namespace, loadExtensions]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-28 bg-wash dark:bg-raised rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-wash dark:bg-raised rounded-lg border border-line animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
        <h2 className="text-xl font-display font-semibold text-ink">Author Not Found</h2>
        <p className="text-xs text-ink-3 max-w-md mx-auto">
          {error || `No account named @${namespace} exists on this Twext instance.`}
        </p>
        <div className="pt-2">
          <button onClick={() => onNavigate('search')} className="btn btn-secondary">
            ← Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => onNavigate('search')}
        className="text-xs text-ink-3 hover:text-ink flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Explore
      </button>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-wash dark:bg-raised border border-line flex items-center justify-center text-ink-2 font-bold text-2xl shrink-0">
            {(author.displayName || author.namespace).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-display font-semibold text-ink">
                {author.displayName || author.namespace}
              </h1>
              <span className="chip bg-wash dark:bg-raised border-line text-ink-2 font-mono text-xs">
                @{author.namespace}
              </span>
              {author.role === 'admin' && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded">
                  Admin
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3 mt-1.5">
              {author.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {new Date(author.createdAt).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {extensions.length}
                {pagination.hasMore ? '+' : ''} published extension
                {extensions.length === 1 && !pagination.hasMore ? '' : 's'}
              </span>
              {!author.hasPublished && (
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  No published releases yet
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <h2 className="text-xl font-display font-semibold text-ink">
            Extensions by @{author.namespace}
          </h2>
          <button
            onClick={() => loadExtensions()}
            className="text-xs text-lilac-700 dark:text-lilac-300 font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {extensions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extensions.map((ext) => (
              <ExtensionCard
                key={`${ext.namespace}/${ext.id}`}
                extension={ext}
                onClick={() => onNavigate(`ext/${ext.namespace}/${ext.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-surface p-5 space-y-2">
            <p className="text-sm font-semibold text-ink">No published extensions</p>
            <p className="text-xs text-ink-3 max-w-lg leading-relaxed">
              @{author.namespace} hasn't published any extensions to this registry yet.
            </p>
          </div>
        )}

        {pagination.hasMore && (
          <div className="pt-2 text-center">
            <button
              onClick={() => loadExtensions(pagination.nextCursor || undefined)}
              disabled={loadingMore}
              className="btn btn-secondary btn-sm disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more extensions'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
