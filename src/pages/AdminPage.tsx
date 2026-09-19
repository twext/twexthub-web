import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../services/api';
import { SourceReviewModal } from '../components/SourceReviewModal';
import { UserActivityModal } from '../components/UserActivityModal';
import { MarkdownEditorModal } from '../components/MarkdownEditorModal';
import { MarkdownView } from '../components/MarkdownView';
import { PrunePanel } from '../components/PrunePanel';
import { AuditPanel } from '../components/AuditPanel';
import { ExportPanel } from '../components/ExportPanel';
import { useConfirm } from '../hooks/useConfirm';
import {
  PendingVersion,
  Extension,
  User,
  InstanceStats,
  Pagination,
  TermsDoc,
  PrivacyDoc,
  UserRole,
} from '../types/api';
import {
  Clock,
  Package,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  Lock,
  Eye,
  Sliders,
  Activity,
  PenLine,
  Wrench,
  Settings as SettingsIcon,
} from 'lucide-react';

interface AdminPageProps {
  onNavigate: (route: string) => void;
}

type AdminTab = 'moderation' | 'catalog' | 'users' | 'policies' | 'maintenance';

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('moderation');
  const [stats, setStats] = useState<InstanceStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Moderation state
  const [pendingVersions, setPendingVersions] = useState<PendingVersion[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingMorePending, setIsLoadingMorePending] = useState(false);
  const [pendingPagination, setPendingPagination] = useState<Pagination>({
    nextCursor: null,
    hasMore: false,
  });
  const [reviewingVersionId, setReviewingVersionId] = useState<string | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<PendingVersion | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPendingDetail, setSelectedPendingDetail] = useState<PendingVersion | null>(null);

  // Catalog state
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isLoadingExtensions, setIsLoadingExtensions] = useState(false);
  const [isLoadingMoreExtensions, setIsLoadingMoreExtensions] = useState(false);
  const [catalogPagination, setCatalogPagination] = useState<Pagination>({
    nextCursor: null,
    hasMore: false,
  });
  const [catalogSearch, setCatalogSearch] = useState('');

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
  const [usersPagination, setUsersPagination] = useState<Pagination>({
    nextCursor: null,
    hasMore: false,
  });
  const [userSearch, setUserSearch] = useState('');
  const [updatingUserNamespace, setUpdatingUserNamespace] = useState<string | null>(null);
  const [activityUser, setActivityUser] = useState<User | null>(null);

  // Policy docs state
  const [termsDoc, setTermsDoc] = useState<TermsDoc | null>(null);
  const [privacyDoc, setPrivacyDoc] = useState<PrivacyDoc | null>(null);
  const [termsText, setTermsText] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [policyEditor, setPolicyEditor] = useState<'terms' | 'privacy' | null>(null);

  // Load stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load moderation queue
  const fetchPending = useCallback(
    async (cursor?: string) => {
      if (cursor) setIsLoadingMorePending(true);
      else setIsLoadingPending(true);
      try {
        const res = await api.listVersionsForReview(cursor ? { cursor } : undefined);
        const page = res?.data || [];
        setPendingVersions((prev) => (cursor ? [...prev, ...page] : page));
        setPendingPagination(res?.pagination || { nextCursor: null, hasMore: false });
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to fetch pending versions';
        toastError(msg);
      } finally {
        if (cursor) setIsLoadingMorePending(false);
        else setIsLoadingPending(false);
      }
    },
    [toastError],
  );

  // Load extensions
  const fetchExtensions = useCallback(
    async (query = '', cursor?: string) => {
      if (cursor) setIsLoadingMoreExtensions(true);
      else setIsLoadingExtensions(true);
      try {
        const res = query
          ? await api.searchExtensions(query, cursor ? { cursor, limit: 50 } : { limit: 50 })
          : await api.getExtensions(cursor ? { cursor, limit: 50 } : { limit: 50 });
        const page = res?.data || [];
        setExtensions((prev) => (cursor ? [...prev, ...page] : page));
        setCatalogPagination(res?.pagination || { nextCursor: null, hasMore: false });
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to fetch extensions';
        toastError(msg);
      } finally {
        if (cursor) setIsLoadingMoreExtensions(false);
        else setIsLoadingExtensions(false);
      }
    },
    [toastError],
  );

  // Load users
  const fetchUsers = useCallback(
    async (cursor?: string) => {
      if (cursor) setIsLoadingMoreUsers(true);
      else setIsLoadingUsers(true);
      try {
        const res = await api.getUsers(cursor ? { cursor, limit: 50 } : { limit: 50 });
        const page = res?.data || [];
        setUsersList((prev) => (cursor ? [...prev, ...page] : page));
        setUsersPagination(res?.pagination || { nextCursor: null, hasMore: false });
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to fetch users';
        toastError(msg);
      } finally {
        if (cursor) setIsLoadingMoreUsers(false);
        else setIsLoadingUsers(false);
      }
    },
    [toastError],
  );

  // Load policies
  const fetchPolicies = useCallback(async () => {
    try {
      const [terms, privacy] = await Promise.all([
        api.getTerms().catch(() => null),
        api.getPrivacy().catch(() => null),
      ]);
      if (terms) {
        setTermsDoc(terms);
        setTermsText(terms.body);
      }
      if (privacy) {
        setPrivacyDoc(privacy);
        setPrivacyText(privacy.body);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchPending();
      fetchExtensions();
      fetchUsers();
      fetchPolicies();
    }
  }, [isAdmin, fetchStats, fetchPending, fetchExtensions, fetchUsers, fetchPolicies]);

  // Handle Review: Approve
  const handleApprove = async (item: PendingVersion) => {
    const targetNs = item.ownerNamespace || item.namespace;
    setReviewingVersionId(item.id + item.version);
    try {
      await api.reviewVersion(targetNs, item.id, item.version, {
        status: 'approved',
      });
      toastSuccess(
        `Version v${item.version} of @${targetNs}/${item.id} has been approved and published!`,
      );
      setPendingVersions((prev) =>
        prev.filter((p) => !(p.id === item.id && p.version === item.version)),
      );
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to approve version';
      toastError(msg);
    } finally {
      setReviewingVersionId(null);
    }
  };

  // Handle Review: Reject
  const handleRejectConfirm = async () => {
    if (!rejectModalItem) return;
    const item = rejectModalItem;
    const targetNs = item.ownerNamespace || item.namespace;
    setReviewingVersionId(item.id + item.version);
    try {
      await api.reviewVersion(targetNs, item.id, item.version, {
        status: 'rejected',
        reason: rejectReason.trim() || 'Submission does not meet registry guidelines.',
      });
      toastSuccess(`Version v${item.version} of @${targetNs}/${item.id} was rejected.`);
      setPendingVersions((prev) =>
        prev.filter((p) => !(p.id === item.id && p.version === item.version)),
      );
      setRejectModalItem(null);
      setRejectReason('');
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to reject version';
      toastError(msg);
    } finally {
      setReviewingVersionId(null);
    }
  };

  // Handle Yank Version
  const handleYankVersion = async (ext: Extension, version: string) => {
    const confirmed = await confirm({
      title: 'Yank version',
      message: `Yank version ${version} of @${ext.namespace}/${ext.id}? This will hide it from registry listings.`,
      confirmLabel: 'Yank version',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.yankVersion(ext.namespace, ext.id, version);
      toastSuccess(`Yanked version ${version} of @${ext.namespace}/${ext.id}.`);
      fetchExtensions(catalogSearch);
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to yank version';
      toastError(msg);
    }
  };

  // Handle Delete Extension
  const handleDeleteExtension = async (ext: Extension) => {
    const packageName = `@${ext.namespace}/${ext.id}`;
    const confirmed = await confirm({
      title: 'Delete extension',
      message: `Permanently delete ${packageName} and all of its versions from the registry. This cannot be undone.`,
      confirmLabel: 'Permanently delete',
      variant: 'danger',
      requireText: packageName,
      requireTextLabel: `Type ${packageName} to confirm deletion`,
    });
    if (!confirmed) return;
    try {
      await api.deleteExtension(ext.namespace, ext.id);
      toastSuccess(`Extension @${ext.namespace}/${ext.id} has been permanently deleted.`);
      setExtensions((prev) =>
        prev.filter((e) => !(e.namespace === ext.namespace && e.id === ext.id)),
      );
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete extension';
      toastError(msg);
    }
  };

  // Handle Change User Role
  const handleToggleUserRole = async (targetUser: User) => {
    const newRole: UserRole = targetUser.role === 'admin' ? 'normal' : 'admin';
    if (targetUser.namespace === user?.namespace && newRole === 'normal') {
      const confirmed = await confirm({
        title: 'Remove your admin role',
        message:
          'You are about to remove administrative permissions from your own account. Continue?',
        confirmLabel: 'Remove admin role',
        variant: 'danger',
      });
      if (!confirmed) return;
    } else {
      const confirmed = await confirm({
        title: newRole === 'admin' ? 'Grant admin role' : 'Revoke admin role',
        message: `Change role for @${targetUser.namespace} to "${newRole}"?`,
        confirmLabel: newRole === 'admin' ? 'Grant admin' : 'Set to normal',
        variant: newRole === 'admin' ? 'default' : 'danger',
      });
      if (!confirmed) return;
    }

    setUpdatingUserNamespace(targetUser.namespace);
    try {
      const updated = await api.updateUserRole(targetUser.namespace, { role: newRole });
      setUsersList((prev) =>
        prev.map((u) =>
          u.namespace === targetUser.namespace ? { ...u, role: updated.role || newRole } : u,
        ),
      );
      toastSuccess(`Updated @${targetUser.namespace}'s role to ${newRole}.`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update user role';
      toastError(msg);
    } finally {
      setUpdatingUserNamespace(null);
    }
  };

  // Handle Delete Account
  const handleDeleteUser = async (targetUser: User) => {
    const confirmed = await confirm({
      title: 'Delete account',
      message: `Permanently delete @${targetUser.namespace} and all of their extensions, versions, sessions, and tokens. This cannot be undone.`,
      confirmLabel: 'Permanently delete',
      variant: 'danger',
      requireText: targetUser.namespace,
      requireTextLabel: `Type ${targetUser.namespace} to confirm account deletion`,
    });
    if (!confirmed) return;
    setUpdatingUserNamespace(targetUser.namespace);
    try {
      await api.deleteUser(targetUser.namespace);
      toastSuccess(`Account @${targetUser.namespace} has been permanently deleted.`);
      setUsersList((prev) => prev.filter((u) => u.namespace !== targetUser.namespace));
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete account';
      toastError(msg);
    } finally {
      setUpdatingUserNamespace(null);
    }
  };

  // Handle Save Terms
  const handleSaveTerms = async (body: string) => {
    setIsSavingTerms(true);
    try {
      const updated = await api.updateTerms(body);
      setTermsDoc(updated);
      setTermsText(updated.body);
      toastSuccess(`Terms of Service updated to revision #${updated.version}.`);
    } finally {
      setIsSavingTerms(false);
    }
  };

  // Handle Save Privacy
  const handleSavePrivacy = async (body: string) => {
    setIsSavingPrivacy(true);
    try {
      const updated = await api.updatePrivacyPolicy(body);
      setPrivacyDoc(updated);
      setPrivacyText(updated.body);
      toastSuccess(`Privacy Policy updated to revision #${updated.version}.`);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  // Permission check
  if (!isAuthLoading && (!isAuthenticated || !isAdmin)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-900/50">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-display font-semibold text-ink mb-2">
          Administrator Access Required
        </h1>
        <p className="text-sm text-ink-3 mb-6 leading-relaxed">
          The administration portal is restricted to accounts with the{' '}
          <code className="chip bg-wash dark:bg-raised border-line text-ink-2 font-mono text-xs">
            admin
          </code>{' '}
          role. Please authenticate with an authorized administrator account to manage moderation,
          extensions, and users.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => onNavigate('home')} className="btn btn-secondary">
            Return to Registry
          </button>
          {!isAuthenticated && (
            <button onClick={() => onNavigate('login')} className="btn btn-primary">
              Sign In as Admin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Header & Live System Status */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-display font-semibold text-ink">Registry Administration</h1>
            <p className="text-xs text-ink-3">
              Authenticated as <strong className="text-ink">@{user?.namespace}</strong> • Server:{' '}
              <span className="font-mono">{api.getBaseUrl()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                if (activeTab === 'moderation') fetchPending();
                if (activeTab === 'catalog') fetchExtensions(catalogSearch);
                if (activeTab === 'users') fetchUsers();
                if (activeTab === 'policies') fetchPolicies();
              }}
              disabled={isLoadingStats || isLoadingPending || isLoadingExtensions}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* System Metric Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line rounded-lg overflow-hidden mt-6">
          <div className="bg-surface p-3.5">
            <div className="label text-ink-3">Pending</div>
            <div className="mt-1 font-mono text-lg font-semibold text-ink">
              {stats?.pending ?? pendingVersions.length}
            </div>
          </div>

          <div className="bg-surface p-3.5">
            <div className="label text-ink-3">Published</div>
            <div className="mt-1 font-mono text-lg font-semibold text-ink">
              {stats?.published ?? extensions.length}
            </div>
          </div>

          <div className="bg-surface p-3.5">
            <div className="label text-ink-3">Authors</div>
            <div className="mt-1 font-mono text-lg font-semibold text-ink">
              {stats?.authors ?? usersList.length}
            </div>
          </div>

          <div className="bg-surface p-3.5">
            <div className="label text-ink-3">Terms revision</div>
            <div className="mt-1 font-mono text-lg font-semibold text-ink">
              v{termsDoc?.version ?? 1}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-line gap-2">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'moderation'
              ? 'border-lilac-500 dark:border-lilac-300 text-lilac-700 dark:text-lilac-300'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Moderation Queue</span>
          {pendingVersions.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-white font-mono font-bold">
              {pendingVersions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'catalog'
              ? 'border-lilac-500 dark:border-lilac-300 text-lilac-700 dark:text-lilac-300'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Extension Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'users'
              ? 'border-lilac-500 dark:border-lilac-300 text-lilac-700 dark:text-lilac-300'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'policies'
              ? 'border-lilac-500 dark:border-lilac-300 text-lilac-700 dark:text-lilac-300'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Platform Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'maintenance'
              ? 'border-lilac-500 dark:border-lilac-300 text-lilac-700 dark:text-lilac-300'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Maintenance</span>
        </button>
      </div>

      {/* Tab 1: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-ink-3">
              {pendingVersions.length} submission{pendingVersions.length === 1 ? '' : 's'} waiting
              for administrative approval.
            </div>
            <button
              onClick={() => fetchPending()}
              disabled={isLoadingPending}
              className="text-xs text-lilac-700 dark:text-lilac-300 hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingPending ? 'animate-spin' : ''}`} />
              <span>Reload Queue</span>
            </button>
          </div>

          {isLoadingPending ? (
            <div className="space-y-3">
              <div className="h-24 card animate-pulse" />
              <div className="h-24 card animate-pulse" />
            </div>
          ) : pendingVersions.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-ink mb-1">Moderation Queue is Clear</h3>
              <p className="text-xs text-ink-3 max-w-sm mx-auto">
                No new extension versions are currently waiting for review. New releases submitted
                with staging status will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVersions.map((item) => {
                const ns = item.ownerNamespace || item.namespace;
                const isWorking = reviewingVersionId === item.id + item.version;
                return (
                  <div
                    key={`${ns}/${item.id}/${item.version}`}
                    className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-lilac-400 dark:hover:border-lilac-700"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-ink">{item.name || item.id}</span>
                        <span className="font-mono text-xs text-ink-3">
                          @{ns}/{item.id}
                        </span>
                        <span className="chip bg-lilac-50 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 border-lilac-200 dark:border-lilac-800 font-mono text-[11px]">
                          v{item.version}
                        </span>
                        {item.license && (
                          <span className="text-[10px] uppercase font-mono bg-wash dark:bg-raised text-ink-2 px-1.5 py-0.5 rounded border border-line">
                            {item.license}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-ink-2 line-clamp-2">{item.description}</p>
                      )}

                      <div className="text-[11px] text-ink-3 flex items-center gap-3">
                        <span>
                          Submitted by <strong className="text-ink-2">@{ns}</strong>
                        </span>
                        {item.createdAt && (
                          <span>• {new Date(item.createdAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedPendingDetail(item)}
                        className="btn btn-sm btn-secondary"
                        title="Inspect source code"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => setRejectModalItem(item)}
                        disabled={isWorking}
                        className="px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 rounded-md font-medium flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isWorking}
                        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isWorking ? 'Approving...' : 'Approve'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pendingPagination.hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={() => fetchPending(pendingPagination.nextCursor || undefined)}
                disabled={isLoadingMorePending}
                className="btn btn-secondary btn-sm disabled:opacity-50"
              >
                {isLoadingMorePending ? 'Loading...' : 'Load more submissions'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Extension Catalog Governance */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchExtensions(catalogSearch);
              }}
              className="relative w-full sm:w-80"
            >
              <input
                type="text"
                placeholder="Search extensions in catalog..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="input pl-8 pr-3 py-1.5 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5" />
            </form>

            <button
              onClick={() => fetchExtensions(catalogSearch)}
              className="text-xs text-lilac-700 dark:text-lilac-300 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Catalog</span>
            </button>
          </div>

          {isLoadingExtensions ? (
            <div className="space-y-2">
              <div className="h-16 bg-wash dark:bg-raised border border-line rounded animate-pulse" />
              <div className="h-16 bg-wash dark:bg-raised border border-line rounded animate-pulse" />
            </div>
          ) : extensions.length === 0 ? (
            <div className="p-8 text-center bg-surface dark:bg-surface border border-line rounded-lg text-xs text-ink-3">
              No extensions found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-line border border-line rounded-lg bg-surface dark:bg-surface overflow-hidden">
              {extensions.map((ext) => (
                <div
                  key={`${ext.namespace}/${ext.id}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-ink">{ext.name}</span>
                      <span className="font-mono text-ink-3">
                        @{ext.namespace}/{ext.id}
                      </span>
                      {ext.latestVersion && (
                        <span className="px-1.5 py-0.2 font-mono text-[10px] bg-wash dark:bg-raised text-ink-2 rounded border border-line">
                          v{ext.latestVersion}
                        </span>
                      )}
                    </div>
                    {ext.description && (
                      <p className="text-ink-2 line-clamp-1 max-w-xl">{ext.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigate(`ext/${ext.namespace}/${ext.id}`)}
                      className="px-2.5 py-1 text-ink-2 bg-wash dark:bg-raised hover:bg-line dark:hover:bg-wash border border-line rounded-md font-medium flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </button>

                    {ext.latestVersion && (
                      <button
                        onClick={() => handleYankVersion(ext, ext.latestVersion!)}
                        className="px-2.5 py-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 rounded-md font-medium"
                        title="Yank latest version from registry"
                      >
                        Yank v{ext.latestVersion}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteExtension(ext)}
                      className="p-1.5 text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-wash dark:hover:bg-raised transition-colors"
                      title="Permanently Delete Extension"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {catalogPagination.hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={() =>
                  fetchExtensions(catalogSearch, catalogPagination.nextCursor || undefined)
                }
                disabled={isLoadingMoreExtensions}
                className="btn btn-secondary btn-sm disabled:opacity-50"
              >
                {isLoadingMoreExtensions ? 'Loading...' : 'Load more extensions'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: User Accounts */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Filter users by namespace..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input pl-8 pr-3 py-1.5 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5" />
            </div>

            <button
              onClick={() => fetchUsers()}
              className="text-xs text-lilac-700 dark:text-lilac-300 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Users</span>
            </button>
          </div>

          {isLoadingUsers ? (
            <div className="space-y-2">
              <div className="h-14 card animate-pulse" />
              <div className="h-14 card animate-pulse" />
            </div>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {usersList
                .filter(
                  (u) =>
                    !userSearch ||
                    u.namespace.toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.displayName &&
                      u.displayName.toLowerCase().includes(userSearch.toLowerCase())),
                )
                .map((u) => {
                  const isTargetAdmin = u.role === 'admin';
                  const isMe = u.namespace === user?.namespace;
                  const isUpdating = updatingUserNamespace === u.namespace;

                  return (
                    <div
                      key={u.namespace}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">@{u.namespace}</span>
                          {u.displayName && <span className="text-ink-2">({u.displayName})</span>}
                          {isTargetAdmin ? (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded">
                              Admin
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 text-[10px] font-medium bg-wash dark:bg-raised text-ink-2 rounded border border-line">
                              User
                            </span>
                          )}
                          {isMe && <span className="text-[10px] text-ink-3 italic">(You)</span>}
                        </div>
                        <div className="text-[11px] text-ink-3 flex items-center gap-2">
                          <span>
                            Terms accepted:{' '}
                            {u.termsAcceptedVersion ? `v${u.termsAcceptedVersion}` : 'None'}
                          </span>
                          {u.createdAt && (
                            <span>• Member since {new Date(u.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isMe ? (
                          <button
                            onClick={() => onNavigate('settings')}
                            className="p-1.5 text-ink-3 hover:text-lilac-700 dark:hover:text-lilac-300 rounded-md hover:bg-wash dark:hover:bg-raised transition-colors"
                            title="Manage your own sessions & tokens in Settings"
                            aria-label="Manage your own sessions and tokens in Settings"
                          >
                            <SettingsIcon className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActivityUser(u)}
                            className="p-1.5 text-ink-3 hover:text-lilac-700 dark:hover:text-lilac-300 rounded-md hover:bg-wash dark:hover:bg-raised transition-colors"
                            title={`Sessions & tokens for @${u.namespace}`}
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleUserRole(u)}
                          disabled={isUpdating}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                            isTargetAdmin
                              ? 'text-ink-2 bg-surface dark:bg-raised border-line hover:bg-wash'
                              : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                          }`}
                        >
                          {isUpdating
                            ? 'Saving...'
                            : isTargetAdmin
                              ? 'Demote to Normal'
                              : 'Promote to Admin'}
                        </button>

                        {!isMe && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isUpdating}
                            className="p-1.5 text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-wash dark:hover:bg-raised transition-colors disabled:opacity-50"
                            title={`Permanently delete @${u.namespace}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {usersPagination.hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={() => fetchUsers(usersPagination.nextCursor || undefined)}
                disabled={isLoadingMoreUsers}
                className="btn btn-secondary btn-sm disabled:opacity-50"
              >
                {isLoadingMoreUsers ? 'Loading...' : 'Load more accounts'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Platform Policies */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terms of Service */}
          <div className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-ink">
                  Terms of Service (v{termsDoc?.version ?? 1})
                </h3>
                <p className="text-[11px] text-ink-3">
                  Publishing a new revision may prompt users to re-accept the updated terms.
                </p>
                {termsDoc?.updatedAt && (
                  <p className="text-[11px] text-ink-3">
                    Last updated {new Date(termsDoc.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPolicyEditor('terms')}
                className="btn btn-primary btn-sm shrink-0"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Open Editor</span>
              </button>
            </div>

            <div className="h-72 overflow-auto border border-line rounded-lg bg-wash dark:bg-raised p-4">
              {termsText ? (
                <MarkdownView content={termsText} />
              ) : (
                <p className="text-xs text-ink-3 italic">No terms of service published yet.</p>
              )}
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-ink">
                  Privacy Policy (v{privacyDoc?.version ?? 1})
                </h3>
                <p className="text-[11px] text-ink-3">
                  Public privacy statement explaining data retention and user privacy commitments.
                </p>
                {privacyDoc?.updatedAt && (
                  <p className="text-[11px] text-ink-3">
                    Last updated {new Date(privacyDoc.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPolicyEditor('privacy')}
                className="btn btn-primary btn-sm shrink-0"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Open Editor</span>
              </button>
            </div>

            <div className="h-72 overflow-auto border border-line rounded-lg bg-wash dark:bg-raised p-4">
              {privacyText ? (
                <MarkdownView content={privacyText} />
              ) : (
                <p className="text-xs text-ink-3 italic">No privacy policy published yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {policyEditor === 'terms' && (
        <MarkdownEditorModal
          title="Terms of Service"
          version={termsDoc?.version ?? 1}
          value={termsText}
          isSaving={isSavingTerms}
          onClose={() => setPolicyEditor(null)}
          onSave={handleSaveTerms}
        />
      )}

      {policyEditor === 'privacy' && (
        <MarkdownEditorModal
          title="Privacy Policy"
          version={privacyDoc?.version ?? 1}
          value={privacyText}
          isSaving={isSavingPrivacy}
          onClose={() => setPolicyEditor(null)}
          onSave={handleSavePrivacy}
        />
      )}

      {/* Tab 5: Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <AuditPanel />
          <ExportPanel />
          <PrunePanel
            currentUserNamespace={user?.namespace}
            onPruned={() => {
              fetchUsers();
              fetchStats();
            }}
          />
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4" />
                <span>Reject Extension Submission</span>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-ink-3 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-2">
              You are rejecting version{' '}
              <strong className="text-ink">v{rejectModalItem.version}</strong> of{' '}
              <strong className="text-ink">
                @{rejectModalItem.ownerNamespace || rejectModalItem.namespace}/{rejectModalItem.id}
              </strong>
              . Provide feedback to the author so they know what needs improvement.
            </p>

            <div className="space-y-1.5">
              <label className="label block">Rejection Reason / Guidance:</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Manifest icon is missing, or code contains undeclared network calls without security justification."
                className="input font-mono p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setRejectModalItem(null)} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button onClick={handleRejectConfirm} className="btn btn-danger btn-sm">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Source Review Modal */}
      {selectedPendingDetail && (
        <SourceReviewModal
          item={selectedPendingDetail}
          onClose={() => setSelectedPendingDetail(null)}
          onApprove={(itm) => {
            setSelectedPendingDetail(null);
            handleApprove(itm);
          }}
          onReject={(itm) => {
            setSelectedPendingDetail(null);
            setRejectModalItem(itm);
          }}
        />
      )}

      {activityUser && (
        <UserActivityModal
          namespace={activityUser.namespace}
          onClose={() => setActivityUser(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
};
