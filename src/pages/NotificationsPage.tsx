import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../services/api';
import { Notification, NotificationKind, Pagination } from '../types/api';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  FileText,
  KeyRound,
  Megaphone,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';

interface NotificationsPageProps {
  onNavigate: (route: string) => void;
}

const PAGE_SIZE = 25;

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: React.ElementType; iconClass: string }
> = {
  'review.approved': {
    label: 'Version approved',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  'review.rejected': {
    label: 'Version rejected',
    icon: XCircle,
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  'terms.bumped': {
    label: 'Terms updated',
    icon: FileText,
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  'tokens.revoked': {
    label: 'Credentials revoked',
    icon: KeyRound,
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  'role.changed': {
    label: 'Role changed',
    icon: Shield,
    iconClass: 'text-lilac-600 dark:text-lilac-300',
  },
  broadcast: {
    label: 'Broadcast',
    icon: Megaphone,
    iconClass: 'text-lilac-600 dark:text-lilac-300',
  },
};

const UNKNOWN_KIND_META = { label: 'Notification' };

function kindMeta(kind: NotificationKind) {
  return KIND_META[kind] ?? { ...UNKNOWN_KIND_META, icon: Bell, iconClass: 'text-ink-3' };
}

function notificationTarget(n: Notification): string | null {
  if (
    (n.kind === 'review.approved' || n.kind === 'review.rejected') &&
    n.payload.namespace &&
    n.payload.id
  ) {
    return `ext/${n.payload.namespace}/${n.payload.id}`;
  }
  return null;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ nextCursor: null, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(
    async (cursor?: string) => {
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await api.getNotifications({
          cursor,
          limit: PAGE_SIZE,
          unread: unreadOnly || undefined,
        });
        const page = res?.data || [];
        setNotifications((prev) => (cursor ? [...prev, ...page] : page));
        setPagination(res?.pagination || { nextCursor: null, hasMore: false });
        setUnreadCount(res?.unreadCount ?? 0);
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to fetch notifications';
        toastError(msg);
      } finally {
        if (cursor) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [toastError, unreadOnly],
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      onNavigate('login');
      return;
    }
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, isLoading, onNavigate, loadNotifications]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <div className="h-16 bg-wash dark:bg-raised rounded-lg animate-pulse" />
        <div className="h-24 card animate-pulse" />
        <div className="h-24 card animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-xs text-ink-3">Redirecting to login...</p>
      </div>
    );
  }

  const markRead = async (n: Notification) => {
    setMarkingId(n.id);
    try {
      await api.markNotificationsRead({ ids: [n.id] });
      if (unreadOnly) {
        setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      } else {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      }
      setUnreadCount((count) => Math.max(0, count - 1));
      toastSuccess('Notification marked as read.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to mark notification as read';
      toastError(msg);
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markNotificationsRead({ all: true });
      if (unreadOnly) {
        setNotifications([]);
      } else {
        setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      }
      setUnreadCount(0);
      toastSuccess('All notifications marked as read.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to mark notifications as read';
      toastError(msg);
    } finally {
      setMarkingAll(false);
    }
  };

  const isEmpty = !loading && notifications.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink flex items-center gap-2">
            <Bell className="w-5 h-5 text-lilac-500" />
            Notifications
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Review decisions, terms updates, role changes, and admin broadcasts for @
            {user.namespace}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadNotifications()}
            disabled={loading}
            className="p-2 text-ink-3 hover:text-ink rounded-lg hover:bg-wash transition-colors"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
            className="btn btn-secondary btn-sm disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{markingAll ? 'Marking...' : 'Mark all read'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded accent-lilac-500"
          />
          <span>Unread only</span>
        </label>

        <span
          className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-full border ${
            unreadCount > 0
              ? 'bg-lilac-100 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 border-lilac-200 dark:border-lilac-800'
              : 'bg-wash dark:bg-raised text-ink-3 border-line'
          }`}
        >
          {unreadCount} unread
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 card animate-pulse" />
          <div className="h-24 card animate-pulse" />
        </div>
      ) : isEmpty ? (
        <div className="card p-10 text-center">
          <Bell className="w-9 h-9 text-ink-3 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-ink mb-1">
            {unreadOnly ? 'No unread notifications' : 'Your inbox is empty'}
          </h2>
          <p className="text-xs text-ink-3 max-w-sm mx-auto">
            {unreadOnly
              ? 'You are all caught up. Uncheck "Unread only" to see your full mailbox.'
              : 'Review decisions, terms updates, and admin broadcasts will land here.'}
          </p>
          {unreadOnly && (
            <button onClick={() => setUnreadOnly(false)} className="btn btn-primary btn-sm mt-4">
              Show all notifications
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const meta = kindMeta(n.kind);
            const Icon = meta.icon;
            const target = notificationTarget(n);
            const isMarking = markingId === n.id;
            return (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-3 transition-colors ${
                  !n.read ? 'border-lilac-300 dark:border-lilac-700' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg bg-wash dark:bg-raised border border-line flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${meta.iconClass}`} />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink">{meta.label}</span>
                    {!n.read ? (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wide bg-lilac-100 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 border border-lilac-200 dark:border-lilac-800 rounded">
                        New
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[10px] font-medium bg-wash dark:bg-raised text-ink-3 rounded border border-line">
                        Read
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-2 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-ink-3 flex-wrap">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {target && (
                      <button
                        onClick={() => onNavigate(target)}
                        className="text-lilac-700 dark:text-lilac-300 hover:underline font-medium"
                      >
                        View @{n.payload.namespace}/{n.payload.id}
                      </button>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n)}
                        disabled={isMarking}
                        className="text-lilac-700 dark:text-lilac-300 hover:underline font-medium disabled:opacity-50"
                      >
                        {isMarking ? 'Marking...' : 'Mark read'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={() => loadNotifications(pagination.nextCursor || undefined)}
            disabled={loadingMore}
            className="btn btn-secondary btn-sm disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more notifications'}
          </button>
        </div>
      )}
    </div>
  );
};
