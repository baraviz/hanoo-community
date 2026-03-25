import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const booking = body.data;
    if (!booking || !booking.owner_email) {
      return Response.json({ ok: true });
    }

    // Create notification for the parking owner
    await base44.asServiceRole.entities.Notification.create({
      user_email: booking.owner_email,
      title: "החניה שלך הוזמנה 🅿️",
      body: `${booking.renter_name || booking.renter_email} הזמין את החניה שלך (#${booking.spot_number || "?"}) מ-${formatTime(booking.start_time)} עד ${formatTime(booking.end_time)}`,
      type: "booking_received",
      booking_id: booking.id || "",
      action_url: `/BookingDetails/${booking.id}`,
      read: false,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatTime(isoString) {
  if (!isoString) return "?";
  const d = new Date(isoString);
  return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}