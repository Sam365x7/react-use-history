export type Updater<T> = T | ((prev: T) => T);

export interface HistoryEntry<T> {
  state: T;
  label?: string;
  timestamp: number;
}

export interface HistoryOptions<T> {
  limit?: number;
  coalesce?: number | ((prev: T, next: T) => boolean);
}

export interface HistorySnapshot<T> {
  past: HistoryEntry<T>[];
  present: HistoryEntry<T>;
  future: HistoryEntry<T>[];
}

export interface HistoryStore<T> {
  getSnapshot(): HistorySnapshot<T>;
  set(updater: Updater<T>, options?: { label?: string }): void;
  undo(): void;
  redo(): void;
  goto(index: number): void;
  clear(): void;
  pause(): void;
  resume(): void;
  transaction(fn: () => void): void;
  subscribe(listener: () => void): () => void;
}

export function createHistoryStore<T>(
  initialState: T,
  options: HistoryOptions<T> = {}
): HistoryStore<T> {
  const { limit = 100 } = options;

  let past: HistoryEntry<T>[] = [];
  let present: HistoryEntry<T> = { state: initialState, timestamp: Date.now() };
  let future: HistoryEntry<T>[] = [];
  let paused = false;
  let pauseCheckpoint: HistoryEntry<T> | null = null;
  let inTransaction = false;
  let transactionStart: HistoryEntry<T> | null = null;
  let listeners: (() => void)[] = [];
  let cachedSnapshot: HistorySnapshot<T> = { past, present, future };

  function notify() {
    cachedSnapshot = { past, present, future };
    for (const l of listeners) l();
  }

  function shouldCoalesce(prev: T, next: T): boolean {
    const { coalesce } = options;
    if (!coalesce) return false;
    if (typeof coalesce === 'function') return coalesce(prev, next);
    // time-based: merge if last entry was within coalesce ms
    return Date.now() - present.timestamp < coalesce;
  }

  function push(entry: HistoryEntry<T>) {
    if (shouldCoalesce(present.state, entry.state)) {
      // Replace present timestamp and label but keep past intact
      present = { ...entry, timestamp: entry.timestamp };
    } else {
      past = [...past, present].slice(-limit);
      present = entry;
    }
    future = [];
  }

  return {
    getSnapshot() {
      return cachedSnapshot;
    },

    set(updater, setOptions) {
      const next =
        typeof updater === 'function'
          ? (updater as (prev: T) => T)(present.state)
          : updater;

      const entry: HistoryEntry<T> = {
        state: next,
        label: setOptions?.label,
        timestamp: Date.now(),
      };

      if (paused) {
        // While paused: update present value without recording history.
        // The pre-pause checkpoint stays in past so undo can recover it.
        present = entry;
        notify();
        return;
      }

      if (inTransaction) {
        // During a transaction accumulate value changes but don't push to past yet
        present = entry;
        notify();
        return;
      }

      push(entry);
      notify();
    },

    undo() {
      if (past.length === 0) return;
      future = [present, ...future];
      present = past[past.length - 1];
      past = past.slice(0, -1);
      notify();
    },

    redo() {
      if (future.length === 0) return;
      past = [...past, present].slice(-limit);
      present = future[0];
      future = future.slice(1);
      notify();
    },

    goto(index: number) {
      const timeline = [...past, present, ...future];
      const clamped = Math.max(0, Math.min(index, timeline.length - 1));
      past = timeline.slice(0, clamped);
      present = timeline[clamped];
      future = timeline.slice(clamped + 1);
      notify();
    },

    clear() {
      past = [];
      future = [];
      present = { state: initialState, timestamp: Date.now() };
      notify();
    },

    pause() {
      if (paused) return;
      paused = true;
      // Save current present as the checkpoint we'll restore on undo
      pauseCheckpoint = present;
      past = [...past, present].slice(-limit);
    },

    resume() {
      if (!paused) return;
      paused = false;
      pauseCheckpoint = null;
      // present already has the latest value set while paused
      future = [];
      notify();
    },

    transaction(fn) {
      if (inTransaction) {
        fn(); // nested transactions just execute
        return;
      }
      inTransaction = true;
      transactionStart = present;
      fn();
      inTransaction = false;
      // Only push one entry for the whole transaction
      if (present !== transactionStart) {
        const entry: HistoryEntry<T> = { ...present };
        past = [...past, transactionStart!].slice(-limit);
        present = entry;
        future = [];
        notify();
      }
      transactionStart = null;
    },

    subscribe(listener) {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
  };
}
