import { useEffect } from 'react';

interface UndoShortcutsOptions {
  undo: () => void;
  redo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  enabled?: boolean;
}

export function useUndoShortcuts({
  undo,
  redo,
  canUndo = true,
  canRedo = true,
  enabled = true,
}: UndoShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if (
        (e.key === 'z' && e.shiftKey) ||
        e.key === 'y'
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, enabled]);
}
