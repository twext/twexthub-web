import { describe, expect, it, vi } from 'vitest';

// Importing server.js starts an HTTP server; keep the side effects out of tests.
vi.mock('node:http', () => {
  const createServer = vi.fn(() => ({ listen: vi.fn() }));
  return { createServer, default: { createServer } };
});

import { isWithinUpstreamBase, proxyTargetFor, readApiBaseUrlFromYaml } from './server.js';

describe('readApiBaseUrlFromYaml', () => {
  it('reads unquoted values', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl: https://registry.example.com/api/v1')).toBe(
      'https://registry.example.com/api/v1',
    );
  });

  it('reads double-quoted values without the surrounding quotes', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl: "http://localhost:8080/api/v1"')).toBe(
      'http://localhost:8080/api/v1',
    );
  });

  it('reads single-quoted values without the surrounding quotes', () => {
    expect(readApiBaseUrlFromYaml("apiBaseUrl: 'http://localhost:8080/api/v1'")).toBe(
      'http://localhost:8080/api/v1',
    );
  });

  it('strips trailing comments and whitespace before unquoting', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl:  "https://a.example/api/v1"  # the registry')).toBe(
      'https://a.example/api/v1',
    );
  });

  it('returns null for missing or mismatched quotes', () => {
    expect(readApiBaseUrlFromYaml('apiBaseUrl:\nother: value')).toBeNull();
    expect(readApiBaseUrlFromYaml('apiBaseUrl: "https://a.example/api/v1')).toBeNull();
  });

  it('ignores other keys and comments', () => {
    expect(readApiBaseUrlFromYaml('# apiBaseUrl: https://ignored/api/v1\nfoo: bar')).toBeNull();
  });
});

describe('proxyTargetFor', () => {
  it('forwards the public API path onto the upstream base, keeping the query', () => {
    expect(
      proxyTargetFor('/api/v1/extensions', '?q=pen&page=2', 'https://registry.example/api/v1'),
    ).toBe('https://registry.example/api/v1/extensions?q=pen&page=2');
  });

  it('maps the bare public root onto the upstream root', () => {
    expect(proxyTargetFor('/api/v1', '', 'http://localhost:8080/api/v1')).toBe(
      'http://localhost:8080/api/v1',
    );
  });

  it('strips the public prefix, never the upstream one', () => {
    expect(proxyTargetFor('/api/v1/a/b', '?x=1', 'http://localhost:8080/api/v1')).toBe(
      'http://localhost:8080/api/v1/a/b?x=1',
    );
  });
});

describe('isWithinUpstreamBase', () => {
  const base = 'https://registry.example/api/v1';

  it('accepts the base itself and anything below it', () => {
    expect(isWithinUpstreamBase(new URL('https://registry.example/api/v1'), base)).toBe(true);
    expect(isWithinUpstreamBase(new URL('https://registry.example/api/v1/extensions'), base)).toBe(
      true,
    );
  });

  it('keeps a double-encoded dot segment from collapsing out of the base', () => {
    // `%252e` survives one decode as `%2e`, which the URL parser still reads as
    // a `..` segment. Building from the raw path keeps the whole thing opaque.
    const raw = '/api/v1/%252e%252e/%252e%252e/admin/keys';
    expect(new URL(proxyTargetFor(decodeURIComponent(raw), '', base)).pathname).toBe('/admin/keys');
    expect(new URL(proxyTargetFor(raw, '', base)).pathname).toBe(raw);
  });

  it('rejects a target that resolved above the base path', () => {
    expect(isWithinUpstreamBase(new URL('https://registry.example/admin/keys'), base)).toBe(false);
  });

  it('rejects a sibling path that only shares a prefix string', () => {
    expect(isWithinUpstreamBase(new URL('https://registry.example/api/v10/keys'), base)).toBe(
      false,
    );
  });

  it('accepts any path when the base is a bare origin', () => {
    expect(
      isWithinUpstreamBase(
        new URL('https://registry.example/anything'),
        'https://registry.example',
      ),
    ).toBe(true);
  });
});
