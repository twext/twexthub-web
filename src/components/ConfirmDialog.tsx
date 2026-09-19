import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  /** When set, the confirm button stays disabled until the user types this exact text. */
  requireText?: string;
  /** Hint shown above the input. Defaults to `Type "<requireText>" to confirm`. */
  requireTextLabel?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  options: ConfirmDialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  options,
  onConfirm,
  onCancel,
}) => {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    requireText,
    requireTextLabel,
  } = options;

  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    const id = setTimeout(() => {
      if (requireText) inputRef.current?.focus();
      else confirmRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [open, requireText]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = !requireText || typed === requireText;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="card max-w-md w-full p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex items-center gap-2 font-semibold text-sm ${
              variant === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-ink'
            }`}
          >
            {variant === 'danger' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            <h2 id="confirm-dialog-title" className="font-display">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-ink-3 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && <div className="text-xs text-ink-2 leading-relaxed">{message}</div>}

        {requireText && (
          <div className="space-y-1.5">
            <label className="label block" htmlFor="confirm-dialog-input">
              {requireTextLabel || `Type "${requireText}" to confirm`}
            </label>
            <input
              id="confirm-dialog-input"
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoComplete="off"
              spellCheck={false}
              className="input font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onCancel} className="btn btn-ghost btn-sm">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`btn btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
