import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { LogIn, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [namespace, setNamespace] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namespace.trim() || !password) {
      setError('Please provide both your namespace username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(namespace.trim().toLowerCase(), password);
      onNavigate('dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo size="md" showText={false} />
          </div>
          <h1 className="text-2xl font-display font-semibold text-ink">Sign in to Twext</h1>
          <p className="text-sm text-ink-3">
            Enter your namespace and account password to manage your extensions and tokens.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-tight">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label block mb-1.5">Namespace Username</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-ink-3 font-mono">@</span>
              <input
                type="text"
                required
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="your-namespace"
                className="input font-mono pl-7"
              />
            </div>
            <p className="text-xs text-ink-3 mt-1">
              Example: <code className="text-ink-2">kanemarshall</code>
            </p>
          </div>

          <div>
            <label className="label block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-line text-center">
          <p className="text-sm text-ink-2">
            Don't have an author namespace yet?{' '}
            <button
              onClick={() => onNavigate('signup')}
              className="text-lilac-700 dark:text-lilac-300 font-semibold hover:underline underline-offset-4 inline-flex items-center gap-0.5"
            >
              Sign up <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
