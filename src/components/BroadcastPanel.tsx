import React, { useState } from 'react';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { Megaphone, Send } from 'lucide-react';

const BROADCAST_MAX_LENGTH = 280;

export const BroadcastPanel: React.FC = () => {
  const { confirm, confirmDialog } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    const ok = await confirm({
      title: 'Send registry broadcast',
      message: (
        <>
          Send this message to <strong>every account</strong> in the registry? It lands in each
          mailbox at the moment of the call and cannot be recalled.
        </>
      ),
      confirmLabel: 'Send broadcast',
    });
    if (!ok) return;

    setSending(true);
    try {
      const res = await api.broadcastNotification(trimmed);
      setMessage('');
      toastSuccess(`Broadcast sent to ${res.created} mailboxes.`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send broadcast';
      toastError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card p-5 space-y-3">
      {confirmDialog}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-lilac-600 dark:text-lilac-300" />
            <h3 className="text-sm font-semibold text-ink">Broadcast to All Accounts</h3>
          </div>
          <p className="text-[11px] text-ink-3 max-w-lg leading-relaxed">
            Deliver a message to every account's notification mailbox. Each account gets its own
            copy; accounts created later do not receive past broadcasts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, BROADCAST_MAX_LENGTH))}
          placeholder="Announcement for every account, e.g. 'Scheduled maintenance tonight at 02:00 UTC.'"
          rows={4}
          maxLength={BROADCAST_MAX_LENGTH}
          aria-label="Broadcast message"
          className="input w-full resize-none font-mono text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-ink-3 font-mono">
            {message.length}/{BROADCAST_MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!canSend}
            className="btn btn-primary btn-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending...' : 'Send Broadcast'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
