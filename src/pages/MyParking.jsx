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
  const [blockSlots, setBlockSlots] = useState([]); // active blocks (slot_type="block")
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingBlock, setEditingBlock] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "list"
  const [editingTemp, setEditingTemp] = useState(null);
  const [addDaySheet, setAddDaySheet] = useState(false); // bottom sheet for adding a new day
  const [addDayStep, setAddDayStep] = useState("day"); // "day" | "times"
  const [addDayIndex, setAddDayIndex] = useState(null);
  const [addDayRanges, setAddDayRanges] = useState([{ sH: 8, sM: 0, eH: 10, eM: 0 }]);
  const gridRef = useRef(null);
  const saveInProgress = useRef(false);
  const pendingSave = useRef(null);
  const savedBlocksRef = useRef([]);

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

    const [avail, temps, bSlots] = await Promise.all([
      base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "recurring" }),
      base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "temp" }),
      base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "block" }),
    ]);
    const loaded = avail.map(a => ({ id: a.id, dayIndex: a.days_of_week[0], start: a.time_start, end: a.time_end }));
    setBlocks(loaded);
    setSavedBlocks(loaded);
    savedBlocksRef.current = loaded;
    // Only show future temp slots
    setTempBlocks(temps.filter(t => new Date(t.end_at) > new Date()));
    setBlockSlots(bSlots.filter(b => new Date(b.end_at) > new Date()));
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
      const dayIndex = prev.find(b => b.id === id)?.dayIndex;
      if (dayIndex === undefined) return prev;
      // Remove the block being edited, then merge like addBlock does
      const withoutEdited = prev.filter(b => b.id !== id);
      const dayBlocks = withoutEdited.filter(b => b.dayIndex === dayIndex);
      const others = withoutEdited.filter(b => b.dayIndex !== dayIndex);
      const overlapping = dayBlocks.filter(b => start < b.end && end > b.start);
      let fStart = start, fEnd = end;
      if (overlapping.length > 0) {
        fStart = Math.min(start, ...overlapping.map(b => b.start));
        fEnd = Math.max(end, ...overlapping.map(b => b.end));
      }
      const remaining = dayBlocks.filter(b => !overlapping.includes(b));
      const updated = [...others, ...remaining, { id, dayIndex, start: fStart, end: fEnd }];
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
    // If already saving, queue this as the latest pending save
    if (saveInProgress.current) {
      pendingSave.current = currentBlocks;
      return;
    }
    saveInProgress.current = true;
    setSaving(true);
    const toSave = currentBlocks ?? blocks;

    // Capture savedBlocks at call time before any async ops
    const blocksToDelete = savedBlocks.slice();
    for (const b of blocksToDelete) {
      try { await base44.entities.WeeklyAvailability.delete(b.id); } catch (_) {}
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
    saveInProgress.current = false;

    // If a save was queued while we were saving, run it now
    if (pendingSave.current !== null) {
      const next = pendingSave.current;
      pendingSave.current = null;
      await saveChanges(next);
    }
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
            <p className="text-blue-200 text-xs mt-0.5">
              {viewMode === "calendar" ? "גרור לסימון שעות זמינות קבועות" : "כל הזמינויות שלך"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white bg-opacity-20 rounded-2xl px-3 py-2 text-center">
              <p className="text-white text-lg font-bold">{totalHours.toFixed(1)}</p>
              <p className="text-blue-200 text-xs">שעות/שבוע</p>
            </div>
            {/* Toggle */}
            <div className="bg-white bg-opacity-20 rounded-2xl p-1 flex gap-1">
              <button
                onClick={() => setViewMode("calendar")}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: viewMode === "calendar" ? "white" : "transparent" }}
              >
                <CalendarDays size={16} style={{ color: viewMode === "calendar" ? "#007AFF" : "white" }} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: viewMode === "list" ? "white" : "transparent" }}
              >
                <List size={16} style={{ color: viewMode === "list" ? "#007AFF" : "white" }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-5">
          {(() => {
            // Group recurring blocks by day
            const recurringByDay = {};
            blocks.forEach(b => {
              if (!recurringByDay[b.dayIndex]) recurringByDay[b.dayIndex] = [];
              recurringByDay[b.dayIndex].push(b);
            });
            // Group temp blocks by day
            const tempByDay = {};
            tempBlocks.forEach(t => {
              const d = new Date(t.start_at).getDay();
              if (!tempByDay[d]) tempByDay[d] = [];
              tempByDay[d].push(t);
            });

            const allDays = [...new Set([
              ...Object.keys(recurringByDay).map(Number),
              ...Object.keys(tempByDay).map(Number)
            ])].sort((a, b) => a - b);

            if (allDays.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-4xl mb-3">🅿️</p>
                  <p className="text-gray-500 text-sm">אין זמינויות עדיין</p>
                  <p className="text-gray-400 text-xs mt-1">עבור לתצוגת יומן כדי להוסיף</p>
                </div>
              );
            }

            // Days with no recurring slots at all
            const missingDays = [0,1,2,3,4,5,6].filter(d => !recurringByDay[d]);

            return (
              <div className="space-y-5">
              {allDays.map(dayIndex => (
              <div key={dayIndex} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">יום {FULL_DAYS[dayIndex]}</h3>
                  <button
                    onClick={() => {
                      const existing = (recurringByDay[dayIndex] || []).sort((a,b) => a.start - b.start);
                      const lastEnd = existing.length > 0 ? existing[existing.length - 1].end : 8 * 60;
                      const newStart = Math.min(lastEnd, 23 * 60);
                      const newEnd = Math.min(newStart + 60, 24 * 60);
                      addBlock(dayIndex, newStart, newEnd);
                      setTimeout(() => triggerSave(), 100);
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-xl"
                    style={{ color: "#007AFF", background: "#EBF4FF" }}
                  >
                    + טווח נוסף
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {(recurringByDay[dayIndex] || []).sort((a,b) => a.start - b.start).map(b => {
                    const activeBlock = blockSlots.find(bs => {
                      const bsDay = new Date(bs.start_at).getDay();
                      const bsStart = new Date(bs.start_at).getHours() * 60 + new Date(bs.start_at).getMinutes();
                      const bsEnd = new Date(bs.end_at).getHours() * 60 + new Date(bs.end_at).getMinutes();
                      return bsDay === dayIndex && bsStart < b.end && bsEnd > b.start;
                    });
                    const blockEndTime = activeBlock ? fmt(new Date(activeBlock.end_at).getHours() * 60 + new Date(activeBlock.end_at).getMinutes()) : null;
                    return (
                      <div key={b.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ background: blockEndTime ? "#EF4444" : "#007AFF" }} />
                          <div className="flex flex-col">
                            <span className="text-gray-800 text-sm font-medium">{fmt(b.start)} עד {fmt(b.end)}</span>
                            {blockEndTime && (
                              <span className="text-xs text-red-400 font-medium">חסום עד {blockEndTime}</span>
                            )}
                          </div>
                          <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">קבוע</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingBlock(b)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "#EBF4FF" }}>
                            <Pencil size={12} style={{ color: "#007AFF" }} />
                          </button>
                          <button onClick={() => deleteBlock(b.id)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "#FEE2E2" }}>
                            <Trash2 size={12} style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(tempByDay[dayIndex] || []).sort((a,b) => new Date(a.start_at) - new Date(b.start_at)).map(t => {
                    const s = new Date(t.start_at);
                    const e = new Date(t.end_at);
                    const startMin = s.getHours() * 60 + s.getMinutes();
                    const endMin = e.getHours() * 60 + e.getMinutes();
                    return (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ background: "#34C759" }} />
                          <span className="text-gray-800 text-sm font-medium">{fmt(startMin)} עד {fmt(endMin)}</span>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">חד פעמי</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingTemp(t)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "#EBF4FF" }}>
                            <Pencil size={12} style={{ color: "#007AFF" }} />
                          </button>
                          <button onClick={async () => {
                            await base44.entities.WeeklyAvailability.delete(t.id);
                            setTempBlocks(prev => prev.filter(x => x.id !== t.id));
                          }} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "#FEE2E2" }}>
                            <Trash2 size={12} style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
              {/* Add day link */}
              <div className="flex justify-center pt-1 pb-2">
                <button
                  onClick={() => { setAddDayStep("day"); setAddDayIndex(null); setAddDayRanges([{ sH: 8, sM: 0, eH: 10, eM: 0 }]); setAddDaySheet(true); }}
                  className="text-sm font-regular"
                  style={{ color: "#007AFF", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  הגדר זמינות ליום נוסף +
                </button>
              </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Grid */}
      {viewMode === "calendar" && (
        <div className="flex-1 overflow-hidden flex flex-col px-2 pt-2 pb-1">
          {/* Day headers */}
          <div className="flex mb-1" style={{ paddingRight: "36px" }}>
            {DAYS.map((d, i) => (
              <div key={i} className="flex-1 text-center text-xs font-bold text-gray-500">{d}</div>
            ))}
          </div>

          {/* Main grid area */}
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
              // Block slots (suppressed recurring) for today
              const dayBlockSlots = blockSlots.filter(b => new Date(b.start_at).getDay() === dayIndex).map(b => ({
                id: b.id,
                start: new Date(b.start_at).getHours() * 60 + new Date(b.start_at).getMinutes(),
                end: new Date(b.end_at).getHours() * 60 + new Date(b.end_at).getMinutes(),
                end_at: b.end_at,
              }));
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
                  {dayBlocks.map(b => {
                    // Find any active block that overlaps this recurring slot
                    const overlappingBlock = dayBlockSlots.find(bs => bs.start < b.end && bs.end > b.start);
                    return (
                      <div
                        key={b.id}
                        className="absolute rounded cursor-pointer select-none overflow-hidden"
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
                      >
                        {overlappingBlock && (() => {
                          const overlapStart = Math.max(b.start, overlappingBlock.start);
                          const overlapEnd = Math.min(b.end, overlappingBlock.end);
                          const topPct = ((overlapStart - b.start) / (b.end - b.start)) * 100;
                          const heightPct = ((overlapEnd - overlapStart) / (b.end - b.start)) * 100;
                          return (
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                top: `${topPct}%`,
                                height: `${heightPct}%`,
                                left: 0, right: 0,
                                background: "rgba(239,68,68,0.45)",
                                backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(239,68,68,0.35) 3px, rgba(239,68,68,0.35) 5px)",
                              }}
                            />
                          );
                        })()}
                      </div>
                    );
                  })}

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
      )}

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

      {/* Edit temp modal */}
      {editingTemp && (
        <EditTempModal
          slot={editingTemp}
          onClose={() => setEditingTemp(null)}
          onSave={async (startAt, endAt) => {
            await base44.entities.WeeklyAvailability.update(editingTemp.id, { start_at: startAt, end_at: endAt });
            setTempBlocks(prev => prev.map(t => t.id === editingTemp.id ? { ...t, start_at: startAt, end_at: endAt } : t));
            setEditingTemp(null);
          }}
          onDelete={async () => {
            await base44.entities.WeeklyAvailability.delete(editingTemp.id);
            setTempBlocks(prev => prev.filter(t => t.id !== editingTemp.id));
            setEditingTemp(null);
          }}
          onConvertToRecurring={async (dayIndex, start, end) => {
            // Delete the temp block and create a recurring one
            await base44.entities.WeeklyAvailability.delete(editingTemp.id);
            setTempBlocks(prev => prev.filter(t => t.id !== editingTemp.id));
            addBlock(dayIndex, start, end);
            setEditingTemp(null);
            setTimeout(() => triggerSave(), 100);
          }}
        />
      )}

      {/* Edit modal */}
      {editingBlock && (
        <EditModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={(s, e) => updateBlock(editingBlock.id, s, e)}
          onDelete={() => deleteBlock(editingBlock.id)}
          onConvertToTemp={async (startAt, endAt) => {
            // Delete the recurring block and create a temp one
            deleteBlock(editingBlock.id);
            const rec = await base44.entities.WeeklyAvailability.create({
              resident_id: resident.id,
              owner_email: user.email,
              building_id: resident.building_id,
              slot_type: "temp",
              start_at: startAt,
              end_at: endAt,
            });
            setTempBlocks(prev => [...prev, rec]);
            setEditingBlock(null);
          }}
        />
      )}

      {/* Add Day Sheet */}
      {addDaySheet && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setAddDaySheet(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-6 space-y-5"
            style={{ paddingBottom: "calc(80px + 1.5rem)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />

            {addDayStep === "day" ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 text-center">בחר יום</h2>
                <div className="grid grid-cols-4 gap-2">
                  {[0,1,2,3,4,5,6].map(d => {
                    const hasDay = blocks.some(b => b.dayIndex === d);
                    return (
                      <button
                        key={d}
                        onClick={() => { setAddDayIndex(d); setAddDayStep("times"); }}
                        className="py-3 rounded-2xl text-sm font-bold transition-all"
                        style={{
                          background: hasDay ? "#F3F4F6" : "#EBF4FF",
                          color: hasDay ? "#9CA3AF" : "#007AFF",
                          border: hasDay ? "1px solid #E5E7EB" : "none",
                        }}
                      >
                        {FULL_DAYS[d]}
                        {hasDay && <span className="block text-[10px] text-gray-400">קיים</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => setAddDayStep("day")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                    <span style={{ fontSize: 16 }}>›</span>
                  </button>
                  <h2 className="text-xl font-bold text-gray-800">יום {FULL_DAYS[addDayIndex]}</h2>
                </div>

                <div className="space-y-3">
                  {addDayRanges.map((range, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">טווח {idx + 1}</span>
                        {addDayRanges.length > 1 && (
                          <button
                            onClick={() => setAddDayRanges(prev => prev.filter((_, i) => i !== idx))}
                            className="w-6 h-6 flex items-center justify-center rounded-full"
                            style={{ background: "#FEE2E2", color: "#EF4444" }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      {[
                        { label: "מ", fH: "sH", fM: "sM", max: 23 },
                        { label: "עד", fH: "eH", fM: "eM", max: 24 },
                      ].map(({ label, fH, fM, max }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 w-6">{label}</span>
                          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                            <select
                              value={range[fH]}
                              onChange={ev => setAddDayRanges(prev => prev.map((r, i) => i === idx ? { ...r, [fH]: Number(ev.target.value) } : r))}
                              className="flex-1 bg-transparent text-center font-mono font-bold text-gray-800 outline-none"
                            >
                              {Array.from({ length: max + 1 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}</option>)}
                            </select>
                            <span className="text-gray-400 font-bold">:</span>
                            <select
                              value={range[fM]}
                              onChange={ev => setAddDayRanges(prev => prev.map((r, i) => i === idx ? { ...r, [fM]: Number(ev.target.value) } : r))}
                              className="flex-1 bg-transparent text-center font-mono font-bold text-gray-800 outline-none"
                            >
                              {[0, 30].map(v => <option key={v} value={v}>{String(v).padStart(2, "0")}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <button
                    onClick={() => setAddDayRanges(prev => [...prev, { sH: 12, sM: 0, eH: 14, eM: 0 }])}
                    className="w-full py-2 rounded-2xl text-sm font-bold"
                    style={{ color: "#007AFF", background: "#EBF4FF" }}
                  >
                    + הוסף טווח נוסף
                  </button>
                </div>

                <button
                  onClick={() => {
                    addDayRanges.forEach(r => {
                      addBlock(addDayIndex, r.sH * 60 + r.sM, r.eH * 60 + r.eM);
                    });
                    setTimeout(() => triggerSave(), 100);
                    setAddDaySheet(false);
                  }}
                  className="w-full py-3 rounded-2xl font-bold text-white text-base"
                  style={{ background: "#007AFF" }}
                >
                  שמור
                </button>
              </>
            )}
          </div>
        </div>
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

function EditTempModal({ slot, onClose, onSave, onDelete, onConvertToRecurring }) {
  const s = new Date(slot.start_at);
  const e = new Date(slot.end_at);
  const [sH, setSH] = useState(s.getHours());
  const [sM, setSM] = useState(s.getMinutes());
  const [eH, setEH] = useState(e.getHours());
  const [eM, setEM] = useState(e.getMinutes());
  const [type, setType] = useState("temp");

  function handleSave() {
    if (type === "temp") {
      const newStart = new Date(slot.start_at);
      newStart.setHours(sH, sM, 0, 0);
      const newEnd = new Date(slot.end_at);
      newEnd.setHours(eH, eM, 0, 0);
      onSave(newStart.toISOString(), newEnd.toISOString());
    } else {
      onConvertToRecurring(s.getDay(), sH * 60 + sM, eH * 60 + eM);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">עריכת זמינות</h3>
            <p className="text-xs text-gray-400 mt-0.5">{s.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-2xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setType("temp")}
            className="flex-1 py-2 text-sm font-bold transition-all"
            style={{ background: type === "temp" ? "#34C759" : "white", color: type === "temp" ? "white" : "#6B7280" }}
          >
            חד פעמי
          </button>
          <button
            onClick={() => setType("recurring")}
            className="flex-1 py-2 text-sm font-bold transition-all"
            style={{ background: type === "recurring" ? "#007AFF" : "white", color: type === "recurring" ? "white" : "#6B7280" }}
          >
            קבוע
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: "מ", h: sH, setH: setSH, m: sM, setM: setSM, max: 23 },
            { label: "עד", h: eH, setH: setEH, m: eM, setM: setEM, max: 24 },
          ].map(({ label, h, setH, m, setM, max }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-6">{label}</span>
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2">
                <select value={h} onChange={ev => setH(Number(ev.target.value))} className="flex-1 bg-transparent text-center font-mono font-bold text-gray-800 outline-none">
                  {Array.from({ length: max + 1 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}</option>)}
                </select>
                <span className="text-gray-400 font-bold">:</span>
                <select value={m} onChange={ev => setM(Number(ev.target.value))} className="flex-1 bg-transparent text-center font-mono font-bold text-gray-800 outline-none">
                  {[0, 30].map(v => <option key={v} value={v}>{String(v).padStart(2, "0")}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onDelete} className="w-12 h-12 flex-none rounded-2xl flex items-center justify-center" style={{ background: "#FEE2E2", color: "#EF4444" }}>
            <Trash2 size={18} />
          </button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background: type === "recurring" ? "#007AFF" : "#34C759" }}>
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ block, onClose, onSave, onDelete, onConvertToTemp }) {
  const [sH, setSH] = useState(Math.floor(block.start / 60));
  const [sM, setSM] = useState(block.start % 60);
  const [eH, setEH] = useState(Math.floor(block.end / 60));
  const [eM, setEM] = useState(block.end % 60);
  const [type, setType] = useState("recurring");

  // For temp conversion: pick a date
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [tempDate, setTempDate] = useState(todayStr);

  function handleSave() {
    if (type === "recurring") {
      onSave(sH * 60 + sM, eH * 60 + eM);
    } else {
      // Convert to temp: delete recurring, create temp
      const start = new Date(tempDate);
      start.setHours(sH, sM, 0, 0);
      const end = new Date(tempDate);
      end.setHours(eH, eM, 0, 0);
      onConvertToTemp(start.toISOString(), end.toISOString());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{`יום ${["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"][block.dayIndex]}`}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-2xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setType("recurring")}
            className="flex-1 py-2 text-sm font-bold transition-all"
            style={{ background: type === "recurring" ? "#007AFF" : "white", color: type === "recurring" ? "white" : "#6B7280" }}
          >
            קבוע
          </button>
          <button
            onClick={() => setType("temp")}
            className="flex-1 py-2 text-sm font-bold transition-all"
            style={{ background: type === "temp" ? "#34C759" : "white", color: type === "temp" ? "white" : "#6B7280" }}
          >
            חד פעמי
          </button>
        </div>

        {type === "temp" && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 w-6">📅</span>
            <input
              type="date"
              value={tempDate}
              min={todayStr}
              onChange={e => setTempDate(e.target.value)}
              className="flex-1 bg-gray-50 rounded-2xl px-3 py-2 text-sm font-bold text-gray-800 outline-none border-none"
            />
          </div>
        )}

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
          <button onClick={handleSave} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background: type === "temp" ? "#34C759" : "#007AFF" }}>
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}