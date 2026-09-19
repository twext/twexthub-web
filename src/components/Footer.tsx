import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Meta } from '../types/api';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getMeta()
      .then((data) => {
        if (isMounted) setMeta(data);
      })
      .catch(() => {
        // Product metadata is optional; fall back to the built-in copy.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="bg-surface border-t border-line mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & summary */}
          <div className="md:col-span-2 space-y-3">
            <BrandLogo size="md" />
            <p className="text-sm text-ink-2 max-w-sm leading-relaxed">
              {meta?.tagline ||
                'TwextHub is the official registry of Twexts. Discover and distribute community extensions built with the zero-config Twext compiler.'}
            </p>
          </div>

          {/* Col 2: Registry & Resources */}
          <div>
            <h2 className="label mb-3">Registry</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('search')}
                  className="text-ink-2 hover:text-lilac-700 dark:hover:text-lilac-300 transition-colors"
                >
                  Explore Extensions
                </button>
              </li>
              <li>
                <a
                  href="https://turbowarp.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-2 hover:text-lilac-700 dark:hover:text-lilac-300 transition-colors inline-flex items-center gap-1"
                >
                  TurboWarp Editor <ExternalLink className="w-2.5 h-2.5 text-ink-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Governance */}
          <div>
            <h2 className="label mb-3">Governance</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="text-ink-2 hover:text-lilac-700 dark:hover:text-lilac-300 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="text-ink-2 hover:text-lilac-700 dark:hover:text-lilac-300 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('sessions-tokens')}
                  className="text-ink-2 hover:text-lilac-700 dark:hover:text-lilac-300 transition-colors"
                >
                  CI Automation Tokens
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
          <div>
            <span>© 2026 {meta?.name || 'Twext Team'}. Public TurboWarp extension registry.</span>
            {meta?.version && <span className="ml-2 font-mono">v{meta.version}</span>}
          </div>
          {meta?.homepage && (
            <a
              href={meta.homepage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-lilac-700 dark:hover:text-lilac-300 transition-colors"
            >
              {meta.homepage.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
};
