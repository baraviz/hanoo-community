import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Find alternative parking slots for a user's requested time window
 * Prioritizes full coverage if possible, then combos
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

    // Use same search logic as searchParking function
    const result = await base44.functions.invoke('searchParking', {
      building_id,
      from_time,
      to_time,
    });

    // Return up to 3 alternatives
    const alternatives = [];
    if (result.data?.full?.length > 0) {
      alternatives.push(...result.data.full.slice(0, 3).map(slot => ({
        type: 'full',
        slot: slot,
        covStart: slot.covStart,
        covEnd: slot.covEnd,
      })));
    } else if (result.data?.combos?.length > 0) {
      alternatives.push(...result.data.combos.slice(0, 3).map(combo => ({
        type: 'combo',
        combo: combo,
      })));
    }

    return Response.json({ alternatives });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});