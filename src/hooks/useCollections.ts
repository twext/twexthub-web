import { useCallback, useSyncExternalStore } from 'react';
import {
  clearRecentExtensions,
  clearSavedExtensions,
  getRecentSnapshot,
  getSavedSnapshot,
  recordExtensionView,
  removeExtensionSaved,
  subscribe,
  toggleExtensionSaved,
} from '../lib/collections';
import { Extension } from '../types/api';

export function useSavedExtensions() {
  const saved = useSyncExternalStore(subscribe, getSavedSnapshot, getSavedSnapshot);

  const isSaved = useCallback(
    (namespace: string, id: string) =>
      saved.some((item) => item.namespace === namespace && item.id === id),
    [saved],
  );

  const toggle = useCallback((extension: Extension) => toggleExtensionSaved(extension), []);
  const remove = useCallback(
    (namespace: string, id: string) => removeExtensionSaved(namespace, id),
    [],
  );
  const clear = useCallback(() => clearSavedExtensions(), []);

  return { saved, isSaved, toggle, remove, clear };
}

export function useRecentExtensions() {
  const recent = useSyncExternalStore(subscribe, getRecentSnapshot, getRecentSnapshot);
  const record = useCallback((extension: Extension) => recordExtensionView(extension), []);
  const clear = useCallback(() => clearRecentExtensions(), []);
  return { recent, record, clear };
}
