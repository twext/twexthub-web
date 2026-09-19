import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { UserPlus, AlertCircle, ArrowRight } from 'lucide-react';

interface SignupPageProps {
  onNavigate: (route: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup, acceptCurrentTerms, latestTermsVersion } = useAuth();
  const [namespace, setNamespace] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namespace.trim() || !password) {
      setError('Please provide a namespace and password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service to register an account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signup(namespace.trim().toLowerCase(), password, displayName.trim() || undefined);

      // Automatically accept current terms upon signup agreement
      if (agreeTerms) {
        try {
          await acceptCurrentTerms();
        } catch {
          // Non-blocking if terms endpoint had issues
        }
      }

      onNavigate('dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during signup.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo size="md" showText={false} />
          </div>
          <h1 className="text-2xl font-display font-semibold text-ink">Create Twext Account</h1>
          <p className="text-sm text-ink-3">
            Claim your author namespace to publish and manage extensions on Twext.
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
            <label className="label block mb-1.5">
              Namespace <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-ink-3 font-mono">@</span>
              <input
                type="text"
                required
                pattern="^[a-zA-Z0-9_-]{2,32}$"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value.toLowerCase())}
                placeholder="your-namespace"
                className="input font-mono pl-7"
              />
            </div>
            <p className="text-xs text-ink-3 mt-1">
              Lowercase letters, numbers, and hyphens (e.g. <code>my-studio</code>). Packages will
              be named <code>@{namespace || 'your-namespace'}/package-id</code>.
            </p>
          </div>

          <div>
            <label className="label block mb-1.5">
              Display Name{' '}
              <span className="font-normal normal-case tracking-normal text-ink-3">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Kane Marshall"
              className="input"
            />
          </div>

          <div>
            <label className="label block mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="input"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded accent-lilac-500"
              />
              <span className="text-sm text-ink-2 leading-tight">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('terms')}
                  className="text-lilac-700 dark:text-lilac-300 hover:underline underline-offset-4"
                >
                  Terms of Service (v{latestTermsVersion ?? 1})
                </button>{' '}
                and understand that extensions are publicly inspectable.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 text-sm disabled:opacity-50 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register Namespace'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-line text-center">
          <p className="text-sm text-ink-2">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-lilac-700 dark:text-lilac-300 font-semibold hover:underline underline-offset-4 inline-flex items-center gap-0.5"
            >
              Sign in <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
