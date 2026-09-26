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
    /^[0-9a-f]{16}$/.test(parsed.searchParams.get('v') ?? '')
  );
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
