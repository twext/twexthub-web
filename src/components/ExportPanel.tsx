import React, { useState } from 'react';
import { api, ApiError } from '../services/api';
import { downloadFile, timestampedFilename, toCsv } from '../lib/csv';
import { useToast } from '../context/ToastContext';
import { Extension, PaginatedList, PendingVersion, User } from '../types/api';
import { Download, FileJson, FileSpreadsheet, Package, ShieldCheck, Users } from 'lucide-react';

async function collectAll<T>(
  fetcher: (params?: { cursor?: string; limit?: number }) => Promise<PaginatedList<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  let guard = 0;
  do {
    const res = await fetcher(cursor ? { cursor, limit: 50 } : { limit: 50 });
    all.push(...(res?.data || []));
    cursor = res?.pagination?.hasMore ? res.pagination.nextCursor || undefined : undefined;
    guard += 1;
  } while (cursor && guard < 1000);
  return all;
}

const extensionRows = (items: Extension[]) =>
  items.map((ext) => ({
    namespace: ext.namespace,
    id: ext.id,
    name: ext.name,
    description: ext.shortDescription || ext.description || '',
    author:
      typeof ext.author === 'object' && ext.author !== null
        ? ext.author.displayName || ext.author.namespace
        : ext.author,
    latestVersion: ext.latestVersion || '',
    status: ext.status || 'published',
    createdAt: ext.createdAt || '',
    updatedAt: ext.updatedAt || '',
  }));

const userRows = (items: User[]) =>
  items.map((user) => ({
    namespace: user.namespace,
    displayName: user.displayName || '',
    role: user.role || 'normal',
    hasPublished: user.hasPublished,
    termsAcceptedVersion: user.termsAcceptedVersion ?? '',
    createdAt: user.createdAt || '',
  }));

const queueRows = (items: PendingVersion[]) =>
  items.map((item) => ({
    namespace: item.ownerNamespace || item.namespace,
    id: item.id,
    version: item.version,
    name: item.name,
    status: item.status,
    license: item.license || '',
    createdAt: item.createdAt || '',
  }));

type DatasetKey = 'extensions' | 'users' | 'queue';

export const ExportPanel: React.FC = () => {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const datasets: Array<{
    key: DatasetKey;
    label: string;
    description: string;
    icon: React.ElementType;
    load: () => Promise<Array<Record<string, unknown>>>;
  }> = [
    {
      key: 'extensions',
      label: 'Extension Catalog',
      description: 'Every published extension with metadata.',
      icon: Package,
      load: async () => extensionRows(await collectAll<Extension>((p) => api.getExtensions(p))),
    },
    {
      key: 'users',
      label: 'Accounts',
      description: 'All registered accounts and roles.',
      icon: Users,
      load: async () => userRows(await collectAll<User>((p) => api.getUsers(p))),
    },
    {
      key: 'queue',
      label: 'Moderation Queue',
      description: 'Versions currently awaiting review.',
      icon: ShieldCheck,
      load: async () =>
        queueRows(await collectAll<PendingVersion>((p) => api.listVersionsForReview(p))),
    },
  ];

  const handleExport = async (dataset: (typeof datasets)[number], format: 'json' | 'csv') => {
    const action = `${dataset.key}:${format}`;
    setBusy(action);
    try {
      const rows = await dataset.load();
      const content = format === 'json' ? JSON.stringify(rows, null, 2) : toCsv(rows);
      downloadFile(
        timestampedFilename(`twexthub-${dataset.key}`, format),
        content,
        format === 'json' ? 'application/json' : 'text/csv',
      );
      toast.success(
        `Exported ${rows.length} ${dataset.label.toLowerCase()} record(s) as ${format.toUpperCase()}.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : `Failed to export ${dataset.label}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Download className="w-4 h-4 text-lilac-600 dark:text-lilac-300 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-ink">Registry Data Export</h3>
          <p className="text-[11px] text-ink-3 max-w-xl leading-relaxed">
            Download registry data compiled in your browser. Nothing is stored on the server.
          </p>
        </div>
      </div>

      <div className="divide-y divide-line border border-line rounded-lg">
        {datasets.map((dataset) => {
          const Icon = dataset.icon;
          const jsonBusy = busy === `${dataset.key}:json`;
          const csvBusy = busy === `${dataset.key}:csv`;
          return (
            <div
              key={dataset.key}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Icon className="w-4 h-4 text-ink-3 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-ink">{dataset.label}</div>
                  <div className="text-[11px] text-ink-3">{dataset.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExport(dataset, 'json')}
                  disabled={busy !== null}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>{jsonBusy ? 'Exporting...' : 'JSON'}</span>
                </button>
                <button
                  onClick={() => handleExport(dataset, 'csv')}
                  disabled={busy !== null}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{csvBusy ? 'Exporting...' : 'CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
