# react-use-history

Drop-in `useState` upgrade with undo/redo, coalescing, transactions, pause/resume, time-travel, and keyboard shortcuts.

## Install

```bash
npm install github:Sam365x7/react-use-history
```

> Requires React 18+

## Quick start

```tsx
import { useHistory } from 'react-use-history';

function Editor() {
  const { state, set, undo, redo, canUndo, canRedo } = useHistory('');

  return (
    <>
      <textarea value={state} onChange={(e) => set(e.target.value)} />
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </>
  );
}
```

That's it. `set` works exactly like the setter from `useState`.

---

## Features

### Coalescing — merge rapid changes into one step

```tsx
const { state, set } = useHistory('', { coalesce: 800 });
// keystrokes within 800ms are merged into one undo step

// or use a custom predicate:
useHistory(value, { coalesce: (prev, next) => prev.type === next.type });
```

### Labeled entries

```tsx
set(newValue, { label: 'renamed layer' });
```

Labels show up in `history.past` so you can render a named history panel.

### Transactions — group multiple sets into one undo step

```tsx
const { set, transaction } = useHistory(items);

transaction(() => {
  set((prev) => deleteItem(prev, id));
  set((prev) => renumber(prev));
}); // undo reverses both at once
```

### Pause / Resume — useful for drag operations

```tsx
const { pause, resume, set } = useHistory(position);

onMouseDown={() => pause()}   // start drag — changes won't be recorded
onMouseUp={() => resume()}    // end drag — one undo step covers the whole drag
```

### Time-travel — jump to any point in history

```tsx
const { goto, history } = useHistory(color);

// history.timeline = [...past, present, ...future]
// history.index    = index of present in timeline

history.timeline.map((entry, i) => (
  <button
    key={i}
    onClick={() => goto(i)}
    style={{ fontWeight: i === history.index ? 'bold' : 'normal' }}
  >
    {entry.label ?? `Step ${i + 1}`}
  </button>
));
```

### Keyboard shortcuts

```tsx
import { useUndoShortcuts } from 'react-use-history';

const { undo, redo, canUndo, canRedo } = useHistory(state);

useUndoShortcuts({ undo, redo, canUndo, canRedo });
// Cmd+Z → undo, Cmd+Shift+Z / Cmd+Y → redo
```

### History limit

```tsx
useHistory(value, { limit: 50 }); // keep at most 50 past entries (default: 100)
```

---

## API

### `useHistory(initialState, options?)`

| Return value | Type | Description |
|---|---|---|
| `state` | `T` | Current value |
| `set` | `(value, opts?) => void` | Update state (records history) |
| `undo` | `() => void` | Step back |
| `redo` | `() => void` | Step forward |
| `goto` | `(index: number) => void` | Jump to any timeline position |
| `canUndo` | `boolean` | Whether undo is available |
| `canRedo` | `boolean` | Whether redo is available |
| `clear` | `() => void` | Reset to initial state, clear history |
| `pause` | `() => void` | Stop recording |
| `resume` | `() => void` | Resume recording |
| `transaction` | `(fn: () => void) => void` | Group sets into one step |
| `history.past` | `HistoryEntry<T>[]` | Past entries (oldest → newest) |
| `history.present` | `HistoryEntry<T>` | Current entry |
| `history.future` | `HistoryEntry<T>[]` | Future entries (if any) |
| `history.index` | `number` | Index of present in timeline |
| `history.timeline` | `HistoryEntry<T>[]` | `[...past, present, ...future]` |

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `100` | Max past entries to keep |
| `coalesce` | `number \| (prev, next) => boolean` | — | Merge threshold in ms, or custom predicate |

### `useUndoShortcuts({ undo, redo, canUndo?, canRedo?, enabled? })`

Binds Cmd+Z (undo) and Cmd+Shift+Z / Cmd+Y (redo) to the window. Pass `enabled: false` to disable.

### `createHistoryStore(initialState, options?)`

The headless store — same interface as above but usable outside React (e.g. in Zustand, a plain module, or tests).

---

## License

MIT
