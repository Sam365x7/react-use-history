import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { createHistoryStore, HistoryEntry, HistoryOptions, Updater } from './store';

export interface UseHistoryReturn<T> {
  state: T;
  set: (updater: Updater<T>, options?: { label?: string }) => void;
  undo: () => void;
  redo: () => void;
  goto: (index: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  pause: () => void;
  resume: () => void;
  transaction: (fn: () => void) => void;
  history: {
    past: HistoryEntry<T>[];
    present: HistoryEntry<T>;
    future: HistoryEntry<T>[];
    /** Position of present in the full timeline (= past.length). */
    index: number;
    /** Ordered array of every entry: [...past, present, ...future]. */
    timeline: HistoryEntry<T>[];
  };
}

export function useHistory<T>(
  initialState: T,
  options?: HistoryOptions<T>
): UseHistoryReturn<T> {
  // Keep options stable across renders with a ref
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const store = useMemo(
    () => createHistoryStore(initialState, optionsRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const snapshot = useSyncExternalStore(
    useCallback((cb) => store.subscribe(cb), [store]),
    useCallback(() => store.getSnapshot(), [store])
  );

  const timeline = useMemo(
    () => [...snapshot.past, snapshot.present, ...snapshot.future],
    [snapshot]
  );

  return {
    state: snapshot.present.state,
    set: useCallback(
      (updater, opts) => store.set(updater, opts),
      [store]
    ),
    undo: useCallback(() => store.undo(), [store]),
    redo: useCallback(() => store.redo(), [store]),
    goto: useCallback((index) => store.goto(index), [store]),
    clear: useCallback(() => store.clear(), [store]),
    pause: useCallback(() => store.pause(), [store]),
    resume: useCallback(() => store.resume(), [store]),
    transaction: useCallback((fn) => store.transaction(fn), [store]),
    canUndo: snapshot.past.length > 0,
    canRedo: snapshot.future.length > 0,
    history: {
      past: snapshot.past,
      present: snapshot.present,
      future: snapshot.future,
      index: snapshot.past.length,
      timeline,
    },
  };
}
