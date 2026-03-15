import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const in15 = new Date(now.getTime() + 15 * 60 * 1000);
    const in20 = new Date(now.getTime() + 20 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);
    const in35 = new Date(now.getTime() + 35 * 60 * 1000);

    const bookings = await base44.asServiceRole.entities.Booking.filter({ status: "active" });

    for (const booking of bookings) {
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);
      const bookingDurationMs = endTime - startTime;

      // --- 15 min before START ---
      if (startTime >= in15 && startTime <= in20) {
        // Only if booking starts more than 15 min from now (i.e. wasn't booked last-minute)
        const createdAt = new Date(booking.created_date);
        const timeFromCreationToStart = startTime - createdAt;
        if (timeFromCreationToStart > 15 * 60 * 1000) {
          // Notify renter
          const existingRenterStart = await base44.asServiceRole.entities.Notification.filter({
            user_email: booking.renter_email,
            booking_id: booking.id,
            type: "booking_starting_soon",
          });
          if (existingRenterStart.length === 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: booking.renter_email,
              title: "החניה שלך מתחילה בקרוב 🚗",
              body: `ההזמנה שלך לחניה #${booking.spot_number || "?"} מתחילה ב-${formatTime(booking.start_time)}. בהצלחה!`,
              type: "booking_starting_soon",
              booking_id: booking.id,
              read: false,
            });
          }

          // Notify owner
          const existingOwnerStart = await base44.asServiceRole.entities.Notification.filter({
            user_email: booking.owner_email,
            booking_id: booking.id,
            type: "booking_starting_soon",
          });
          if (existingOwnerStart.length === 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: booking.owner_email,
              title: "החניה שלך עומדת להיות בשימוש 🅿️",
              body: `${booking.renter_name || booking.renter_email} מגיע לחניה #${booking.spot_number || "?"} בשעה ${formatTime(booking.start_time)}.`,
              type: "booking_starting_soon",
              booking_id: booking.id,
              read: false,
            });
          }
        }
      }

      // --- 30 min before END ---
      if (endTime >= in30 && endTime <= in35) {
        // Don't notify if booking is shorter than 30 min
        if (bookingDurationMs <= 30 * 60 * 1000) continue;

        // Notify renter
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

        // Notify owner
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