import React, { useCallback, useRef } from 'react';
import { useDismissable } from '../hooks/useDismissable';
import { Link as LinkIcon, LogOut, Settings } from 'lucide-react';
import { User } from '../types/api';
import { api } from '../services/api';

interface ProfileMenuProps {
  user: User;
  /**
   * The control that opened this menu. Treated as part of the popover for
   * dismissal purposes, so clicking the trigger closes it instead of dismissing
   * and immediately toggling it back open.
   */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  /** Called after the menu closes so the trigger can take focus back. */
  onDismiss: () => void;
  onNavigate: (route: string) => void;
  onSignOut: () => void;
}

/**
 * The signed-in account's own profile details, anchored to the top bar.
 *
 * Shows the same v1 profile fields the public profile page renders, so a
 * signed-in author can see how their bio, links, and avatar will appear to
 * visitors without leaving the page they are working on.
 */
export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  triggerRef,
  onDismiss,
  onNavigate,
  onSignOut,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useDismissable(ref, onDismiss, triggerRef);

  const go = useCallback(
    (route: string) => {
      onDismiss();
      onNavigate(route);
    },
    [onDismiss, onNavigate],
  );

  const handleSignOut = useCallback(() => {
    onDismiss();
    onSignOut();
  }, [onDismiss, onSignOut]);

  const displayName = user.displayName || user.namespace;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Your profile"
      className="absolute right-0 top-full mt-2 w-72 card p-0 overflow-hidden z-50 text-left"
    >
      <button
        onClick={() => go(`author/${user.namespace}`)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-wash transition-colors"
      >
        <img
          src={user.avatarUrl || `${api.getBaseUrl()}/users/${user.namespace}/avatar`}
          alt=""
          className="w-11 h-11 rounded-lg object-cover bg-wash dark:bg-raised border border-line shrink-0"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{displayName}</div>
          <div className="text-[11px] font-mono text-ink-3 truncate">@{user.namespace}</div>
        </div>
      </button>

      {user.bio && (
        <p className="px-4 pb-3 text-[11px] text-ink-2 leading-relaxed line-clamp-4 whitespace-pre-wrap break-words">
          {user.bio}
        </p>
      )}

      {(user.website || user.github) && (
        <div className="px-4 pb-3 space-y-1">
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1.5 text-[11px] text-lilac-700 dark:text-lilac-300 hover:underline break-all"
            >
              <LinkIcon className="w-3 h-3 shrink-0" />
              {user.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {user.github && (
            <a
              href={`https://github.com/${user.github}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1.5 text-[11px] text-ink-2 hover:text-ink font-mono"
            >
              <span className="text-ink-3">@</span>
              {user.github}
            </a>
          )}
        </div>
      )}

      {!user.bio && !user.website && !user.github && (
        <p className="px-4 pb-3 text-[11px] text-ink-3 leading-relaxed">
          Add a bio, website, or GitHub username so visitors can learn more about you.
        </p>
      )}

      <div className="border-t border-line py-1">
        <button
          onClick={() => go('settings')}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-ink-2 hover:bg-wash transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Edit profile</span>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
