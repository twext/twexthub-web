import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_API_BASE_URL,
  getAppConfig,
  isValidApiBaseUrl,
  normalizeApiBaseUrl,
  resolveApiBaseUrl,
} from './settings';

describe('settings', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as { TWEXTHUB_CONFIG?: unknown }).TWEXTHUB_CONFIG;
  });

  describe('normalizeApiBaseUrl', () => {
    it('trims whitespace and trailing slashes', () => {
      expect(normalizeApiBaseUrl('  https://hub.example/api/v1/  ')).toBe(
        'https://hub.example/api/v1',
      );
    });

    it('keeps the root URL intact', () => {
      expect(normalizeApiBaseUrl('https://hub.example')).toBe('https://hub.example');
    });
  });

  describe('isValidApiBaseUrl', () => {
    it('accepts https absolute URLs', () => {
      expect(isValidApiBaseUrl('https://twexts.sdisk.us/api/v1')).toBe(true);
    });

    it('accepts loopback http URLs for development', () => {
      expect(isValidApiBaseUrl('http://localhost:8080/api/v1')).toBe(true);
      expect(isValidApiBaseUrl('http://127.0.0.1:8080/api/v1')).toBe(true);
      expect(isValidApiBaseUrl('http://api.localhost:8080/api/v1')).toBe(true);
    });

    it('rejects remote http URLs', () => {
      expect(isValidApiBaseUrl('http://twexts.sdisk.us/api/v1')).toBe(false);
      expect(isValidApiBaseUrl('http://192.168.1.10/api/v1')).toBe(false);
      expect(isValidApiBaseUrl('http://registry.internal.example/api/v1')).toBe(false);
    });

    it('rejects non-http schemes and bare strings', () => {
      expect(isValidApiBaseUrl('ftp://files.example/api/v1')).toBe(false);
      expect(isValidApiBaseUrl('twexts.sdisk.us/api/v1')).toBe(false);
      expect(isValidApiBaseUrl('')).toBe(false);
    });
  });

  describe('resolveApiBaseUrl', () => {
    it('falls back to the enforced default when nothing is configured', () => {
      expect(resolveApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    });

    it('prefers the build-time env var over the default', () => {
      vi.stubEnv('VITE_TWEXTHUB_API_URL', 'https://built.example/api/v1');
      expect(resolveApiBaseUrl()).toBe('https://built.example/api/v1');
    });

    it('prefers the injected server config over the build-time env var', () => {
      vi.stubEnv('VITE_TWEXTHUB_API_URL', 'https://built.example/api/v1');
      (window as { TWEXTHUB_CONFIG?: { apiBaseUrl?: string } }).TWEXTHUB_CONFIG = {
        apiBaseUrl: 'https://server.example/api/v1',
      };
      expect(resolveApiBaseUrl()).toBe('https://server.example/api/v1');
    });

    it('ignores an invalid injected value, keeping the default', () => {
      (window as { TWEXTHUB_CONFIG?: { apiBaseUrl?: string } }).TWEXTHUB_CONFIG = {
        apiBaseUrl: 'not a url',
      };
      expect(resolveApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    });

    it('treats an empty injected value as unset', () => {
      (window as { TWEXTHUB_CONFIG?: { apiBaseUrl?: string } }).TWEXTHUB_CONFIG = {
        apiBaseUrl: '',
      };
      expect(resolveApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    });
  });

  describe('getAppConfig', () => {
    it('returns the enforced base URL', () => {
      (window as { TWEXTHUB_CONFIG?: { apiBaseUrl?: string } }).TWEXTHUB_CONFIG = {
        apiBaseUrl: 'https://server.example/api/v1',
      };
      expect(getAppConfig()).toEqual({ apiBaseUrl: 'https://server.example/api/v1' });
    });
  });
});
