import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Entity automation: triggered when a Booking is updated.
 * Awards points to both renter and owner when status → "completed".
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only act on status change to "completed"
    if (event?.type !== "update") return Response.json({ ok: true, skipped: "not an update" });
    if (data?.status !== "completed") return Response.json({ ok: true, skipped: "not completed" });
    if (old_data?.status === "completed") return Response.json({ ok: true, skipped: "already was completed" });

    const booking = data;

    // Award points to renter
    if (booking.renter_email) {
      await base44.asServiceRole.functions.invoke("awardPoints", {
        user_email: booking.renter_email,
        reason: "booking_completed",
      });
    }

    // Award points to owner (for sharing their spot)
    if (booking.owner_email) {
      await base44.asServiceRole.functions.invoke("awardPoints", {
        user_email: booking.owner_email,
        reason: "slot_shared",
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});