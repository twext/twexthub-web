import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSavedExtensions } from '../hooks/useCollections';
import { api } from '../services/api';
import {
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

  useEffect(() => {
    if (!isAdmin) {
      setPendingCount(0);
      return;
    }
    const checkPending = async () => {
      try {
        const stats = await api.getStats();
        setPendingCount(stats.pending || 0);
      } catch {
        // ignore
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 25000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchNavQuery.trim()) {
      onNavigate(`search?q=${encodeURIComponent(searchNavQuery.trim())}`);
      setSearchNavQuery('');
      setMobileMenuOpen(false);
    }
  };

  const navItemClass = (route: string) => {
    const isActive = currentRoute === route || currentRoute.startsWith(`${route}/`);
    return `px-2.5 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      isActive
        ? 'border-lilac-500 text-lilac-700 dark:text-lilac-300'
        : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
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
                  className={`px-2.5 py-1 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    currentRoute === 'admin'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
                  }`}
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
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    currentRoute === 'dashboard'
                      ? 'border-lilac-400 text-lilac-700 dark:text-lilac-300 bg-lilac-50 dark:bg-lilac-950'
                      : 'border-line text-ink-2 hover:bg-wash'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-lilac-500" />
                  <span>{user?.displayName || user?.namespace}</span>
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
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-line bg-canvas px-4 pt-2 pb-4 space-y-3">
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
