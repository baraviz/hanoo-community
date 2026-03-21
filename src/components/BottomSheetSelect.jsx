/**
 * BottomSheetSelect — native-feel mobile picker.
 *
 * Replaces any <select> element with a tappable trigger + animated bottom sheet
 * showing a scrollable list of options. Fully token-aware (light + dark).
 *
 * Props:
 *   value       — currently selected value
 *   onChange    — (value) => void
 *   options     — [{ value, label }]
 *   placeholder — string shown when nothing is selected
 *   label       — accessible label for the trigger button
 *   disabled    — boolean
 *   className   — extra classes for the trigger button
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function BottomSheetSelect({
  value,
  onChange,
  options = [],
  placeholder = "בחר...",
  label,
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);
  const triggerId = useRef(`bss-trigger-${Math.random().toString(36).slice(2)}`);
  const sheetId = useRef(`bss-sheet-${Math.random().toString(36).slice(2)}`);

  const selectedOption = options.find(o => o.value === value);

  function openSheet() {
    if (disabled) return;
    setClosing(false);
    setOpen(true);
  }

  function closeSheet() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 230);
  }

  function select(val) {
    onChange(val);
    closeSheet();
  }

  // Trap focus inside the sheet while open
  useEffect(() => {
    if (!open || !sheetRef.current) return;
    sheetRef.current.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") closeSheet(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        id={triggerId.current}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={sheetId.current}
        aria-label={label}
        disabled={disabled}
        onClick={openSheet}
        className={[
          "flex items-center justify-between gap-2 w-full rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          className,
        ].join(" ")}
        style={{
          background: "var(--btn-secondary-bg)",
          color: selectedOption ? "var(--text-primary)" : "var(--text-tertiary)",
          border: "1px solid var(--surface-card-border)",
          minHeight: 44,
        }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            color: "var(--text-tertiary)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{
            background: "rgba(0,0,0,0.45)",
            animation: closing ? "bssBackdropOut 0.23s ease-in forwards" : "bssBackdropIn 0.23s ease-out",
          }}
          onClick={closeSheet}
          aria-hidden="true"
        >
          <style>{`
            @keyframes bssBackdropIn  { from { opacity: 0; } to { opacity: 1; } }
            @keyframes bssBackdropOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes bssSlideUp     { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes bssSlideDown   { from { transform: translateY(0); } to { transform: translateY(100%); } }
          `}</style>

          <div
            ref={sheetRef}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            className="rounded-t-3xl w-full max-w-[430px] mx-auto outline-none"
            style={{
              background: "var(--sheet-bg)",
              paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
              animation: closing ? "bssSlideDown 0.23s ease-in forwards" : "bssSlideUp 0.23s ease-out",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Handle */}
            <div className="flex-none pt-4 pb-2 px-6">
              <div
                className="w-10 h-1 rounded-full mx-auto"
                style={{ background: "var(--sheet-handle)" }}
                aria-hidden="true"
              />
            </div>

            {/* Scrollable options */}
            <div className="flex-1 overflow-y-auto px-4 pb-2">
              {options.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(opt.value)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 mb-1"
                    style={{
                      background: isSelected ? "var(--hanoo-blue-light)" : "transparent",
                      color: isSelected ? "var(--hanoo-blue)" : "var(--text-primary)",
                      minHeight: 44,
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <Check size={16} aria-hidden="true" style={{ color: "var(--hanoo-blue)", flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}