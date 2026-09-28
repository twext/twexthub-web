import React, { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { ExtensionOwner } from '../types/api';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../context/ToastContext';
import { AlertCircle, Plus, Trash2, Users, X } from 'lucide-react';

interface OwnersPanelProps {
  namespace: string;
  id: string;
  canManage: boolean;
  onClose: () => void;
}

const NAMESPACE_RE = /^[a-z0-9](?:[a-z0-9-_]{0,38})$/;

export const OwnersPanel: React.FC<OwnersPanelProps> = ({ namespace, id, canManage, onClose }) => {
  const { confirm, confirmDialog } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  const [owners, setOwners] = useState<ExtensionOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [busyOwner, setBusyOwner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setOwners(await api.getExtensionOwners(namespace, id));
    } catch (err: unknown) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load the owner list');
    } finally {
      setLoading(false);
    }
  }, [namespace, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const target = candidate.trim().toLowerCase();
    if (!NAMESPACE_RE.test(target)) {
      setCandidateError('Enter a valid username.');
      return;
    }
    if (owners.some((owner) => owner.namespace === target)) {
      setCandidateError(`${target} is already an owner.`);
      return;
    }
    setAdding(true);
    setCandidateError(null);
    try {
      await api.addExtensionOwner(namespace, id, target);
      toastSuccess(`Added @${target} as an owner.`);
      setCandidate('');
      await load();
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed to add that owner';
      setCandidateError(message);
      toastError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (ownerNamespace: string) => {
    const ok = await confirm({
      title: 'Remove owner',
      message: `Remove @${ownerNamespace} from @${namespace}/${id}? They will lose the ability to publish immediately.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyOwner(ownerNamespace);
    try {
      await api.removeExtensionOwner(namespace, id, ownerNamespace);
      toastSuccess(`Removed @${ownerNamespace}.`);
      await load();
    } catch (err: unknown) {
      toastError(err instanceof ApiError ? err.message : 'Failed to remove that owner');
    } finally {
      setBusyOwner(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Extension owners"
    >
      <div
        className="bg-surface dark:bg-surface border border-line rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-surface dark:bg-surface z-10">
          <div>
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-lilac-700 dark:text-lilac-300" />
              Owners
            </h2>
            <p className="font-mono text-[11px] text-ink-3 mt-0.5">
              @{namespace}/{id}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close owners panel"
            className="p-1 text-ink-3 hover:text-ink rounded-lg hover:bg-wash dark:hover:bg-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {canManage && (
            <div className="space-y-2">
              <label
                htmlFor="owner-candidate"
                className="label text-ink-3 flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                Add an owner by username
              </label>
              <div className="flex gap-2">
                <input
                  id="owner-candidate"
                  type="text"
                  value={candidate}
                  onChange={(e) => {
                    setCandidate(e.target.value);
                    setCandidateError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="username"
                  autoComplete="off"
                  className="input flex-1"
                />
                <button
                  onClick={handleAdd}
                  disabled={adding || !candidate.trim()}
                  className="btn btn-primary shrink-0"
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
              </div>
              <p className="text-[10px] text-ink-3">
                The new owner is notified. The extension's own account cannot be removed.
              </p>
              {candidateError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{candidateError}</p>
              )}
            </div>
          )}

          {loadError ? (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{loadError}</span>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
              <div className="h-10 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
            </div>
          ) : owners.length > 0 ? (
            <ul className="divide-y divide-line border border-line rounded-lg">
              {owners.map((owner) => {
                // The extension's own namespace can never be removed.
                const isSelf = owner.namespace === namespace;
                return (
                  <li
                    key={owner.namespace}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-ink truncate">
                        @{owner.namespace}
                        {isSelf && (
                          <span className="ml-1.5 chip bg-wash dark:bg-raised text-ink-3">
                            extension
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-3 truncate">
                        {owner.displayName}
                        {owner.addedAt && (
                          <span className="ml-1.5">
                            since {new Date(owner.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canManage && !isSelf && (
                        <button
                          onClick={() => handleRemove(owner.namespace)}
                          disabled={busyOwner === owner.namespace}
                          title={`Remove @${owner.namespace}`}
                          aria-label={`Remove @${owner.namespace}`}
                          className="p-1 text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-ink-3">No owners listed.</p>
          )}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
};
