import React from 'react';
import { ModerationStatus } from '../types/api';
import { AlertCircle, CheckCircle2, Clock, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status?: ModerationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'published', size = 'sm' }) => {
  const styles: Record<ModerationStatus, { cls: string; label: string; icon: React.ReactNode }> = {
    published: {
      cls: 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      label: 'Published',
      icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
    pending: {
      cls: 'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      label: 'Pending Review',
      icon: <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
    yanked: {
      cls: 'bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      label: 'Yanked',
      icon: <Ban className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
    rejected: {
      cls: 'bg-wash dark:bg-raised text-ink-2 dark:text-ink-2 border-line',
      label: 'Rejected',
      icon: <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
  };

  const current = styles[status] || styles.published;

  return (
    <span className={`chip ${current.cls} ${size === 'sm' ? 'text-xs' : 'text-sm px-2.5 py-1'}`}>
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
