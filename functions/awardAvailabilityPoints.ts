import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scheduled automation: runs once a day.
 * Finds ParkingSlots where:
 *   - status = "available" or "booked" or "completed" (NOT "cancelled")
 *   - available_until < now
 *   - points_awarded = false
 * Awards 5 pts per hour to the owner.
 * Also handles first_availability bonus.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Get all slots that ended and haven't been awarded yet
    const allSlots = await base44.asServiceRole.entities.ParkingSlot.list();
    const eligible = allSlots.filter(s =>
      s.status !== "cancelled" &&
      s.points_awarded !== true &&
      s.available_until &&
      new Date(s.available_until) < now
    );

    let awarded = 0;
    for (const slot of eligible) {
      const hours = slot.available_from && slot.available_until
        ? Math.max(0, (new Date(slot.available_until) - new Date(slot.available_from)) / 3600000)
        : 0;

      if (hours > 0 && slot.owner_email) {
        // Check if this is their first slot ever (before marking)
        const allOwnerSlots = allSlots.filter(s => s.owner_email === slot.owner_email && s.points_awarded === true);
        const isFirst = allOwnerSlots.length === 0;

        await base44.asServiceRole.functions.invoke("awardPoints", {
          user_email: slot.owner_email,
          reason: "availability_published_hours",
          hours,
        });

        if (isFirst) {
          await base44.asServiceRole.functions.invoke("awardPoints", {
            user_email: slot.owner_email,
            reason: "first_availability",
          });
        }
      }

      // Mark as awarded regardless (even 0 hours, to avoid re-processing)
      await base44.asServiceRole.entities.ParkingSlot.update(slot.id, { points_awarded: true });
      awarded++;
    }

    return Response.json({ ok: true, processed: eligible.length, awarded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});