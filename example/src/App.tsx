import React from 'react';
import { useHistory, useUndoShortcuts } from '../../src/index';

const btn: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #ccc',
  cursor: 'pointer',
  fontSize: 14,
};

const disabledBtn: React.CSSProperties = {
  ...btn,
  opacity: 0.4,
  cursor: 'not-allowed',
};

// ── Demo 1: Text editor with coalescing ──────────────────────────────────────
function TextDemo() {
  const { state, set, undo, redo, canUndo, canRedo, history } = useHistory('', {
    coalesce: 800,  // rapid keystrokes within 800ms merge into one step
    limit: 50,
  });

  useUndoShortcuts({ undo, redo, canUndo, canRedo });

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Text editor — coalescing</h2>
      <p style={{ color: '#666', fontSize: 13 }}>
        Type quickly → one undo step. Pause &gt;800ms → new step. Cmd+Z / Cmd+Shift+Z work too.
      </p>
      <textarea
        value={state}
        onChange={(e) => set(e.target.value)}
        rows={4}
        style={{ width: '100%', fontSize: 15, padding: 8, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button style={canUndo ? btn : disabledBtn} onClick={undo} disabled={!canUndo}>
          ↩ Undo
        </button>
        <button style={canRedo ? btn : disabledBtn} onClick={redo} disabled={!canRedo}>
          ↪ Redo
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>
        History steps: {history.past.length + 1} &nbsp;|&nbsp; Future: {history.future.length}
      </p>
    </section>
  );
}

// ── Demo 2: List with transactions ───────────────────────────────────────────
interface Item { id: number; text: string }

function ListDemo() {
  const { state, set, undo, redo, canUndo, canRedo, transaction, history } =
    useHistory<Item[]>([
      { id: 1, text: 'Buy groceries' },
      { id: 2, text: 'Call dentist' },
      { id: 3, text: 'Fix CI pipeline' },
    ]);

  function deleteItem(id: number) {
    // transaction groups delete + renumber into ONE undo step
    transaction(() => {
      set(
        (prev) => prev.filter((i) => i.id !== id),
        { label: `delete item ${id}` }
      );
    });
  }

  function addItem() {
    set(
      (prev) => [...prev, { id: Date.now(), text: `New item ${prev.length + 1}` }],
      { label: 'add item' }
    );
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>List — transactions + labels</h2>
      <p style={{ color: '#666', fontSize: 13 }}>
        Each delete is one labeled undo step. The history panel shows the labels.
      </p>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {state.map((item) => (
          <li key={item.id} style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
            <span style={{ flex: 1 }}>{item.text}</span>
            <button style={{ ...btn, color: 'crimson' }} onClick={() => deleteItem(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={btn} onClick={addItem}>+ Add item</button>
        <button style={canUndo ? btn : disabledBtn} onClick={undo} disabled={!canUndo}>
          ↩ Undo
        </button>
        <button style={canRedo ? btn : disabledBtn} onClick={redo} disabled={!canRedo}>
          ↪ Redo
        </button>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: '#555' }}>
        <strong>History:</strong>
        <ol style={{ marginTop: 4 }}>
          {history.past.map((entry, i) => (
            <li key={i}>{entry.label ?? '(unlabeled)'}</li>
          ))}
          <li><strong>→ {history.present.label ?? '(current)'}</strong></li>
        </ol>
      </div>
    </section>
  );
}

// ── Demo 3: pause / resume ───────────────────────────────────────────────────
function PauseDemo() {
  const { state, set, undo, redo, canUndo, canRedo, pause, resume } =
    useHistory(0);
  const [isPaused, setIsPaused] = React.useState(false);

  function togglePause() {
    if (isPaused) { resume(); setIsPaused(false); }
    else          { pause();  setIsPaused(true); }
  }

  return (
    <section>
      <h2>Counter — pause / resume</h2>
      <p style={{ color: '#666', fontSize: 13 }}>
        While paused, increments are NOT recorded. Resume to make future increments undoable again.
      </p>
      <p style={{ fontSize: 28, fontWeight: 'bold' }}>{state}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btn} onClick={() => set((n) => n + 1)}>+1</button>
        <button style={canUndo ? btn : disabledBtn} onClick={undo} disabled={!canUndo}>↩ Undo</button>
        <button style={canRedo ? btn : disabledBtn} onClick={redo} disabled={!canRedo}>↪ Redo</button>
        <button
          style={{ ...btn, background: isPaused ? '#fef3c7' : undefined }}
          onClick={togglePause}
        >
          {isPaused ? '▶ Resume recording' : '⏸ Pause recording'}
        </button>
      </div>
    </section>
  );
}

// ── Demo 4: Time-travel — click any point in the timeline ───────────────────
const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

function TimeTravelDemo() {
  const { state, set, goto, history } = useHistory('#3b82f6');

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Color picker — time-travel</h2>
      <p style={{ color: '#666', fontSize: 13 }}>
        Click a swatch to pick a color. Then click any dot in the timeline to jump to that moment.
      </p>

      {/* Big color preview */}
      <div
        style={{
          width: 120, height: 120, borderRadius: 12,
          background: state, marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'background 0.15s',
        }}
      />

      {/* Color swatches */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PALETTE.map((color) => (
          <button
            key={color}
            onClick={() => set(color, { label: color })}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: color, border: state === color ? '3px solid #000' : '2px solid transparent',
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>

      {/* Timeline strip */}
      <div>
        <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
          Timeline ({history.timeline.length} step{history.timeline.length !== 1 ? 's' : ''})
          — click any dot to jump there:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {history.timeline.map((entry, i) => {
            const isCurrent = i === history.index;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div style={{
                    width: 16, height: 2,
                    background: i <= history.index ? '#555' : '#ccc',
                  }} />
                )}
                <button
                  onClick={() => goto(i)}
                  title={entry.label ?? `Step ${i}`}
                  style={{
                    width: isCurrent ? 24 : 18,
                    height: isCurrent ? 24 : 18,
                    borderRadius: '50%',
                    background: entry.state as string,
                    border: isCurrent ? '3px solid #000' : '2px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.1s',
                    flexShrink: 0,
                  }}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 4 }}>react-use-history</h1>
      <p style={{ color: '#888', marginBottom: 40 }}>
        Drop-in <code>useState</code> upgrade with undo/redo, coalescing, transactions, and labels.
      </p>
      <TextDemo />
      <ListDemo />
      <PauseDemo />
      <TimeTravelDemo />
    </div>
  );
}
