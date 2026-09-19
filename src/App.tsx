import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { TermsBanner } from './components/TermsBanner';
import { CommandPalette } from './components/CommandPalette';

// Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { ExtensionDetailPage } from './pages/ExtensionDetailPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthorPage } from './pages/AuthorPage';
import { SavedPage } from './pages/SavedPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  // Hash-based routing keeps deep links working on a static host without server rewrites.
  const getHashRoute = () => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    return raw || 'home';
  };

  const [route, setRoute] = useState<string>(getHashRoute());
  const [configRefreshKey] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getHashRoute());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useCallback((targetRoute: string) => {
    window.location.hash = targetRoute;
    setRoute(targetRoute);
    window.scrollTo(0, 0);
  }, []);

  // Parse route components
  const renderCurrentPage = () => {
    // Search route with optional query e.g. "search?q=foo"
    if (route.startsWith('search')) {
      const qIndex = route.indexOf('?q=');
      const query = qIndex !== -1 ? decodeURIComponent(route.substring(qIndex + 3)) : '';
      return (
        <ExplorePage
          key={`${query}-${configRefreshKey}`}
          initialQuery={query}
          onNavigate={navigate}
        />
      );
    }

    // Author profile route e.g. "author/:namespace"
    if (route.startsWith('author/')) {
      const namespace = route.substring('author/'.length);
      if (namespace) {
        return (
          <AuthorPage
            key={`${namespace}-${configRefreshKey}`}
            namespace={namespace}
            onNavigate={navigate}
          />
        );
      }
    }

    // Extension detail route e.g. "ext/:namespace/:id"
    if (route.startsWith('ext/')) {
      const parts = route.split('/');
      const namespace = parts[1] || '';
      const id = parts[2] || '';
      if (namespace && id) {
        return (
          <ExtensionDetailPage
            key={`${namespace}/${id}-${configRefreshKey}`}
            namespace={namespace}
            id={id}
            onNavigate={navigate}
          />
        );
      }
    }

    switch (route) {
      case 'home':
        return <HomePage key={configRefreshKey} onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} />;
      case 'signup':
        return <SignupPage onNavigate={navigate} />;
      case 'dashboard':
        return <DashboardPage key={configRefreshKey} onNavigate={navigate} />;
      case 'settings':
      case 'sessions-tokens':
        return <SettingsPage key={configRefreshKey} onNavigate={navigate} />;
      case 'saved':
        return <SavedPage key={configRefreshKey} onNavigate={navigate} />;
      case 'admin':
        return <AdminPage key={configRefreshKey} onNavigate={navigate} />;
      case 'terms':
        return <TermsPage key={configRefreshKey} onNavigate={navigate} />;
      case 'privacy':
        return <PrivacyPage key={configRefreshKey} />;
      default:
        return <HomePage key={configRefreshKey} onNavigate={navigate} />;
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-canvas text-ink font-sans transition-colors duration-150">
            {/* Navigation Bar */}
            <Navbar
              currentRoute={route}
              onNavigate={navigate}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            />

            {/* Global Terms Acceptance Warning Banner */}
            <TermsBanner onNavigate={navigate} />

            {/* Main Content Area */}
            <main className="flex-1">{renderCurrentPage()}</main>

            {/* Footer */}
            <Footer onNavigate={navigate} />

            <CommandPalette
              open={commandPaletteOpen}
              onClose={() => setCommandPaletteOpen(false)}
              onNavigate={navigate}
            />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
