import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Trash2, X, AlertTriangle, Clock, CalendarDays, List, Pencil } from "lucide-react";

const DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const FULL_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const TOTAL_MINUTES = 24 * 60;
const HOURS = 24;

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function MyParking() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [blocks, setBlocks] = useState([]); // { id, dayIndex, start, end }
  const [savedBlocks, setSavedBlocks] = useState([]);
  const [tempBlocks, setTempBlocks] = useState([]); // { id, start_at, end_at } — temp slots
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingBlock, setEditingBlock] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [saved, setSaved] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    init();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function init() {
    const u = await base44.auth.me();
    setUser(u);
    const res = await base44.entities.Resident.filter({ user_email: u.email });
    if (res.length === 0) { setLoading(false); return; }
    const r = res[0];
    setResident(r);

    const [avail, temps] = await Promise.all([
      base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "recurring" }),
      base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "temp" }),
    ]);
    const loaded = avail.map(a => ({ id: a.id, dayIndex: a.days_of_week[0], start: a.time_start, end: a.time_end }));
    setBlocks(loaded);
    setSavedBlocks(loaded);
    // Only show future temp slots
    setTempBlocks(temps.filter(t => new Date(t.end_at) > new Date()));
    setLoading(false);
  }

  function getTimeFromY(y, totalHeight) {
    const pct = Math.min(Math.max(y / totalHeight, 0), 1);
    return Math.floor((pct * TOTAL_MINUTES) / 30) * 30;
  }

  function handleMouseDown(e, dayIndex) {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = getTimeFromY(y, rect.height);
    setIsDragging(true);
    setDragStart({ dayIndex, time });
    setDragCurrent({ dayIndex, time });
  }

  function handleTouchStart(e, dayIndex) {
    if (!gridRef.current) return;
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const y = touch.clientY - rect.top;
    const time = getTimeFromY(y, rect.height);
    setIsDragging(true);
    setDragStart({ dayIndex, time });
    setDragCurrent({ dayIndex, time });
  }

  function handleMouseMove(e) {
    if (!isDragging || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragCurrent(prev => ({ ...prev, time: getTimeFromY(y, rect.height) }));
  }

  function handleTouchMove(e) {
    if (!isDragging || !gridRef.current) return;
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const y = touch.clientY - rect.top;
    setDragCurrent(prev => ({ ...prev, time: getTimeFromY(y, rect.height) }));
  }

  async function handleDragEnd() {
    if (!isDragging || !dragStart || !dragCurrent) {
      setIsDragging(false); setDragStart(null); setDragCurrent(null);
      return;
    }
    const start = Math.min(dragStart.time, dragCurrent.time);
    const end = Math.max(dragStart.time, dragCurrent.time) + 30;
    addBlock(dragStart.dayIndex, start, end);
    setIsDragging(false); setDragStart(null); setDragCurrent(null);
    // auto-save after short delay so state updates first
    setTimeout(() => triggerSave(), 100);
  }

  function addBlock(dayIndex, newStart, newEnd) {
    setBlocks(prev => {
      let dayBlocks = prev.filter(b => b.dayIndex === dayIndex);
      const others = prev.filter(b => b.dayIndex !== dayIndex);
      const overlapping = dayBlocks.filter(b => newStart < b.end && newEnd > b.start);
      let fStart = newStart, fEnd = newEnd;
      if (overlapping.length > 0) {
        fStart = Math.min(newStart, ...overlapping.map(b => b.start));
        fEnd = Math.max(newEnd, ...overlapping.map(b => b.end));
        dayBlocks = dayBlocks.filter(b => !overlapping.includes(b));
      }
      return [...others, ...dayBlocks, { id: Math.random().toString(36).slice(2), dayIndex, start: fStart, end: fEnd }];
    });
  }



  function updateBlock(id, start, end) {
    if (end <= start) return;
    setBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, start, end } : b);
      setTimeout(() => saveChanges(updated), 100);
      return updated;
    });
    setEditingBlock(null);
  }

  function deleteBlock(id) {
    setBlocks(prev => {
      const updated = prev.filter(b => b.id !== id);
      setTimeout(() => saveChanges(updated), 100);
      return updated;
    });
    setEditingBlock(null);
  }

  async function saveChanges(currentBlocks) {
    if (!resident) return;
    setSaving(true);
    const toSave = currentBlocks ?? blocks;

    for (const b of savedBlocks) {
      await base44.entities.WeeklyAvailability.delete(b.id);
    }
    const created = [];
    for (const b of toSave) {
      const rec = await base44.entities.WeeklyAvailability.create({
        resident_id: resident.id,
        owner_email: user.email,
        building_id: resident.building_id,
        slot_type: "recurring",
        days_of_week: [b.dayIndex],
        time_start: b.start,
        time_end: b.end,
      });
      created.push({ id: rec.id, dayIndex: b.dayIndex, start: b.start, end: b.end });
    }
    setSavedBlocks(created);
    setBlocks(created);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function triggerSave() {
    setBlocks(current => {
      saveChanges(current);
      return current;
    });
  }

  const totalHours = blocks.reduce((acc, b) => acc + (b.end - b.start), 0) / 60;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#007AFF" }}>
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-gray-50"
      style={{ height: "calc(100vh - 64px)" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleDragEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleDragEnd}
    >
      {/* Header */}
      <div className="flex-none pt-12 pb-4 px-5" style={{ background: "#007AFF" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">החניה שלי 🅿️</h1>
            <p className="text-blue-200 text-xs mt-0.5">גרור לסימון שעות זמינות קבועות</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-2xl px-3 py-2 text-center">
            <p className="text-white text-lg font-bold">{totalHours.toFixed(1)}</p>
            <p className="text-blue-200 text-xs">שעות/שבוע</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden flex flex-col px-2 pt-2 pb-1">
        {/* Day headers */}
        <div className="flex mb-1" style={{ paddingRight: "36px" }}>
          {DAYS.map((d, i) => (
            <div key={i} className="flex-1 text-center text-xs font-bold text-gray-500">{d}</div>
          ))}
        </div>

        {/* Main grid area - padding top/bottom so first/last labels don't clip */}
        <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 8, paddingBottom: 8 }}>
          {/* Hour labels */}
          <div className="flex-none relative" style={{ width: 36 }}>
            {Array.from({ length: HOURS + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full pr-1 text-right"
                style={{ top: `${(i / HOURS) * 100}%`, transform: "translateY(-50%)" }}
              >
                <span className="text-[9px] text-gray-400 leading-none">
                  {String(i).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Columns */}
          <div
            ref={gridRef}
            className="flex-1 flex relative border border-gray-200 rounded-xl overflow-hidden bg-white"
            style={{ touchAction: "none" }}
          >
            {/* Hour lines */}
            {Array.from({ length: HOURS + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                style={{ top: `${(i / HOURS) * 100}%` }}
              />
            ))}

            {DAYS.map((_, dayIndex) => {
              const dayBlocks = blocks.filter(b => b.dayIndex === dayIndex);
              // Temp blocks for this day of week
              const dayTempBlocks = tempBlocks.filter(t => new Date(t.start_at).getDay() === dayIndex).map(t => ({
                id: t.id,
                start: new Date(t.start_at).getHours() * 60 + new Date(t.start_at).getMinutes(),
                end: new Date(t.end_at).getHours() * 60 + new Date(t.end_at).getMinutes(),
              }));
              const isDragDay = isDragging && dragStart?.dayIndex === dayIndex;
              const dragPreviewStart = isDragDay ? Math.min(dragStart.time, dragCurrent?.time ?? dragStart.time) : null;
              const dragPreviewEnd = isDragDay ? Math.max(dragStart.time, dragCurrent?.time ?? dragStart.time) + 30 : null;
              const isToday = dayIndex === currentTime.getDay();
              const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
              const currentTopPct = (currentMinutes / TOTAL_MINUTES) * 100;

              return (
                <div
                  key={dayIndex}
                  className="flex-1 relative cursor-crosshair"
                  style={{ borderRight: "1px solid #e5e7eb", background: isToday ? "rgba(0,122,255,0.04)" : undefined }}
                  onMouseDown={(e) => handleMouseDown(e, dayIndex)}
                  onTouchStart={(e) => handleTouchStart(e, dayIndex)}
                >
                  {/* Current time line */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none z-20 flex items-center"
                      style={{ top: `${currentTopPct}%`, transform: "translateY(-50%)" }}
                    >
                      <div className="absolute right-0 w-2.5 h-2.5 rounded-full bg-red-500" style={{ transform: "translateX(50%)" }} />
                      <div className="w-full border-t-2 border-red-500 opacity-80" />
                    </div>
                  )}

                  {/* Temp blocks */}
                  {dayTempBlocks.map(b => (
                    <div
                      key={b.id}
                      className="absolute rounded pointer-events-none select-none"
                      style={{
                        top: `${(b.start / TOTAL_MINUTES) * 100}%`,
                        height: `${((b.end - b.start) / TOTAL_MINUTES) * 100}%`,
                        left: 1, right: 1,
                        background: "rgba(0,122,255,0.12)",
                        border: "1.5px dashed #007AFF",
                        minHeight: 4,
                      }}
                    />
                  ))}

                  {/* Recurring Blocks */}
                  {dayBlocks.map(b => (
                    <div
                      key={b.id}
                      className="absolute rounded cursor-pointer select-none"
                      style={{
                        top: `${(b.start / TOTAL_MINUTES) * 100}%`,
                        height: `${((b.end - b.start) / TOTAL_MINUTES) * 100}%`,
                        left: 1, right: 1,
                        background: "rgba(0,122,255,0.85)",
                        minHeight: 4,
                      }}
                      onClick={(e) => { e.stopPropagation(); setEditingBlock(b); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => { e.stopPropagation(); setEditingBlock(b); }}
                    />
                  ))}

                  {/* Drag preview */}
                  {isDragDay && dragPreviewStart !== null && (
                    <div
                      className="absolute rounded pointer-events-none"
                      style={{
                        top: `${(dragPreviewStart / TOTAL_MINUTES) * 100}%`,
                        height: `${((dragPreviewEnd - dragPreviewStart) / TOTAL_MINUTES) * 100}%`,
                        left: 1, right: 1,
                        background: "rgba(0,122,255,0.35)",
                        border: "1.5px dashed rgba(0,122,255,0.7)",
                        minHeight: 4,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      {(saving || saved) && (
        <div className="flex-none px-4 pb-2 flex justify-center">
          {saving ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              שומר...
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-green-500">
              <Check size={12} /> נשמר
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingBlock && (
        <EditModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={(s, e) => updateBlock(editingBlock.id, s, e)}
          onDelete={() => deleteBlock(editingBlock.id)}
        />
      )}

      {/* Clear confirm */}
      {clearConfirm && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setClearConfirm(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-6 space-y-4"
            style={{ paddingBottom: "calc(80px + 1.5rem)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#FEE2E2" }}>
              <AlertTriangle size={24} style={{ color: "#EF4444" }} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center">נקה לוח זמינות?</h2>
            <p className="text-gray-500 text-center text-sm">כל השעות שסימנת יימחקו</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setClearConfirm(false)} className="py-3 rounded-2xl font-bold text-gray-700" style={{ background: "#F3F4F6" }}>ביטול</button>
              <button onClick={() => { setBlocks([]); setClearConfirm(false); }} className="py-3 rounded-2xl font-bold text-white" style={{ background: "#EF4444" }}>נקה</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ block, onClose, onSave, onDelete }) {
  const [sH, setSH] = useState(Math.floor(block.start / 60));
  const [sM, setSM] = useState(block.start % 60);
  const [eH, setEH] = useState(Math.floor(block.end / 60));
  const [eM, setEM] = useState(block.end % 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{`יום ${["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"][block.dayIndex]}`}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          {[
            { label: "מ", h: sH, setH: setSH, m: sM, setM: setSM, max: 23 },
            { label: "עד", h: eH, setH: setEH, m: eM, setM: setEM, max: 24 },
          ].map(({ label, h, setH, m, setM, max }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-6">{label}</span>
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2">
                <select value={h} onChange={e => setH(Number(e.target.value))} className="flex-1 bg-transparent text-center font-mono font-bold text-gray-800 outline-none">
                  {Array.from({ length: max + 1 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}</option>)}
                </select>
                <span className="text-gray-400 font-bold">:</span>
                <select value={m} onChange={e => setM(Number(e.target.value))} className="flex-1 bg-transparent text-center font-mono font-bold text-gray-800 outline-none">
                  {[0, 30].map(v => <option key={v} value={v}>{String(v).padStart(2, "0")}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { onDelete(); }} className="w-12 h-12 flex-none rounded-2xl flex items-center justify-center" style={{ background: "#FEE2E2", color: "#EF4444" }}>
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => onSave(sH * 60 + sM, eH * 60 + eM)}
            className="flex-1 py-3 rounded-2xl font-bold text-white"
            style={{ background: "#007AFF" }}
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}