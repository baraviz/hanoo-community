import { useMemo, memo, useState, useEffect } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const TOTAL_MINS = 24 * 60;
const HOURS = 24;

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// ── Memoized day column — only re-renders when its own data changes ──────────
const DayColumn = memo(function DayColumn({ dayIndex, isToday, dayAvail, dayBookings, residentMap, currentMins }) {
  return (
    <div
      className="relative border-r border-gray-800 last:border-0"
      style={{ background: isToday ? "rgba(59,130,246,0.03)" : undefined }}
      role="gridcell"
      aria-label={`יום ${DAYS[dayIndex]}${isToday ? " (היום)" : ""}`}
    >
      {/* Availability blocks */}
      {dayAvail.map((a, idx) => {
        const top = (a.start / TOTAL_MINS) * 100;
        const height = ((a.end - a.start) / TOTAL_MINS) * 100;
        const owner = residentMap[a.owner_email];
        const label = `זמינות: ${owner?.user_name || a.owner_email}, ${fmt(a.start)}–${fmt(a.end)}`;
        return (
          <div
            key={idx}
            className="absolute rounded overflow-hidden group"
            style={{
              top: `${top}%`,
              height: `${Math.max(height, 0.5)}%`,
              left: 1,
              right: 1,
              background: "rgba(16,185,129,0.25)",
              border: "1px solid rgba(16,185,129,0.4)",
              minHeight: 3,
            }}
            title={label}
            aria-label={label}
            role="img"
          >
            <div className="hidden group-hover:flex absolute inset-0 items-center justify-center z-10">
              <span className="text-[8px] text-green-300 font-medium text-center px-1 leading-tight">
                {owner?.user_name || a.owner_email}
              </span>
            </div>
          </div>
        );
      })}

      {/* Active booking overlays */}
      {dayBookings.map((b, idx) => {
        const top = (b.startMins / TOTAL_MINS) * 100;
        const height = ((b.endMins - b.startMins) / TOTAL_MINS) * 100;
        const label = `הזמנה: ${b.renter_name || b.renter_email} → חניה #${b.spot_number}, ${fmt(b.startMins)}–${fmt(b.endMins)}`;
        return (
          <div
            key={idx}
            className="absolute rounded overflow-hidden group z-10"
            style={{
              top: `${top}%`,
              height: `${Math.max(height, 0.5)}%`,
              left: 1,
              right: 1,
              background: "rgba(245,158,11,0.35)",
              border: "1px solid rgba(245,158,11,0.6)",
              minHeight: 3,
            }}
            title={label}
            aria-label={label}
            role="img"
          >
            <div className="hidden group-hover:flex absolute inset-0 items-center justify-center z-10">
              <span className="text-[8px] text-yellow-200 font-medium text-center px-1 leading-tight">
                #{b.spot_number}
              </span>
            </div>
          </div>
        );
      })}

      {/* Current time line */}
      {isToday && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${(currentMins / TOTAL_MINS) * 100}%` }}
          aria-hidden="true"
        >
          <div className="border-t-2 border-blue-500 opacity-90" />
          <div className="absolute right-0 w-2 h-2 rounded-full bg-blue-500" style={{ transform: "translateX(50%) translateY(-50%)", top: 0 }} />
        </div>
      )}
    </div>
  );
});

export default function AdminWeeklyTimeline({ availability, bookings, residents }) {
  const now = new Date();
  const todayIndex = now.getDay();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const residentMap = useMemo(() => {
    const m = {};
    residents.forEach(r => { m[r.user_email] = r; });
    return m;
  }, [residents]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings
      .filter(b => b.status === "active")
      .forEach(b => {
        const day = new Date(b.start_time).getDay();
        if (!map[day]) map[day] = [];
        const startMins = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
        const endMins = new Date(b.end_time).getHours() * 60 + new Date(b.end_time).getMinutes();
        map[day].push({ ...b, startMins, endMins });
      });
    return map;
  }, [bookings]);

  const availByDay = useMemo(() => {
    const map = {};
    availability
      .filter(a => a.slot_type === "recurring")
      .forEach(a => {
        (a.days_of_week || []).forEach(day => {
          if (!map[day]) map[day] = [];
          map[day].push({ ...a, start: a.time_start, end: a.time_end });
        });
      });
    return map;
  }, [availability]);

  return (
    <section aria-label="טיימליין שבועי — זמינות וחניות">
      <h2 className="text-lg font-bold text-white mb-4">טיימליין שבועי — זמינות</h2>
      <div
        className="rounded-2xl border border-gray-800 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)" }}
        role="grid"
        aria-label="לוח זמינות שבועי"
      >
        {/* Header row */}
        <div
          className="grid border-b border-gray-800"
          style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
          role="row"
        >
          <div role="columnheader" aria-label="שעות" />
          {DAYS.map((d, i) => (
            <div
              key={i}
              className="text-center py-2 text-xs font-bold border-r border-gray-800 last:border-0"
              style={{ color: i === todayIndex ? "#3B82F6" : "#6B7280" }}
              role="columnheader"
              aria-label={`${d}${i === todayIndex ? " (היום)" : ""}`}
            >
              {d}
              {i === todayIndex && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-1" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="relative" style={{ height: 480 }}>
          {/* Hour lines */}
          {Array.from({ length: HOURS + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ top: `${(i / HOURS) * 100}%` }}
              aria-hidden="true"
            >
              <div className="w-12 text-right pr-2">
                <span className="text-[9px] text-gray-400">{String(i).padStart(2,"0")}:00</span>
              </div>
              <div className="flex-1 border-t border-gray-800 opacity-50" />
            </div>
          ))}

          {/* Day columns */}
          <div
            className="absolute inset-0"
            style={{ paddingRight: 48, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
            role="rowgroup"
          >
            {DAYS.map((_, dayIndex) => (
              <DayColumn
                key={dayIndex}
                dayIndex={dayIndex}
                isToday={dayIndex === todayIndex}
                dayAvail={availByDay[dayIndex] || []}
                dayBookings={bookingsByDay[dayIndex] || []}
                residentMap={residentMap}
                currentMins={currentMins}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-gray-800 flex items-center gap-6" aria-label="מקרא">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.4)", border: "1px solid rgba(16,185,129,0.6)" }} aria-hidden="true" />
            <span className="text-gray-300 text-xs">זמינות קבועה</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: "rgba(245,158,11,0.4)", border: "1px solid rgba(245,158,11,0.6)" }} aria-hidden="true" />
            <span className="text-gray-300 text-xs">הזמנה פעילה</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" aria-hidden="true" />
            <span className="text-gray-300 text-xs">עכשיו</span>
          </div>
        </div>
      </div>
    </section>
  );
}