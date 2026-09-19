import { describe, expect, it, vi } from 'vitest';

// Importing server.js starts an HTTP server; keep the side effects out of tests.
vi.mock('node:http', () => {
  const createServer = vi.fn(() => ({ listen: vi.fn() }));
  return { createServer, default: { createServer } };
});

import { readApiBaseUrlFromYaml } from './server.js';

describe('readApiBaseUrlFromYaml', () => {
  it('reads unquoted values', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl: https://registry.example.com/api/v0')).toBe(
      'https://registry.example.com/api/v0',
    );
  });

  it('reads double-quoted values without the surrounding quotes', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl: "http://localhost:8080/api/v0"')).toBe(
      'http://localhost:8080/api/v0',
    );
  });

  it('reads single-quoted values without the surrounding quotes', () => {
    expect(readApiBaseUrlFromYaml("apiBaseUrl: 'http://localhost:8080/api/v0'")).toBe(
      'http://localhost:8080/api/v0',
    );
  });

  it('strips trailing comments and whitespace before unquoting', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl:  "https://a.example/api/v0"  # the registry')).toBe(
      'https://a.example/api/v0',
    );
  });

  it('returns null for missing or mismatched quotes', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl:\nother: value')).toBeNull();
    expect(readApiBaseUrlFromYaml('apiBaseUrl: "https://a.example/api/v0')).toBeNull();
  });

  it('ignores other keys and comments', () => {
    expect(readApiBaseUrlFromYaml('# apiBaseUrl: https://ignored/api/v0\nfoo: bar')).toBeNull();
  });
});
