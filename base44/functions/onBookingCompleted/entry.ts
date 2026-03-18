import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Entity automation: triggered when a Booking is updated.
 * Awards points when status → "completed":
 *   - Renter: 5 pts (flat)
 *   - Owner: 10 pts per hour of the booking
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (event?.type !== "update") return Response.json({ ok: true, skipped: "not an update" });
    if (data?.status !== "completed") return Response.json({ ok: true, skipped: "not completed" });
    if (old_data?.status === "completed") return Response.json({ ok: true, skipped: "already was completed" });

    const booking = data;

    // Calculate booking duration in hours
    const hours = booking.start_time && booking.end_time
      ? Math.max(0, (new Date(booking.end_time) - new Date(booking.start_time)) / 3600000)
      : 0;

    const promises = [];

    // Renter: flat 5 pts
    if (booking.renter_email) {
      promises.push(
        base44.asServiceRole.functions.invoke("awardPoints", {
          user_email: booking.renter_email,
          reason: "booking_completed",
        })
      );
    }

    // Owner: 10 pts per hour
    if (booking.owner_email && hours > 0) {
      promises.push(
        base44.asServiceRole.functions.invoke("awardPoints", {
          user_email: booking.owner_email,
          reason: "slot_shared_hours",
          hours,
        })
      );
    }

    await Promise.all(promises);
    return Response.json({ ok: true, hours_awarded: hours });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});