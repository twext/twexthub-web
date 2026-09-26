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
