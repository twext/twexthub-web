/**
 * Shared between the profile image upload UI and its tests.
 *
 * Lives outside the component file so that module keeps exporting only a
 * component, which is what makes React Fast Refresh work in development.
 */

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
];

/** Kept in step with the server's limits.maxProfileImageBytes default. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Whether a reported image URL is this instance serving one of its own files,
 * as opposed to an address the account linked to.
 *
 * The server publishes an upload as `/users/{namespace}/{kind}` with a prefix
 * of the content digest as a `v` parameter, because the URL has to name the
 * bytes it serves: a re-upload changes them. Both the path and the version are
 * checked, since only the server's own serializer pairs that exact path with
 * that parameter. The origin is deliberately not compared: the address a
 * browser uses to reach the API can differ from the one the server considers
 * public, and refusing to recognise an upload over that difference would hide
 * the remove control.
 */
/** The digest prefix the server stamps on the uploads it publishes. */
const VERSION = /^[0-9a-f]{16}$/;

export function isOwnImageUrl(url: string | null | undefined, namespace: string, kind: string) {
  if (!url) return false;
  // The server publishes an absolute URL, but a root-relative one still names
  // the same file, so it is parsed against a placeholder base rather than
  // discarded. Only the path and the version are inspected, so the placeholder
  // origin is never compared against anything.
  const parsed = parseUrl(url);
  if (!parsed) return false;
  return (
    parsed.pathname.endsWith(`/users/${namespace}/${kind}`) &&
    VERSION.test(parsed.searchParams.get('v') ?? '')
  );
}

/**
 * Whether a URL names one of this instance's own uploads for any author,
 * rather than an address the account linked to.
 *
 * The same shape `isOwnImageUrl` checks, minus the namespace and kind. That is
 * what the image elements need when choosing whether an address is safe to
 * rewrite onto this site's own origin.
 */
export function looksLikeOwnUploadUrl(url: string | null | undefined) {
  if (!url) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  return (
    /\/users\/[^/]+\/(?:avatar|banner)$/.test(parsed.pathname) &&
    VERSION.test(parsed.searchParams.get('v') ?? '')
  );
}

/**
 * The src an <img> should use so the browser pulls the picture through this
 * site's own server instead of straight off the API host.
 *
 * The server reports an upload relative to its API base, so with an absolute
 * base the reported address alone is absolute too and points the browser at
 * the API host. When that address lives on the API origin (or is the public
 * `/api/v1` prefix, which this site's server proxies), it is rewritten to
 * that prefix plus the rest. Addresses on any other origin are left as they
 * are: a link is someone else's host by design, and no request to it should
 * be forced through this site.
 */
export function toSameOriginImageUrl(value: string | null | undefined, apiBaseUrl: string) {
  if (!value) return value;
  if (value.startsWith('/api/v1')) return value;
  const base = /^https?:\/\//i.test(apiBaseUrl) ? parseUrl(apiBaseUrl) : null;
  if (base) {
    const basePath = base.pathname.replace(/\/+$/, '');
    if (basePath && (value === basePath || value.startsWith(`${basePath}/`))) {
      return '/api/v1' + value.slice(basePath.length);
    }
    const parsed = parseUrl(value);
    if (parsed?.origin === base.origin) {
      if (basePath && parsed.pathname.startsWith(`${basePath}/`)) {
        return '/api/v1' + parsed.pathname.slice(basePath.length) + parsed.search;
      }
      if (parsed.pathname.startsWith('/api/v1')) {
        return parsed.pathname + parsed.search;
      }
    }
  } else if (looksLikeOwnUploadUrl(value)) {
    const parsed = parseUrl(value);
    if (parsed?.pathname.startsWith('/api/v1')) {
      return parsed.pathname + parsed.search;
    }
  }
  return value;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(value, 'http://placeholder.invalid');
    } catch {
      return null;
    }
  }
}
