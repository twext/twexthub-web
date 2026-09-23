export const DEFAULT_API_BASE_URL = 'https://twexts.sdisk.us/api/v1';

export interface AppConfig {
  apiBaseUrl: string;
}

declare global {
  interface Window {
    TWEXTHUB_CONFIG?: { apiBaseUrl?: unknown };
  }
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

/**
 * Remote APIs must use HTTPS so bearer tokens never travel in cleartext and
 * to avoid mixed-content failures on HTTPS-hosted pages. Plain HTTP is only
 * accepted for loopback development URLs such as http://localhost:8080/api/v1.
 */
export function isValidApiBaseUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizeApiBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

export function resolveApiBaseUrl(): string {
  const buildUrl = import.meta.env.VITE_TWEXTHUB_API_URL as string | undefined;
  const runtimeUrl = typeof window !== 'undefined' ? window.TWEXTHUB_CONFIG?.apiBaseUrl : undefined;

  const candidates: Array<{ value: string; source: string }> = [
    { value: DEFAULT_API_BASE_URL, source: 'default' },
  ];
  const configured: Array<{ raw: unknown; source: string }> = [
    { raw: buildUrl, source: 'build env (VITE_TWEXTHUB_API_URL)' },
    { raw: runtimeUrl, source: 'server (config file / TWEXTHUB_API_URL)' },
  ];

  for (const candidate of configured) {
    if (typeof candidate.raw !== 'string' || !candidate.raw.trim()) continue;
    if (isValidApiBaseUrl(candidate.raw)) {
      candidates.push({ value: normalizeApiBaseUrl(candidate.raw), source: candidate.source });
    } else {
      console.warn(`Ignoring invalid API base URL from ${candidate.source}: "${candidate.raw}".`);
    }
  }

  const chosen = candidates[candidates.length - 1];
  if (chosen.source !== 'default') {
    console.info(`TwextHub API base URL: ${chosen.value} (${chosen.source}).`);
  }
  return chosen.value;
}

export function getAppConfig(): AppConfig {
  return { apiBaseUrl: resolveApiBaseUrl() };
}
