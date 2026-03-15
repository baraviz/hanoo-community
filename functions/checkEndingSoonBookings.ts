import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);
    const in35 = new Date(now.getTime() + 35 * 60 * 1000);

    const bookings = await base44.asServiceRole.entities.Booking.filter({ status: "active" });

    for (const booking of bookings) {
      const endTime = new Date(booking.end_time);
      const startTime = new Date(booking.start_time);

      // Only notify if end_time is in the 30-35 min window
      if (endTime < in30 || endTime > in35) continue;

      // Don't notify if the booking was created less than 30 min before end (i.e. short booking)
      const bookingDurationMs = endTime - startTime;
      if (bookingDurationMs <= 30 * 60 * 1000) continue;

      // Notify renter (ending soon)
      const existingRenter = await base44.asServiceRole.entities.Notification.filter({
        user_email: booking.renter_email,
        booking_id: booking.id,
        type: "booking_ending_soon",
      });

      if (existingRenter.length === 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: booking.renter_email,
          title: "החניה שלך עומדת להסתיים ⏰",
          body: `ההזמנה שלך לחניה #${booking.spot_number || "?"} מסתיימת ב-${formatTime(booking.end_time)}. אל תשכח לפנות!`,
          type: "booking_ending_soon",
          booking_id: booking.id,
          read: false,
        });
      }

      // Notify owner (parking returning soon)
      const existingOwner = await base44.asServiceRole.entities.Notification.filter({
        user_email: booking.owner_email,
        booking_id: booking.id,
        type: "booking_ending_soon",
      });

      if (existingOwner.length === 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: booking.owner_email,
          title: "החניה שלך חוזרת אליך בקרוב 🅿️",
          body: `${booking.renter_name || booking.renter_email} מסיים את השימוש בחניה #${booking.spot_number || "?"} ב-${formatTime(booking.end_time)}.`,
          type: "booking_ending_soon",
          booking_id: booking.id,
          read: false,
        });
      }
    }

    return Response.json({ ok: true, checked: bookings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatTime(isoString) {
  if (!isoString) return "?";
  const d = new Date(isoString);
  return d.toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit" });
}