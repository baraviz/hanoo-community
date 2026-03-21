import { useRef, useEffect } from "react";

const ITEM_HEIGHT = 44;

function fmt(t) {
  const h = Math.floor(t / 60), m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function TimeWheelPicker({ options, value, onChange, color = "#007AFF", label = "בחר שעה" }) {
  const listRef = useRef(null);

  // Scroll to selected on mount / value change
  useEffect(() => {
    if (!listRef.current) return;
    const idx = options.indexOf(value);
    if (idx >= 0) listRef.current.scrollTop = idx * ITEM_HEIGHT;
  }, [value, options]);

  function onScroll() {
    if (!listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, options.length - 1));
    if (options[clamped] !== value) onChange(options[clamped]);
  }

  const selectedIdx = options.indexOf(value);

  return (
    <div
      className="relative flex flex-col items-center select-none"
      style={{ height: ITEM_HEIGHT * 5 }}
      role="group"
      aria-label={label}
    >
      {/* Fade top */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{
          height: ITEM_HEIGHT * 2,
          background: "linear-gradient(to bottom, var(--sheet-bg, #fff) 0%, transparent 100%)",
        }}
      />
      {/* Highlight bar */}
      <div
        aria-hidden="true"
        className="absolute inset-x-4 z-10 rounded-xl pointer-events-none"
        style={{
          top: ITEM_HEIGHT * 2,
          height: ITEM_HEIGHT,
          background: `${color}18`,
          border: `2px solid ${color}33`,
        }}
      />
      {/* Fade bottom */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: ITEM_HEIGHT * 2,
          background: "linear-gradient(to top, var(--sheet-bg, #fff) 0%, transparent 100%)",
        }}
      />

      {/* Scroll list */}
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        aria-activedescendant={value != null ? `twp-opt-${value}` : undefined}
        tabIndex={0}
        onScroll={onScroll}
        // Keyboard support: arrow keys scroll the list
        onKeyDown={e => {
          if (!listRef.current) return;
          const idx = options.indexOf(value);
          if (e.key === "ArrowDown" && idx < options.length - 1) {
            e.preventDefault();
            onChange(options[idx + 1]);
            listRef.current.scrollTop = (idx + 1) * ITEM_HEIGHT;
          } else if (e.key === "ArrowUp" && idx > 0) {
            e.preventDefault();
            onChange(options[idx - 1]);
            listRef.current.scrollTop = (idx - 1) * ITEM_HEIGHT;
          }
        }}
        className="w-full overflow-y-scroll outline-none"
        style={{
          height: ITEM_HEIGHT * 5,
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Padding top so first item can center */}
        <div aria-hidden="true" style={{ height: ITEM_HEIGHT * 2 }} />

        {options.map((t, i) => (
          <div
            key={t}
            id={`twp-opt-${t}`}
            role="option"
            aria-selected={value === t}
            aria-label={fmt(t)}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: "bold",
              fontFamily: "monospace",
              color: value === t ? color : "#9CA3AF",
              transition: "color 0.15s",
              cursor: "pointer",
            }}
            onClick={() => {
              onChange(t);
              if (listRef.current) listRef.current.scrollTop = i * ITEM_HEIGHT;
            }}
          >
            {fmt(t)}
          </div>
        ))}

        {/* Padding bottom so last item can center */}
        <div aria-hidden="true" style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
}