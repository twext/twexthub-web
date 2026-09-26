import React, { useEffect, useRef, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSavedExtensions } from '../hooks/useCollections';
import { api } from '../services/api';
import { NotificationInbox } from './NotificationInbox';
import { ProfileMenu } from './ProfileMenu';
import {
  Bell,
  Compass,
  User as UserIcon,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Shield,
  Bookmark,
  Command,
} from 'lucide-react';

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
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

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

  // Every header destination is signalled the same way: a filled label that takes
  // the accent fill when it matches the current route. Nothing in the header
  // signals the current page with an underline, so no item carries a border that
  // could read as one.
  const navItemClass = (route: string, accent: 'lilac' | 'amber' = 'lilac') => {
    // Treat query-bearing routes (e.g. "search?q=foo") as the configured route.
    const isActive =
      currentRoute === route ||
      currentRoute.startsWith(`${route}/`) ||
      currentRoute.startsWith(`${route}?`);
    const active =
      accent === 'amber'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : 'bg-lilac-500/15 text-lilac-700 dark:text-lilac-300';
    return `px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive ? active : 'text-ink-2 hover:bg-ink-3/10 hover:text-ink'
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
                  <Compass className="w-3.5 h-3.5 text-ink-3" />
                  Explore
                </span>
              </button>

              <button onClick={() => onNavigate('saved')} className={navItemClass('saved')}>
                <span className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-ink-3" />
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
                  className={`${navItemClass('admin', 'amber')} flex items-center gap-1.5`}
                  title="Twext Registry Administration"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2 pointer-events-none" />
            </form>

            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                title="Open command palette"
                aria-label="Open command palette"
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-ink-3 hover:text-ink bg-surface dark:bg-surface hover:bg-wash border border-line rounded-lg transition-colors"
              >
                <Command className="w-3.5 h-3.5" />
                <kbd className="font-mono text-[10px]">K</kbd>
              </button>
            )}

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="p-1.5 text-ink-2 hover:text-ink bg-surface dark:bg-surface hover:bg-wash border border-line rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-ink-2" />
              )}
            </button>

            <div className="h-4 w-px bg-line" />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    ref={profileTriggerRef}
                    onClick={() => setProfileMenuOpen((open) => !open)}
                    aria-haspopup="dialog"
                    aria-expanded={profileMenuOpen}
                    data-testid="profile-trigger"
                    className={`${navItemClass('dashboard')} flex items-center gap-1.5`}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-lilac-500" />
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

                <button
                  onClick={() => setInboxOpen(true)}
                  title="Notifications"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  className="relative p-1.5 text-ink-3 hover:text-ink rounded-lg hover:bg-wash transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] px-1 text-[9px] font-mono font-bold leading-tight text-white bg-lilac-500 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onNavigate('settings')}
                  title="Settings"
                  aria-label="Settings"
                  className={navItemClass('settings')}
                >
                  <Settings className="w-3.5 h-3.5 text-ink-3" />
                </button>

                <button
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                  }}
                  title="Sign out of Twext"
                  className="p-1.5 text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-wash transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-2.5 py-1.5 text-sm font-medium text-ink-2 hover:text-ink rounded-lg hover:bg-wash transition-colors flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log in</span>
                </button>

                <button
                  onClick={() => onNavigate('signup')}
                  className="btn btn-primary text-sm px-3.5 py-1.5 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign up</span>
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
              className="p-1.5 text-ink-2 dark:text-ink-2 rounded-lg hover:bg-wash transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-ink-2" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-ink-2 hover:text-ink rounded-lg hover:bg-wash"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {inboxOpen && (
        <NotificationInbox
          onClose={() => setInboxOpen(false)}
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
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5" />
          </form>

          {onOpenCommandPalette && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCommandPalette();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-2 border border-line rounded-lg hover:bg-wash"
            >
              <Command className="w-4 h-4" />
              Command Palette
            </button>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-wash rounded-lg"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigate('search');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-wash rounded-lg"
            >
              Explore Extensions
            </button>

            <button
              onClick={() => {
                onNavigate('saved');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-wash rounded-lg flex items-center justify-between"
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
                  setInboxOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-wash rounded-lg flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
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
                className="px-3 py-2 text-left text-sm font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 rounded-lg flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </span>
                {pendingCount > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {pendingCount} pending
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                onNavigate('terms');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-wash rounded-lg"
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                onNavigate('privacy');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-wash rounded-lg"
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
                  className="w-full text-left px-3 py-2 text-sm font-medium text-ink bg-wash rounded-lg flex items-center justify-between"
                >
                  <span className="text-ink">@{user?.namespace}</span>
                  <UserIcon className="w-3.5 h-3.5 text-lilac-500" />
                </button>
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-ink-2 hover:bg-wash rounded-lg"
                >
                  Settings
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
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
                  className="flex-1 py-2 text-sm font-medium text-center text-ink-2 border border-line rounded-lg hover:bg-wash"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    onNavigate('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2 text-sm font-medium text-center text-white bg-lilac-600 hover:bg-lilac-700 rounded-lg"
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
