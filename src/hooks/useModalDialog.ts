import React, { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseModalDialogOptions {
  /** id of the element (usually the h2) naming the dialog. */
  labelledById?: string;
  /** Accessible name for dialogs without a labelling element. */
  ariaLabel?: string;
  /** Optional Escape handler; omit if the modal manages Escape itself. */
  onClose?: () => void;
  /**
   * Whether the dialog is currently shown. Focus capture, trapping, Escape,
   * and focus restoration run only while enabled. Defaults to true for modals
   * that mount only while open; pass the open flag for persistent components.
   */
  enabled?: boolean;
}

/**
 * Wires up modal dialog semantics: dialog role, accessible name, initial
 * focus, Tab trapping, Escape handling, and focus restoration to the trigger
 * that opened it.
 */
export function useModalDialog<T extends HTMLElement>({
  labelledById,
  ariaLabel,
  onClose,
  enabled = true,
}: UseModalDialogOptions) {
  const dialogRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? dialog).focus();
    }
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, onClose]);

  const dialogProps = {
    role: 'dialog' as const,
    'aria-modal': true,
    ...(labelledById
      ? { 'aria-labelledby': labelledById }
      : ariaLabel
        ? { 'aria-label': ariaLabel }
        : {}),
    ref: dialogRef,
    tabIndex: -1,
  };

  return { dialogProps };
}

export type ModalDialogProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement | null>;
};
