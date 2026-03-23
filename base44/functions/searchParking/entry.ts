import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * searchParking — server-side availability engine
 *
 * Input:  { building_id, from_time, to_time, requester_email }
 * Output: { full: [...], combos: [...], nearby: [...] }
 *
 * Algorithm:
 *  1. Fetch all WeeklyAvailability + active Bookings for the building (server-side).
 *  2. For each availability slot, compute "free intervals" by subtracting active bookings.
 *  3. Find slots whose free intervals fully cover [from, to] → "full" results.
 *  4. Find pairs of different-owner slots that together cover [from, to] with no gap → "combos".
 *  5. If none found, suggest nearby alternatives by shifting the window to fit available slot durations.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { building_id, from_time, to_time } = await req.json();
    if (!building_id || !from_time || !to_time) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const fromDate = new Date(from_time);
    const toDate = new Date(to_time);
    const requestedDurationMs = toDate - fromDate;
    const fromMins = fromDate.getHours() * 60 + fromDate.getMinutes();
    const toMins = toDate.getHours() * 60 + toDate.getMinutes();
    const dayOfWeek = fromDate.getDay();

    // 1. Fetch data server-side
    const [allAvail, allResidents, activeBookings] = await Promise.all([
      base44.asServiceRole.entities.WeeklyAvailability.filter({ building_id }),
      base44.asServiceRole.entities.Resident.filter({ building_id }),
      base44.asServiceRole.entities.Booking.filter({ building_id, status: 'active' }),
    ]);

    const residentMap = {};
    allResidents.forEach(r => { residentMap[r.user_email] = r; });

    // 2. For each slot, compute free intervals (slot coverage minus bookings)
    const candidates = [];

    for (const avail of allAvail) {
      if (avail.owner_email === user.email) continue;
      if (avail.slot_type === 'block') continue;

      // Compute raw coverage of this slot over the requested window
      const rawCoverage = getSlotCoverage(avail, fromDate, toDate, dayOfWeek, fromMins, toMins);
      if (!rawCoverage) continue;

      const [rawStart, rawEnd] = rawCoverage;

      // Find bookings that overlap this availability slot
      const overlappingBookings = activeBookings.filter(b => {
        if (b.parking_slot_id !== avail.id) return false;
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        // Overlap with [fromDate, toDate] window
        return bEnd > fromDate && bStart < toDate;
      });

      // Compute free intervals by subtracting bookings from raw coverage
      const freeIntervals = subtractIntervals(
        rawStart,
        rawEnd,
        overlappingBookings.map(b => {
          const bStartMins = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
          const bEndMins = new Date(b.end_time).getHours() * 60 + new Date(b.end_time).getMinutes();
          return [Math.max(bStartMins, rawStart), Math.min(bEndMins, rawEnd)];
        })
      );

      const owner = residentMap[avail.owner_email] || null;
      for (const [freeStart, freeEnd] of freeIntervals) {
        if (freeEnd - freeStart < 30) continue; // skip very short fragments
        candidates.push({
          id: avail.id,
          owner_email: avail.owner_email,
          building_id: avail.building_id,
          slot_type: avail.slot_type,
          covStart: freeStart,
          covEnd: freeEnd,
          ownerResident: owner,
        });
      }
    }

    // 3. Full coverage: single slot covering [fromMins, toMins]
    const full = candidates.filter(c => c.covStart <= fromMins && c.covEnd >= toMins);

    // 4. Combos: two different-owner slots covering [fromMins, toMins] with no gap
    const combos = [];
    if (full.length === 0) {
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          const a = candidates[i];
          const b = candidates[j];
          if (a.owner_email === b.owner_email) continue;
          const [first, second] = a.covStart <= b.covStart ? [a, b] : [b, a];
          if (
            first.covStart <= fromMins &&
            second.covEnd >= toMins &&
            second.covStart <= first.covEnd
          ) {
            if (!(first.covStart <= fromMins && first.covEnd >= toMins) &&
                !(second.covStart <= fromMins && second.covEnd >= toMins)) {
              combos.push({ first, second });
            }
          }
        }
      }
    }

    // 5. Nearby alternatives if nothing found
    let nearby = [];
    if (full.length === 0 && combos.length === 0) {
      const seen = new Set();
      for (const avail of allAvail) {
        if (avail.owner_email === user.email) continue;
        if (avail.slot_type !== 'recurring') continue;

        const days = avail.days_of_week || [];
        if (!days.includes(dayOfWeek)) continue;

        const slotStart = avail.time_start ?? 0;
        const slotEnd = avail.time_end ?? 1440;
        const slotDurationMs = (slotEnd - slotStart) * 60000;
        if (slotDurationMs < requestedDurationMs) continue;

        const owner = residentMap[avail.owner_email] || null;

        // Option A: shift window to start at slot start
        if (slotStart > fromMins) {
          const newFrom = new Date(fromDate);
          newFrom.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
          const newTo = new Date(newFrom.getTime() + requestedDurationMs);
          const newToMins = newTo.getHours() * 60 + newTo.getMinutes();
          const key = `${avail.id}-A`;
          if (newToMins <= slotEnd && !seen.has(key)) {
            seen.add(key);
            nearby.push({
              slot: { id: avail.id, owner_email: avail.owner_email, building_id: avail.building_id, ownerResident: owner },
              newFrom: newFrom.toISOString(),
              newTo: newTo.toISOString(),
              label: `מ-${fmtMins(slotStart)}`,
            });
          }
        }

        // Option B: shift window to end at slot end
        if (slotEnd < toMins) {
          const newTo = new Date(fromDate);
          newTo.setHours(Math.floor(slotEnd / 60), slotEnd % 60, 0, 0);
          const newFrom = new Date(newTo.getTime() - requestedDurationMs);
          const newFromMins = newFrom.getHours() * 60 + newFrom.getMinutes();
          const key = `${avail.id}-B`;
          if (newFromMins >= slotStart && !seen.has(key)) {
            seen.add(key);
            nearby.push({
              slot: { id: avail.id, owner_email: avail.owner_email, building_id: avail.building_id, ownerResident: owner },
              newFrom: newFrom.toISOString(),
              newTo: newTo.toISOString(),
              label: `עד ${fmtMins(slotEnd)}`,
            });
          }
        }

        if (nearby.length >= 4) break;
      }
    }

    return Response.json({ full, combos, nearby });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns [startMins, endMins] coverage of a slot within the requested window,
 * or null if the slot doesn't apply.
 */
function getSlotCoverage(avail, fromDate, toDate, dayOfWeek, fromMins, toMins) {
  if (avail.slot_type === 'recurring') {
    if (!(avail.days_of_week || []).includes(dayOfWeek)) return null;
    const s = Math.max(avail.time_start ?? 0, fromMins);
    const e = Math.min(avail.time_end ?? 1440, toMins);
    if (e <= s) return null;
    return [s, e];
  }
  if (avail.slot_type === 'temp') {
    const slotStart = new Date(avail.start_at);
    const slotEnd = new Date(avail.end_at);
    if (slotEnd <= fromDate || slotStart >= toDate) return null;
    const s = Math.max(
      slotStart.getHours() * 60 + slotStart.getMinutes(),
      fromMins
    );
    const e = Math.min(
      slotEnd.getHours() * 60 + slotEnd.getMinutes(),
      toMins
    );
    if (e <= s) return null;
    return [s, e];
  }
  return null;
}

/**
 * Subtracts booked intervals from a free interval [start, end].
 * Returns an array of free sub-intervals.
 */
function subtractIntervals(start, end, bookedIntervals) {
  let free = [[start, end]];
  for (const [bS, bE] of bookedIntervals) {
    const next = [];
    for (const [fS, fE] of free) {
      if (bE <= fS || bS >= fE) {
        next.push([fS, fE]); // no overlap
      } else {
        if (bS > fS) next.push([fS, bS]); // left remainder
        if (bE < fE) next.push([bE, fE]); // right remainder
      }
    }
    free = next;
  }
  return free;
}

function fmtMins(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}