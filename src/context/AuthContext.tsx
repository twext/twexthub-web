import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { User } from '../types/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  latestTermsVersion: number | null;
  hasAcceptedCurrentTerms: boolean;
  login: (namespace: string, password: string) => Promise<void>;
  signup: (namespace: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  acceptCurrentTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isSameUser(a: User, b: User): boolean {
  return (
    a.namespace === b.namespace &&
    a.displayName === b.displayName &&
    a.role === b.role &&
    a.hasPublished === b.hasPublished &&
    a.createdAt === b.createdAt &&
    a.termsAcceptedVersion === b.termsAcceptedVersion
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(api.getStoredUser());
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [latestTermsVersion, setLatestTermsVersion] = useState<number | null>(null);
  const isCheckingAuthRef = useRef(false);

  // Check latest terms version from API
  const fetchTermsVersion = useCallback(async () => {
    try {
      const terms = await api.getTerms();
      setLatestTermsVersion(terms.version);
    } catch {
      setLatestTermsVersion(1);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      api.setToken(null);
      api.setStoredUser(null);
      setUser(null);
      setToken(null);
    }
  }, []);

  // Fetch /v0/auth/me every so often and log the user out if their token is invalid or missing.
  // Reads the token/user from the api layer (not React state) and bails out of `setUser` when the
  // payload is unchanged, so the callback stays referentially stable and `getMe` is not re-triggered
  // in a loop that would make profile pages re-fetch and re-show skeletons on every render.
  const verifyAuth = useCallback(async () => {
    const currentToken = api.getToken();
    if (!currentToken) {
      if (api.getStoredUser()) {
        await logout();
      }
      return;
    }

    if (isCheckingAuthRef.current) return;
    isCheckingAuthRef.current = true;

    try {
      const freshUser = await api.getMe();
      setUser((prev) => (prev && isSameUser(prev, freshUser) ? prev : freshUser));
      setToken(currentToken);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // 401 Unauthorized, 403 Forbidden, 404 User Not Found indicate invalid or revoked token
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          await logout();
        }
      }
    } finally {
      isCheckingAuthRef.current = false;
    }
  }, [logout]);

  const refreshUser = useCallback(async () => {
    await verifyAuth();
  }, [verifyAuth]);

  // Initial auth and terms verification
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchTermsVersion();
      if (api.getToken()) {
        await verifyAuth();
      }
      setIsLoading(false);
    };
    init();
  }, [fetchTermsVersion, verifyAuth]);

  // Periodic auth verification: Check /v0/auth/me periodically (every 20 seconds)
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      verifyAuth();
    }, 20000);

    const handleFocus = () => {
      verifyAuth();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [token, verifyAuth]);

  const login = async (namespace: string, password: string) => {
    const res = await api.login({ namespace, password });
    setUser(res.user);
    setToken(res.token);
    await fetchTermsVersion();
  };

  const signup = async (namespace: string, password: string, displayName?: string) => {
    const res = await api.signup({ namespace, password, displayName });
    setUser(res.user);
    setToken(res.token);
    await fetchTermsVersion();
  };

  const acceptCurrentTerms = async () => {
    const versionToAccept = latestTermsVersion ?? 1;
    await api.acceptTerms(versionToAccept);
    if (user) {
      const updatedUser = { ...user, termsAcceptedVersion: versionToAccept };
      setUser(updatedUser);
      api.setStoredUser(updatedUser);
    }
  };

  const hasAcceptedCurrentTerms = Boolean(
    user &&
    latestTermsVersion !== null &&
    user.termsAcceptedVersion !== null &&
    user.termsAcceptedVersion !== undefined &&
    user.termsAcceptedVersion >= latestTermsVersion,
  );

  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isAdmin,
        isLoading,
        latestTermsVersion,
        hasAcceptedCurrentTerms,
        login,
        signup,
        logout,
        refreshUser,
        acceptCurrentTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
