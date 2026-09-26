import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../services/api';
import {
  MetricFamily,
  ParsedMetrics,
  formatLabels,
  formatValue,
  parsePrometheusText,
} from '../lib/prometheus';
import { CodeEditor } from './CodeEditor';
import { useModalDialog } from '../hooks/useModalDialog';
import { Activity, Check, Copy, Gauge, RefreshCw, ShieldAlert, X } from 'lucide-react';

const TYPE_CHIP: Record<string, string> = {
  gauge:
    'bg-lilac-50 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300 border-lilac-200 dark:border-lilac-800',
  counter:
    'bg-sky-50 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  histogram:
    'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  summary:
    'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

const FamilyTable: React.FC<{ family: MetricFamily }> = ({ family }) => (
  <div className="border border-line rounded-lg overflow-hidden">
    <div className="px-3 py-2 bg-wash dark:bg-raised border-b border-line flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[11px] text-ink">{family.name}</span>
      {family.type && (
        <span
          className={`chip font-mono text-[10px] ${
            TYPE_CHIP[family.type] ?? 'bg-wash dark:bg-raised text-ink-3 border-line'
          }`}
        >
          {family.type}
        </span>
      )}
    </div>
    {family.help && (
      <p className="px-3 pt-2 text-[11px] text-ink-3 leading-relaxed">{family.help}</p>
    )}
    <div className="p-3 space-y-1.5">
      {family.samples.map((sample, index) => {
        const labels = formatLabels(sample.labels);
        return (
          <div
            key={`${labels}-${index}`}
            className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-[11px]"
          >
            <span className="font-mono text-ink-3 break-all">
              {labels ? labels : <em className="not-italic">no labels</em>}
            </span>
            <span className="font-mono text-ink font-semibold tabular-nums shrink-0">
              {formatValue(sample.name, sample.value)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export const MetricsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const { dialogProps } = useModalDialog<HTMLDivElement>({
    labelledById: 'admin-metrics-title',
    onClose,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      setText(await api.getAdminMetrics());
    } catch (err: unknown) {
      setUnauthorized(err instanceof ApiError && (err.status === 401 || err.status === 403));
      setError(err instanceof ApiError ? err.message : 'Failed to load registry metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed: ParsedMetrics | null = useMemo(
    () => (text ? parsePrometheusText(text) : null),
    [text],
  );

  const labelled = useMemo(
    () => parsed?.families.filter((f) => Object.keys(f.samples[0]?.labels ?? {}).length > 0) ?? [],
    [parsed],
  );
  const unlabelled = useMemo(
    () =>
      parsed?.families.filter((f) => Object.keys(f.samples[0]?.labels ?? {}).length === 0) ?? [],
    [parsed],
  );

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopied(false);
      setCopyError('Clipboard is not available. Select the text and copy manually.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyError('Could not access the clipboard. Select the text and copy manually.');
    }
  };

  return (
    <div
      {...dialogProps}
      className="fixed inset-0 z-50 flex flex-col bg-surface dark:bg-surface focus:outline-none"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="space-y-0.5 min-w-0">
          <h2
            id="admin-metrics-title"
            className="text-base font-display font-semibold text-ink flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Registry Metrics
          </h2>
          <p className="text-[11px] text-ink-3">
            Prometheus exposition from <span className="font-mono">/admin/metrics</span>, fetched
            with your admin session.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh metrics"
            title="Refresh"
            className="p-1 text-ink-3 hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink transition-colors"
            aria-label="Close metrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
            <div className="h-40 bg-wash dark:bg-raised border border-line rounded-lg animate-pulse" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Unable to load metrics:</strong> {error}
              </div>
            </div>
            {unauthorized && (
              <p className="text-[11px] text-ink-3 leading-relaxed max-w-2xl">
                <span className="font-mono">/admin/metrics</span> is an admin-only route and this
                view loads it through the authenticated API client. Opening the URL directly in a
                new tab returns <span className="font-mono">401</span> because a browser navigation
                cannot send the bearer token — use this panel instead.
              </p>
            )}
          </div>
        ) : showRaw ? (
          <CodeEditor
            label="Prometheus metrics (read-only)"
            language="bash"
            value={text}
            onChange={() => {}}
            readOnly
          />
        ) : parsed && parsed.families.length > 0 ? (
          <>
            <p className="text-[11px] text-ink-3">
              {parsed.families.length} metric families • {parsed.sampleCount} samples
            </p>

            {unlabelled.length > 0 && (
              <div className="space-y-2">
                <h3 className="label text-ink-3 flex items-center gap-1.5">
                  <Gauge className="w-3 h-3" />
                  Gauges
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unlabelled.map((family) => {
                    const sample = family.samples[0];
                    return (
                      <div key={family.name} className="card p-3">
                        <div className="font-mono text-[10px] text-ink-3 break-all">
                          {family.name}
                        </div>
                        <div className="font-mono text-xl font-semibold text-ink tabular-nums mt-0.5">
                          {formatValue(sample.name, sample.value)}
                        </div>
                        {family.help && (
                          <p className="text-[10px] text-ink-3 leading-relaxed mt-1">
                            {family.help}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {labelled.length > 0 && (
              <div className="space-y-2">
                <h3 className="label text-ink-3">Labelled series</h3>
                <div className="space-y-3">
                  {labelled.map((family) => (
                    <FamilyTable key={family.name} family={family} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[11px] text-ink-3">The registry reported no metrics.</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-2 border-t border-line bg-wash dark:bg-raised text-[11px] text-ink-3 font-mono">
        <div className="min-w-0">
          <span>
            {parsed ? `${parsed.sampleCount} samples` : 'no data'}
            {copyError && (
              <span role="alert" className="ml-3 text-rose-600 dark:text-rose-400 font-sans">
                {copyError}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowRaw((prev) => !prev)}
            disabled={!text}
            className="hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
          >
            <span>{showRaw ? 'Rendered view' : 'Raw text'}</span>
          </button>
          <button
            onClick={() => void handleCopy()}
            disabled={!text}
            className="text-lilac-700 dark:text-lilac-300 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
