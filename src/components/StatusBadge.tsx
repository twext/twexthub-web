import React from 'react';
import { ModerationStatus } from '../types/api';
import { Icon } from './Icon';

interface StatusBadgeProps {
  status?: ModerationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'published', size = 'sm' }) => {
  const styles: Record<ModerationStatus, { cls: string; label: string; icon: React.ReactNode }> = {
    published: {
      cls: 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      label: 'Published',
      icon: <Icon name="check_circle" className={size === 'sm' ? 'icon-xs' : 'icon-sm'} />,
    },
    pending: {
      cls: 'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      label: 'Awaiting review',
      icon: <Icon name="schedule" className={size === 'sm' ? 'icon-xs' : 'icon-sm'} />,
    },
    yanked: {
      cls: 'bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      label: 'Unpublished',
      icon: <Icon name="block" className={size === 'sm' ? 'icon-xs' : 'icon-sm'} />,
    },
    rejected: {
      cls: 'bg-wash dark:bg-raised text-ink-2 dark:text-ink-2 border-line',
      label: 'Rejected',
      icon: <Icon name="error" className={size === 'sm' ? 'icon-xs' : 'icon-sm'} />,
    },
    deprecated: {
      cls: 'bg-amber-50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      label: 'Deprecated',
      icon: <Icon name="warning" className={size === 'sm' ? 'icon-xs' : 'icon-sm'} />,
    },
    staging: {
      cls: 'bg-wash dark:bg-raised text-ink-2 dark:text-ink-2 border-line',
      label: 'Draft',
      icon: <Icon name="schedule" className={size === 'sm' ? 'icon-xs' : 'icon-sm'} />,
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
