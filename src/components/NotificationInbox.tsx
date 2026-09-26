import React, { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { Notification, NotificationKind } from '../types/api';
import { AlertCircle, Bell, CheckCheck, ExternalLink, X } from 'lucide-react';

const KIND_STYLES: Record<NotificationKind, string> = {
  'review.approved':
    'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  'review.rejected':
    'bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  'terms.bumped':
    'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  'tokens.revoked':
    'bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  'role.changed':
    'bg-lilac-50 dark:bg-lilac-950 text-lilac-700 dark:text-lilac-300 border-lilac-200 dark:border-lilac-800/60',
  broadcast:
    'bg-lilac-50 dark:bg-lilac-950 text-lilac-700 dark:text-lilac-300 border-lilac-200 dark:border-lilac-800/60',
  'extension.owner.added':
    'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  'extension.owner.removed':
    'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
};

/** Notifications that point at a package link straight to its detail page. */
const extensionRef = (payload: Record<string, unknown>) => {
  const namespace = payload.namespace;
  const id = payload.id;
  if (typeof namespace !== 'string' || typeof id !== 'string') return null;
  return `ext/${namespace}/${id}`;
};

interface NotificationInboxProps {
  onClose: () => void;
  onNavigate: (route: string) => void;
  onUnreadChange: (count: number) => void;
}

export const NotificationInbox: React.FC<NotificationInboxProps> = ({
  onClose,
  onNavigate,
  onUnreadChange,
}) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(
    async (onlyUnread = unreadOnly) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getNotifications({ limit: 20, unreadOnly: onlyUnread });
        setItems(res.data || []);
        setUnreadCount(res.unreadCount || 0);
        onUnreadChange(res.unreadCount || 0);
      } catch (err: unknown) {
        setError(err instanceof ApiError ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    },
    [unreadOnly, onUnreadChange],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const applyRead = (updated: number) => {
    setUnreadCount((prev) => Math.max(0, prev - updated));
    onUnreadChange(Math.max(0, unreadCount - updated));
  };

  const handleMarkAll = async () => {
    setMarking(true);
    setError(null);
    try {
      const updated = await api.markNotificationsRead({ all: true });
      await load();
      if (updated > 0) {
        setUnreadCount(0);
        onUnreadChange(0);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark notifications read');
    } finally {
      setMarking(false);
    }
  };

  const handleMarkOne = async (notification: Notification) => {
    if (notification.read) return;
    setError(null);
    try {
      const updated = await api.markNotificationsRead({ ids: [notification.id] });
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      if (updated > 0) applyRead(updated);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark notification read');
    }
  };

  const openTarget = (notification: Notification) => {
    const route = extensionRef(notification.payload);
    if (!route) return;
    onNavigate(route);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="card max-w-xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Bell className="w-4 h-4 text-lilac-500 dark:text-lilac-300" />
            Notifications
            {unreadCount > 0 && (
              <span className="chip bg-lilac-100 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 border-lilac-200 dark:border-lilac-800 font-mono">
                {unreadCount} unread
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-3 hover:text-ink p-1 rounded-md hover:bg-wash transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded accent-lilac-500"
            />
            Unread only
          </label>
          <button
            onClick={handleMarkAll}
            disabled={marking || unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-2 border border-line rounded-lg hover:bg-wash dark:hover:bg-raised transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {marking ? 'Marking...' : 'Mark all read'}
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            <div className="h-14 bg-wash dark:bg-raised rounded animate-pulse" />
            <div className="h-14 bg-wash dark:bg-raised rounded animate-pulse" />
          </div>
        ) : items.length > 0 ? (
          <div className="divide-y divide-line border border-line rounded-lg">
            {items.map((notification) => {
              const route = extensionRef(notification.payload);
              return (
                <div
                  key={notification.id}
                  className={`p-3 flex items-start justify-between gap-3 text-xs ${
                    notification.read
                      ? 'bg-surface dark:bg-raised'
                      : 'bg-lilac-50/50 dark:bg-lilac-950/30'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${KIND_STYLES[notification.kind]}`}>
                        {notification.kind}
                      </span>
                      {!notification.read && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-lilac-500"
                          aria-label="Unread"
                        />
                      )}
                      <span className="text-[11px] text-ink-3">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-ink-2 leading-relaxed">{notification.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {route && (
                      <button
                        onClick={() => openTarget(notification)}
                        title="Open the extension"
                        aria-label="Open the extension"
                        className="p-1.5 text-ink-3 hover:text-lilac-700 dark:hover:text-lilac-300 rounded-md hover:bg-wash transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkOne(notification)}
                      disabled={notification.read}
                      title={notification.read ? 'Already read' : 'Mark as read'}
                      aria-label={`Mark notification ${notification.id} as read`}
                      className="p-1.5 text-ink-3 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-wash transition-colors disabled:opacity-40"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-ink-3 py-2">
            {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        )}
      </div>
    </div>
  );
};
