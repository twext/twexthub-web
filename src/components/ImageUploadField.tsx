import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ImageUp, Link2, Loader2, Trash2, Upload, X } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES, formatBytes, MAX_IMAGE_BYTES } from '../lib/profile-image';
import { ApiError, api } from '../services/api';
import { User } from '../types/api';

interface ImageUploadFieldProps {
  namespace: string;
  kind: 'avatar' | 'banner';
  label: string;
  /** The image the server currently reports: an upload path or an external URL. */
  currentUrl: string | null;
  /** Shown when there is no image at all, e.g. the avatar identicon. */
  fallbackUrl?: string;
  /**
   * The link the form will submit. Held by the parent so the settings form
   * keeps one Save button for every field; an upload writes the canonical path
   * the server returns straight into it.
   */
  urlValue: string;
  onUrlValueChange: (value: string) => void;
  onUploaded: (user: User) => void;
  onRemoved?: (user: User) => void;
  round?: boolean;
}

/**
 * Picks a local image and uploads it, rather than asking for a URL.
 *
 * The link input stays available but collapsed. An upload is what the instance
 * serves and is the obvious path; a link points at someone else's host, which
 * can go away or be blocked, so it is the secondary option. The two are kept
 * side by side on the server, and the link takes over only once the upload is
 * removed, so switching between them costs one click either way.
 */
export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  namespace,
  kind,
  label,
  currentUrl,
  fallbackUrl,
  urlValue,
  onUrlValueChange,
  onUploaded,
  onRemoved,
  round = false,
}) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // A failed upload has to fall back to what the server still reports, so the
  // optimistic preview is dropped whenever currentUrl moves under us.
  useEffect(() => {
    setLocalPreview(null);
  }, [currentUrl]);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMAGE_BYTES) {
        setError(
          `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`,
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setPending(true);
      setError(null);
      // Show the picked file straight away so the change is visible while the
      // request is in flight rather than only after it resolves.
      const objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);
      try {
        const updated = await api.uploadProfileImage(namespace, kind, file);
        // Adopt the server's canonical URL so the form state and the saved
        // profile agree even though the user never typed it.
        onUrlValueChange(updated.avatarUrl ?? updated.bannerUrl ?? '');
        onUploaded(updated);
      } catch (err) {
        setLocalPreview(null);
        setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.');
      } finally {
        URL.revokeObjectURL(objectUrl);
        setPending(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [namespace, kind, onUrlValueChange, onUploaded],
  );

  const remove = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const updated = await api.deleteProfileImage(namespace, kind);
      onUrlValueChange('');
      setLocalPreview(null);
      onRemoved?.(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the image.');
    } finally {
      setPending(false);
    }
  }, [namespace, kind, onUrlValueChange, onRemoved]);

  // The server reports an upload as this account's own canonical path and a link
  // as whatever the account pointed at, so the two are told apart by the path
  // this instance serves. Only an upload can be removed from here: a link is
  // cleared in the field below it and saved, which is also the only way to tell
  // the instance to stop reporting it.
  const isUpload = Boolean(currentUrl && currentUrl.includes(`/users/${namespace}/${kind}`));
  const hasImage = Boolean(currentUrl || localPreview);
  const displayed = localPreview ?? currentUrl ?? fallbackUrl ?? null;
  const shape = round ? 'rounded-full' : 'rounded-lg';
  const dimensions = round ? 'w-14 h-14' : 'w-24 h-16';

  return (
    <div className="sm:col-span-2 space-y-2">
      <span className="label block text-ink-2">
        <ImageUp className="w-3 h-3 inline mr-1" />
        {label}
      </span>

      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {displayed ? (
            <img
              src={displayed}
              alt={`${label} preview`}
              data-testid={`${kind}-preview`}
              className={`${shape} ${dimensions} object-cover bg-wash dark:bg-raised border border-line`}
            />
          ) : (
            <div
              data-testid={`${kind}-empty`}
              className={`${shape} ${dimensions} flex items-center justify-center bg-wash dark:bg-raised border border-dashed border-line text-ink-3`}
            >
              <ImageUp className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <label
              htmlFor={inputId}
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5 cursor-pointer"
              data-testid={`${kind}-choose`}
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {hasImage ? 'Replace image' : 'Choose image'}
            </label>

            {isUpload && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={pending}
                className="btn btn-ghost text-xs inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400"
                data-testid={`${kind}-remove`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowUrlInput((open) => !open)}
              className="text-[11px] text-ink-3 hover:text-ink-2 underline inline-flex items-center gap-1"
              data-testid={`${kind}-toggle-url`}
            >
              {showUrlInput ? <X className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {showUrlInput ? 'Hide link option' : 'Or use an image link'}
            </button>
          </div>

          <p className="text-[11px] text-ink-3">
            PNG, JPEG, GIF, WebP, or AVIF, up to {formatBytes(MAX_IMAGE_BYTES)}. Uploaded images are
            stored and served by this instance.
          </p>

          {showUrlInput && (
            <div className="space-y-1">
              <label htmlFor={`${inputId}-url`} className="text-[11px] text-ink-3 block">
                Image URL
              </label>
              <input
                id={`${inputId}-url`}
                type="url"
                value={urlValue}
                onChange={(e) => onUrlValueChange(e.target.value)}
                maxLength={400}
                placeholder="https://example.com/image.png"
                className="input text-xs"
                autoComplete="off"
                data-testid={`${kind}-url`}
              />
              <p className="text-[11px] text-ink-3">
                A link is referenced rather than uploaded, so it depends on another host staying up.
                {isUpload
                  ? ' The uploaded image is used while it exists; this is the fallback if it is removed.'
                  : ''}
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1"
              data-testid={`${kind}-error`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
