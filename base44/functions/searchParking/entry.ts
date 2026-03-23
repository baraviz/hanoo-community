import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * searchParking — server-side availability engine
 *
 * Input:  { building_id, from_time, to_time }
 * Output: { full: [...], combos: [...], nearby: [...] }
 *
 * IMPORTANT: time_start/time_end in WeeklyAvailability are stored as local (Israel)
 * minutes-since-midnight, so all fromMins/toMins/dayOfWeek calculations must use
 * Israel local time, not UTC.
 */

const TZ = 'Asia/Jerusalem';

function localMins(date) {
  // Use a fixed-offset approach: format as HH:MM in the target timezone
  const str = date.toLocaleString('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  });
  // str = "14:00" or "09:05"
  const [hStr, mStr] = str.split(':');
  const h = parseInt(hStr) % 24; // handle "24" edge case
  const m = parseInt(mStr);
  return h * 60 + m;
}

function localDay(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'short',
  }).formatToParts(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[
    parts.find(p => p.type === 'weekday').value
  ] ?? 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { building_id, from_time, to_time } = await req.json();
    if (!building_id || !from_time || !to_time)
      return Response.json({ error: 'Missing parameters' }, { status: 400 });

    const fromDate = new Date(from_time);
    const toDate   = new Date(to_time);
    const requestedDurationMs = toDate - fromDate;

    // Use Israel local time for minute/day calculations (slots stored in local time)
    const fromMins  = localMins(fromDate);
    const toMins    = localMins(toDate);
    const dayOfWeek = localDay(fromDate);

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

      const rawCoverage = getSlotCoverage(avail, fromDate, toDate, dayOfWeek, fromMins, toMins);
      if (!rawCoverage) continue;
      console.log(`[DEBUG] slot ${avail.id} owner=${avail.owner_email} type=${avail.slot_type} days=${JSON.stringify(avail.days_of_week)} rawCoverage=${JSON.stringify(rawCoverage)}`);

      const [rawStart, rawEnd] = rawCoverage;

      // Find bookings that overlap this availability slot within the requested window
      const overlappingBookings = activeBookings.filter(b => {
        if (b.parking_slot_id !== avail.id) return false;
        return new Date(b.end_time) > fromDate && new Date(b.start_time) < toDate;
      });

      // Subtract bookings from raw coverage (bookings also stored in local minutes)
      const freeIntervals = subtractIntervals(
        rawStart,
        rawEnd,
        overlappingBookings.map(b => {
          const bS = localMins(new Date(b.start_time));
          const bE = localMins(new Date(b.end_time));
          return [Math.max(bS, rawStart), Math.min(bE, rawEnd)];
        })
      );

      const owner = residentMap[avail.owner_email] || null;
      for (const [freeStart, freeEnd] of freeIntervals) {
        if (freeEnd - freeStart < 30) continue;
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
          const a = candidates[i], b = candidates[j];
          if (a.owner_email === b.owner_email) continue;
          const [first, second] = a.covStart <= b.covStart ? [a, b] : [b, a];
          if (
            first.covStart <= fromMins &&
            second.covEnd >= toMins &&
            second.covStart <= first.covEnd
          ) {
            const firstAlone  = first.covStart  <= fromMins && first.covEnd  >= toMins;
            const secondAlone = second.covStart <= fromMins && second.covEnd >= toMins;
            if (!firstAlone && !secondAlone) combos.push({ first, second });
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
        const slotEnd   = avail.time_end   ?? 1440;
        if ((slotEnd - slotStart) * 60000 < requestedDurationMs) continue;

        const owner = residentMap[avail.owner_email] || null;

        // Option A: shift window to start at slot start
        if (slotStart > fromMins) {
          const newFrom = new Date(fromDate);
          // Set local time by shifting UTC offset
          const offsetMs = slotStart * 60000 - fromMins * 60000;
          newFrom.setTime(fromDate.getTime() + offsetMs);
          const newTo = new Date(newFrom.getTime() + requestedDurationMs);
          const newToMins = localMins(newTo);
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
          const offsetMs = slotEnd * 60000 - toMins * 60000;
          const newTo = new Date(toDate.getTime() + offsetMs);
          const newFrom = new Date(newTo.getTime() - requestedDurationMs);
          const newFromMins = localMins(newFrom);
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

function getSlotCoverage(avail, fromDate, toDate, dayOfWeek, fromMins, toMins) {
  if (avail.slot_type === 'recurring') {
    if (!(avail.days_of_week || []).includes(dayOfWeek)) return null;
    const s = Math.max(avail.time_start ?? 0, fromMins);
    const e = Math.min(avail.time_end   ?? 1440, toMins);
    return e > s ? [s, e] : null;
  }
  if (avail.slot_type === 'temp') {
    const slotStart = new Date(avail.start_at);
    const slotEnd   = new Date(avail.end_at);
    if (slotEnd <= fromDate || slotStart >= toDate) return null;
    const s = Math.max(localMins(slotStart), fromMins);
    const e = Math.min(localMins(slotEnd),   toMins);
    return e > s ? [s, e] : null;
  }
  return null;
}

function subtractIntervals(start, end, bookedIntervals) {
  let free = [[start, end]];
  for (const [bS, bE] of bookedIntervals) {
    const next = [];
    for (const [fS, fE] of free) {
      if (bE <= fS || bS >= fE) {
        next.push([fS, fE]);
      } else {
        if (bS > fS) next.push([fS, bS]);
        if (bE < fE) next.push([bE, fE]);
      }
    }
    free = next;
  }
  return free;
}

function fmtMins(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}