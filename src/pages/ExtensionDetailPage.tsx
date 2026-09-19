import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import { useRecentExtensions, useSavedExtensions } from '../hooks/useCollections';
import { Extension, VersionInfo } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { VersionCompareModal } from '../components/VersionCompareModal';
import {
  User as UserIcon,
  Copy,
  Check,
  Calendar,
  Clock,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Ban,
  Trash2,
  ShieldAlert,
  Info,
  Bookmark,
  GitCompare,
} from 'lucide-react';

interface ExtensionDetailPageProps {
  namespace: string;
  id: string;
  onNavigate: (route: string) => void;
}

export const ExtensionDetailPage: React.FC<ExtensionDetailPageProps> = ({
  namespace,
  id,
  onNavigate,
}) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const { isSaved, toggle } = useSavedExtensions();
  const { record } = useRecentExtensions();
  const [extension, setExtension] = useState<Extension | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [yankingVersion, setYankingVersion] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<VersionInfo | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [versionDetailError, setVersionDetailError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchExtension = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getExtension(namespace, id);
        if (isMounted) {
          setExtension(data);
          record(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof ApiError ? err.message : 'Failed to load extension details';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExtension();
    return () => {
      isMounted = false;
    };
  }, [namespace, id, record]);

  const ownerNamespace = extension?.namespace || namespace;
  const authorNamespace =
    typeof extension?.author === 'object' && extension.author !== null
      ? extension.author.namespace || ownerNamespace
      : ownerNamespace;

  const authorDisplayName =
    typeof extension?.author === 'object' && extension.author !== null
      ? extension.author.displayName || authorNamespace
      : extension?.author || authorNamespace;

  const latestVersion =
    extension?.latestVersion || (extension?.versions && extension.versions[0]?.version) || '1.0.0';

  const moderationStatus = extension?.status || 'published';
  const isPending = moderationStatus === 'pending';

  const publishedVersion =
    extension?.versions?.find((v) => v.status === 'published')?.version || extension?.latestVersion;
  const loadUrl =
    moderationStatus === 'published' && publishedVersion
      ? `${api.getBaseUrl()}/@${namespace}/${id}/versions/${encodeURIComponent(publishedVersion)}/download`
      : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleToggleVersion = async (version: string) => {
    if (expandedVersion === version) {
      setExpandedVersion(null);
      return;
    }
    setExpandedVersion(version);
    setVersionDetail(null);
    setVersionDetailError(null);
    setLoadingVersion(true);
    try {
      const detail = await api.getVersion(namespace, id, version);
      setVersionDetail(detail);
    } catch (err: unknown) {
      setVersionDetailError(
        err instanceof ApiError ? err.message : 'Failed to load version metadata',
      );
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleYankVersion = async (version: string) => {
    if (!extension) return;
    const confirmed = await confirm({
      title: 'Yank version',
      message: `Yank version ${version} of @${extension.namespace}/${extension.id}? It will be hidden from the registry and can no longer be installed.`,
      confirmLabel: 'Yank version',
      variant: 'danger',
    });
    if (!confirmed) return;

    setYankingVersion(version);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.yankVersion(extension.namespace, extension.id, version);
      // The detail endpoint only returns published versions, so update the local
      // copy optimistically instead of refetching (which would drop the row and,
      // if it was the last published version, turn the page into a 404).
      setExtension((prev) =>
        prev
          ? {
              ...prev,
              versions: prev.versions?.map((v) =>
                v.version === version ? { ...v, status: 'yanked' as const } : v,
              ),
            }
          : prev,
      );
      setActionSuccess(`Version ${version} has been yanked.`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to yank version';
      setActionError(msg);
    } finally {
      setYankingVersion(null);
    }
  };

  const handleDeleteExtension = async () => {
    if (!extension) return;
    const packageName = `@${extension.namespace}/${extension.id}`;
    const confirmed = await confirm({
      title: 'Delete extension',
      message: `Permanently delete ${packageName} and all of its versions. This cannot be undone.`,
      confirmLabel: 'Permanently delete',
      variant: 'danger',
      requireText: packageName,
      requireTextLabel: `Type ${packageName} to confirm deletion`,
    });
    if (!confirmed) return;

    setDeleting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.deleteExtension(extension.namespace, extension.id);
      onNavigate('dashboard');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete extension';
      setActionError(msg);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-6 w-32 bg-wash dark:bg-raised rounded animate-pulse" />
        <div className="h-32 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
          <div className="h-64 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !extension) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
        <h2 className="text-xl font-display font-semibold text-ink">Extension Not Found</h2>
        <p className="text-xs text-ink-3 max-w-md mx-auto">
          {error ||
            `The extension @${namespace}/${id} could not be located on this Twext instance.`}
        </p>
        <div className="pt-2">
          <button onClick={() => onNavigate('search')} className="btn btn-secondary">
            ← Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const isOwner = Boolean(isAuthenticated && user && user.namespace === extension.namespace);
  const canManage = isOwner || isAdmin;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={() => onNavigate('search')}
        className="text-xs text-ink-3 hover:text-ink flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to search results
      </button>

      {/* Action notifications */}
      {actionError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 p-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Moderation Warning if Pending */}
      {isPending && (
        <div className="bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-sm">Pending Moderation Review</strong>
            <p className="mt-0.5 leading-relaxed">
              This extension (or its latest version) is currently awaiting review by a Twext
              administrator. It is accessible directly via its URL, but will not appear in the
              general public registry search until approved.
            </p>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs text-ink-3 mb-1">
              <span>@{extension.namespace}</span>
              <span>/</span>
              <span className="font-semibold text-ink-2">{extension.id}</span>
            </div>
            <h1 className="text-2xl font-display font-semibold text-ink">{extension.name}</h1>
            <p className="text-xs text-ink-2 mt-1 max-w-2xl leading-relaxed">
              {extension.shortDescription || extension.description || 'No description provided.'}
            </p>
          </div>

          {/* Badges & Meta */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {moderationStatus !== 'published' && (
                <StatusBadge status={moderationStatus} size="md" />
              )}
              <span className="chip bg-wash dark:bg-raised border-line text-ink-2 font-mono">
                v{latestVersion}
              </span>
              <button
                type="button"
                onClick={() => toggle(extension)}
                aria-pressed={isSaved(extension.namespace, extension.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  isSaved(extension.namespace, extension.id)
                    ? 'border-lilac-300 dark:border-lilac-700 text-lilac-700 dark:text-lilac-300 bg-lilac-50 dark:bg-lilac-950'
                    : 'border-line text-ink-2 hover:bg-wash dark:hover:bg-raised'
                }`}
              >
                <Bookmark
                  className="w-3.5 h-3.5"
                  fill={isSaved(extension.namespace, extension.id) ? 'currentColor' : 'none'}
                />
                <span>{isSaved(extension.namespace, extension.id) ? 'Saved' : 'Save'}</span>
              </button>
            </div>
            {extension.updatedAt && (
              <span className="text-[11px] text-ink-3 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Updated {new Date(extension.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Main Content & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Releases */}
        <div className="lg:col-span-2">
          <div className="card p-6 min-h-[320px] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Version History</h2>
              {extension.versions && extension.versions.length >= 2 && (
                <button
                  onClick={() => setCompareOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-2 border border-line rounded-lg hover:bg-wash dark:hover:bg-raised transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Compare versions
                </button>
              )}
            </div>
            {extension.versions && extension.versions.length > 0 ? (
              <div className="divide-y divide-line border border-line rounded-lg">
                {extension.versions.map((ver) => (
                  <div key={ver.version} className="bg-surface dark:bg-raised">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-ink">
                            v{ver.version}
                          </span>
                          {ver.status !== 'published' && (
                            <StatusBadge status={ver.status} size="sm" />
                          )}
                        </div>
                        {ver.changelog && (
                          <p className="text-xs text-ink-2 mt-1">{ver.changelog}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-ink-3">
                          {ver.createdAt
                            ? new Date(ver.createdAt).toLocaleDateString()
                            : 'Initial release'}
                        </span>
                        <button
                          onClick={() => handleToggleVersion(ver.version)}
                          title={`Show metadata for v${ver.version}`}
                          aria-label={`Metadata for v${ver.version}`}
                          aria-expanded={expandedVersion === ver.version}
                          className="p-1.5 text-ink-3 hover:text-lilac-700 dark:hover:text-lilac-300 rounded-md hover:bg-wash dark:hover:bg-raised transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        {canManage && ver.status === 'published' && (
                          <button
                            onClick={() => handleYankVersion(ver.version)}
                            disabled={yankingVersion === ver.version}
                            title={`Yank v${ver.version} from the registry`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3 h-3" />
                            {yankingVersion === ver.version ? 'Yanking...' : 'Yank'}
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedVersion === ver.version && (
                      <div className="px-4 pb-4">
                        <div className="border border-line rounded-lg bg-wash dark:bg-raised p-3 text-[11px] space-y-1.5">
                          {loadingVersion ? (
                            <p className="text-ink-3">Loading version metadata...</p>
                          ) : versionDetailError ? (
                            <p className="text-rose-700 dark:text-rose-400">{versionDetailError}</p>
                          ) : versionDetail ? (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                <span className="text-ink-3">
                                  Status:{' '}
                                  <strong className="text-ink-2 font-mono">
                                    {versionDetail.status}
                                  </strong>
                                </span>
                                {versionDetail.license && (
                                  <span className="text-ink-3">
                                    License:{' '}
                                    <strong className="text-ink-2 font-mono">
                                      {versionDetail.license}
                                    </strong>
                                  </span>
                                )}
                                {versionDetail.author && (
                                  <span className="text-ink-3">
                                    Author:{' '}
                                    <strong className="text-ink-2">{versionDetail.author}</strong>
                                  </span>
                                )}
                                {versionDetail.createdAt && (
                                  <span className="text-ink-3">
                                    Created:{' '}
                                    <strong className="text-ink-2">
                                      {new Date(versionDetail.createdAt).toLocaleString()}
                                    </strong>
                                  </span>
                                )}
                                {versionDetail.publishedAt && (
                                  <span className="text-ink-3">
                                    Published:{' '}
                                    <strong className="text-ink-2">
                                      {new Date(versionDetail.publishedAt).toLocaleString()}
                                    </strong>
                                  </span>
                                )}
                              </div>
                              {versionDetail.dist?.downloadUrl && (
                                <div className="pt-1">
                                  <div className="text-ink-3 mb-1">Download URL</div>
                                  <div className="flex items-center gap-2">
                                    <code className="flex-1 min-w-0 truncate text-ink bg-surface dark:bg-surface border border-line rounded px-2 py-1">
                                      {versionDetail.dist.downloadUrl}
                                    </code>
                                    <button
                                      onClick={() => handleCopy(versionDetail.dist!.downloadUrl)}
                                      className="btn btn-secondary btn-sm shrink-0"
                                    >
                                      {copiedUrl ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-line rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-ink">v{latestVersion}</span>
                  {moderationStatus !== 'published' && (
                    <StatusBadge status={moderationStatus} size="sm" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-ink-3">Current version</span>
                  {canManage && moderationStatus === 'published' && (
                    <button
                      onClick={() => handleYankVersion(latestVersion)}
                      disabled={yankingVersion === latestVersion}
                      title={`Yank v${latestVersion} from the registry`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-3 h-3" />
                      {yankingVersion === latestVersion ? 'Yanking...' : 'Yank'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Load & Author Details */}
        <div className="space-y-6">
          {/* TurboWarp Load Snippet */}
          {loadUrl && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-lilac-500 dark:text-lilac-300" />
                <h2 className="label">Load in TurboWarp</h2>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Paste this URL into TurboWarp under{' '}
                <strong>Add Extension → Custom Extension</strong>:
              </p>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={loadUrl}
                  className="input font-mono pl-3 pr-9 py-2 text-xs select-all"
                />
                <button
                  onClick={() => handleCopy(loadUrl)}
                  className="absolute right-1.5 top-1.5 p-1 text-ink-3 hover:text-ink rounded-md hover:bg-wash transition-colors"
                  title="Copy URL"
                >
                  {copiedUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="pt-1">
                <a
                  href={`https://turbowarp.org/editor?extension=${encodeURIComponent(loadUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary w-full"
                >
                  <span>Open directly in TurboWarp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Author Card */}
          <div className="card p-5 space-y-3">
            <h2 className="label">Author</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-wash dark:bg-raised border border-line flex items-center justify-center text-ink-2 font-bold text-sm">
                {authorDisplayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{authorDisplayName}</h3>
                <div className="text-xs text-ink-3 font-mono">@{authorNamespace}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <button
                onClick={() => onNavigate(`author/${encodeURIComponent(authorNamespace)}`)}
                className="text-xs text-lilac-700 dark:text-lilac-300 hover:underline font-medium flex items-center gap-1"
              >
                <UserIcon className="w-3.5 h-3.5" />
                View all packages by @{authorNamespace}
              </button>
            </div>
          </div>

          {/* Manage Card (owners & admins) */}
          {canManage && (
            <div className="card p-5 space-y-3 border-rose-200 dark:border-rose-900/60">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h2 className="label">Manage Extension</h2>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                {isOwner ? 'You own' : 'You administer'} @{extension.namespace}/{extension.id}.
                Yanking a version hides it from new installs; deleting the extension permanently
                removes every version and its compiled code.
              </p>
              <div>
                <button
                  onClick={handleDeleteExtension}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? 'Deleting...' : 'Delete extension'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {compareOpen && extension.versions && extension.versions.length >= 2 && (
        <VersionCompareModal
          namespace={extension.namespace}
          id={extension.id}
          versions={extension.versions}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {confirmDialog}
    </div>
  );
};
