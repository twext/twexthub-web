import React, { useEffect, useRef, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSavedExtensions } from '../hooks/useCollections';
import { api } from '../services/api';
import { NotificationInbox } from './NotificationInbox';
import { ProfileMenu } from './ProfileMenu';
import { Icon } from './Icon';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onOpenCommandPalette,
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { saved } = useSavedExtensions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchNavQuery, setSearchNavQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  // Which control opened the inbox: the desktop bell drops down a popover,
  // the mobile menu opens the full-screen sheet.
  const [inboxSource, setInboxSource] = useState<'bell' | 'menu' | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const inboxTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isAdmin) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    const checkPending = async () => {
      try {
        const stats = await api.getStats();
        if (!cancelled) setPendingCount(stats.pending || 0);
      } catch {
        // ignore
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 25000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAdmin]);

  // A single call reports the whole-mailbox unread count, so the badge needs no paging.
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const checkUnread = async () => {
      try {
        const res = await api.getNotifications({ limit: 1 });
        if (!cancelled) setUnreadCount(res.unreadCount || 0);
      } catch {
        // ignore
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchNavQuery.trim()) {
      onNavigate(`search?q=${encodeURIComponent(searchNavQuery.trim())}`);
      setSearchNavQuery('');
      setMobileMenuOpen(false);
    }
  };

  // Every header destination is signalled the same way: a bottom border that
  // takes the accent colour when it matches the current route (and a lighter
  // accent on hover) and stays transparent otherwise.
  const navItemClass = (route: string) => {
    // Treat query-bearing routes (e.g. "search?q=foo") as the configured route.
    const isActive =
      currentRoute === route ||
      currentRoute.startsWith(`${route}/`) ||
      currentRoute.startsWith(`${route}?`);
    return `inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-ink-2 dark:text-ink-2 transition-colors border-b-2 border-transparent -mb-px ${
      isActive
        ? 'border-lilac-500 text-lilac-700 dark:text-lilac-300'
        : 'hover:border-lilac-500/70 hover:text-ink dark:hover:text-ink'
    }`;
  };

  return (
    <header className="sticky top-0 z-40 bg-canvas border-b border-line transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand & Desktop Navigation Links */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => onNavigate('home')}
              className="text-left flex items-center rounded-md"
              aria-label="Twext Home"
            >
              <BrandLogo size="md" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-0.5">
              <button onClick={() => onNavigate('search')} className={navItemClass('search')}>
                <span className="flex items-center gap-1.5">
                  <Icon name="explore" className="icon-sm text-ink-3" />
                  Explore
                </span>
              </button>

              <button onClick={() => onNavigate('saved')} className={navItemClass('saved')}>
                <span className="flex items-center gap-1.5">
                  <Icon name="bookmark" className="icon-sm text-ink-3" />
                  Saved
                  {saved.length > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-lilac-100 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300">
                      {saved.length}
                    </span>
                  )}
                </span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[15px] font-semibold border-b-2 border-transparent -mb-px transition-colors rounded-none rounded-lg ${
                    currentRoute === 'admin'
                      ? 'border-amber-500 text-amber-800 dark:text-amber-200 bg-transparent dark:bg-transparent'
                      : 'border-transparent text-amber-700 dark:text-amber-400 hover:border-amber-500/70 dark:hover:border-amber-400/70 hover:text-amber-800 dark:hover:text-amber-300'
                  }`}
                  title="Twext Registry Administration"
                >
                  <Icon name="shield" className="icon-sm text-amber-600 dark:text-amber-400" />
                  <span>Admin</span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-tight">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* Quick Search & Controls & Auth */}
          <div className="hidden lg:flex items-center gap-3">
            <form onSubmit={handleNavSearch} className="relative">
              <input
                type="text"
                placeholder="Search extensions..."
                value={searchNavQuery}
                onChange={(e) => setSearchNavQuery(e.target.value)}
                className="w-48 xl:w-60 pl-8 pr-3 py-1.5 text-sm bg-surface dark:bg-surface border border-line rounded-lg text-ink placeholder:text-ink-3 focus:bg-raised focus:outline-none focus:border-lilac-500 transition-colors"
              />
              <Icon
                name="search"
                className="icon-sm text-ink-3 absolute left-2.5 top-2 pointer-events-none"
              />
            </form>
            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                title="Open command palette"
                aria-label="Open command palette"
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-ink-2 dark:text-ink-2 hover:text-ink transition-colors border-b-2 border-transparent -mb-px rounded-none rounded-lg"
              >
                <Icon name="terminal" className="icon-sm text-ink-3" />
                <kbd className="font-mono text-[11px]">K</kbd>
              </button>
            )}
            {/* Dark Mode Toggle Button */}{' '}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-sm font-medium text-ink-2 dark:text-ink-2 transition-colors border-b-2 border-transparent -mb-px rounded-none rounded-lg"
            >
              {theme === 'dark' ? (
                <Icon name="light_mode" className="icon-sm text-amber-400" />
              ) : (
                <Icon name="dark_mode" className="icon-sm text-ink-2" />
              )}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <div className="h-4 w-px bg-line" />
            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    ref={profileTriggerRef}
                    onClick={() => setProfileMenuOpen((open) => !open)}
                    aria-haspopup="dialog"
                    aria-expanded={profileMenuOpen}
                    data-testid="profile-trigger"
                    className={navItemClass('dashboard')}
                  >
                    <Icon name="person" className="icon-sm text-lilac-500" />
                    <span>{user?.displayName || user?.namespace}</span>
                  </button>
                  {profileMenuOpen && user && (
                    <ProfileMenu
                      user={user}
                      triggerRef={profileTriggerRef}
                      onDismiss={() => setProfileMenuOpen(false)}
                      onNavigate={onNavigate}
                      onSignOut={async () => {
                        await logout();
                        onNavigate('home');
                      }}
                    />
                  )}
                </div>

                <div className="relative">
                  <button
                    ref={inboxTriggerRef}
                    onClick={() => setInboxSource((src) => (src === 'bell' ? null : 'bell'))}
                    title="Notifications"
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                    aria-haspopup="dialog"
                    aria-expanded={inboxSource === 'bell'}
                    className="relative inline-flex items-center justify-center w-8 h-8 text-ink-3 hover:text-ink transition-colors border-b-2 border-transparent -mb-px rounded-none rounded-lg"
                  >
                    <Icon name="notifications" className="icon-sm" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] px-1 text-[9px] font-mono font-bold leading-tight text-white bg-lilac-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {inboxSource === 'bell' && (
                    <NotificationInbox
                      triggerRef={inboxTriggerRef}
                      onClose={() => setInboxSource(null)}
                      onNavigate={onNavigate}
                      onUnreadChange={setUnreadCount}
                    />
                  )}
                </div>
                <button
                  onClick={() => onNavigate('settings')}
                  title="Settings"
                  aria-label="Settings"
                  className={navItemClass('settings')}
                >
                  <Icon name="settings" className="icon-sm text-ink-3" />
                  <span className="hidden sm:inline">Settings</span>
                </button>

                <button
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                  }}
                  title="Sign out of Twext"
                  className="inline-flex items-center justify-center w-8 h-8 text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 transition-colors border-b-2 border-transparent -mb-px rounded-none rounded-lg"
                >
                  <Icon name="logout" className="icon-sm" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[15px] font-medium text-ink-2 dark:text-ink-2 hover:text-ink transition-colors border-b-2 border-transparent -mb-px rounded-none rounded-lg"
                >
                  <Icon name="login" className="icon-sm" />
                  <span className="hidden sm:inline">Log in</span>
                </button>

                <button
                  onClick={() => onNavigate('signup')}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[15px] font-medium text-white bg-lilac-600 hover:bg-lilac-700 transition-colors border-b-2 border-transparent -mb-px rounded-none rounded-lg"
                >
                  <Icon name="person_add" className="icon-sm" />
                  <span className="hidden sm:inline">Sign up</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu and controls */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="p-1.5 text-ink-2 dark:text-ink-2 rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <Icon name="light_mode" className="text-amber-400" />
              ) : (
                <Icon name="dark_mode" className="text-ink-2" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-ink-2 dark:text-ink-2 rounded-lg transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <Icon name="close" className="icon-lg" />
              ) : (
                <Icon name="menu" className="icon-lg" />
              )}
            </button>
          </div>
        </div>
      </div>

      {inboxSource === 'menu' && (
        <NotificationInbox
          variant="modal"
          onClose={() => setInboxSource(null)}
          onNavigate={onNavigate}
          onUnreadChange={setUnreadCount}
        />
      )}

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-line bg-canvas px-4 pt-2 pb-4 space-y-3"
        >
          <form onSubmit={handleNavSearch} className="relative">
            <input
              type="text"
              placeholder="Search extensions..."
              value={searchNavQuery}
              onChange={(e) => setSearchNavQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface border border-line rounded-lg text-ink placeholder:text-ink-3"
            />
            <Icon name="search" className="icon-sm text-ink-3 absolute left-2.5 top-2.5" />
          </form>

          {onOpenCommandPalette && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCommandPalette();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-2 border border-line rounded-lg hover:border-lilac-500/70 hover:text-ink transition-colors"
            >
              <Icon name="terminal" />
              Command Palette
            </button>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigate('search');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors"
            >
              Explore Extensions
            </button>
            <button
              onClick={() => {
                onNavigate('saved');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors flex items-center justify-between"
            >
              <span>Saved Extensions</span>
              {saved.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-lilac-100 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300">
                  {saved.length}
                </span>
              )}
            </button>
            {isAuthenticated && user && (
              <div className="px-3 py-3 border border-line rounded-lg space-y-2 bg-surface dark:bg-raised">
                <div className="flex items-start gap-2.5">
                  <img
                    src={user.avatarUrl || `${api.getBaseUrl()}/users/${user.namespace}/avatar`}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover bg-wash dark:bg-raised border border-line shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">
                      {user.displayName || user.namespace}
                    </div>
                    <div className="text-[11px] font-mono text-ink-3 truncate">
                      @{user.namespace}
                    </div>
                  </div>
                </div>
                {user.bio && (
                  <p className="text-[11px] text-ink-2 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
                    {user.bio}
                  </p>
                )}
                {(user.website || user.github) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {user.website && (
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[11px] text-lilac-700 dark:text-lilac-300 hover:underline break-all"
                      >
                        {user.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {user.github && (
                      <a
                        href={`https://github.com/${user.github}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[11px] text-ink-2 hover:text-ink font-mono"
                      >
                        @{user.github}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={() => {
                  setInboxSource('menu');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Icon name="notifications" className="icon-sm" />
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-lilac-100 dark:bg-lilac-900 text-lilac-700 dark:text-lilac-300">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left text-sm font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 rounded-lg flex items-center justify-between border-b-2 border-transparent hover:border-amber-500/60 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Icon name="shield" className="icon-sm" />
                  Admin
                </span>
                {pendingCount > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {pendingCount} pending
                  </span>
                )}
              </button>
            )}{' '}
            <button
              onClick={() => {
                onNavigate('terms');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                onNavigate('privacy');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors"
            >
              Privacy Policy
            </button>
          </div>

          <div className="pt-2 border-t border-line">
            {isAuthenticated ? (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-ink bg-wash rounded-lg flex items-center justify-between border-b-2 border-transparent hover:border-lilac-500/70 hover:text-ink transition-colors"
                >
                  <span className="text-ink">@{user?.namespace}</span>
                  <Icon name="person" className="icon-sm text-lilac-500" />
                </button>
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-ink-2 hover:border-b-2 hover:border-lilac-500/70 hover:text-ink rounded-none rounded-lg transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:border-b-2 hover:border-rose-500/60 hover:text-rose-700 dark:hover:text-rose-300 rounded-none rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2 text-sm font-medium text-center text-ink-2 border border-line rounded-lg hover:border-lilac-500/70 hover:text-ink transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    onNavigate('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2 text-sm font-medium text-center text-white bg-lilac-600 hover:bg-lilac-700 rounded-lg border-b-2 border-transparent hover:border-lilac-400 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
