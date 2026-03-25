import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_ID = Deno.env.get("BASE44_APP_ID");

function formatTime(isoString) {
  if (!isoString) return "?";
  const d = new Date(isoString);
  return d.toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const todayStr = now.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit" });
  const dateStr = d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit" });
  return dateStr === todayStr ? "היום" : dateStr;
}

async function sendSms(phone, message, apiKey) {
  const phoneClean = phone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("0") ? "972" + phoneClean.slice(1) : phoneClean;
  const credential = apiKey.includes(":") ? btoa(apiKey) : apiKey;
  const body = JSON.stringify({
    Data: { Message: message, Recipients: [{ Phone: phoneFormatted }] },
    Settings: { MessageType: "SMS", Sender: "Hanoo" },
  });
  const res = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Basic ${credential}` },
    body,
  });
  const text = await res.text();
  console.log("SMS response:", text);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = Deno.env.get("INFORU_API_KEY");

    const now = new Date();
    const in15 = new Date(now.getTime() + 15 * 60 * 1000);
    const in20 = new Date(now.getTime() + 20 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);
    const in35 = new Date(now.getTime() + 35 * 60 * 1000);

    const bookings = await base44.asServiceRole.entities.Booking.filter({ status: "active" });

    // Fetch all residents in one go for phone numbers
    const allResidents = await base44.asServiceRole.entities.Resident.list();
    const residentByEmail = {};
    for (const r of allResidents) residentByEmail[r.user_email] = r;

    for (const booking of bookings) {
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);
      const bookingDurationMs = endTime - startTime;

      const bookingUrl = `https://${APP_ID}.base44.app/BookingDetails/${booking.id}`;
      const spotNumber = booking.spot_number || "?";
      const startStr = formatTime(booking.start_time);
      const endStr = formatTime(booking.end_time);
      const dateLabel = formatDateLabel(booking.start_time);

      // ── 15 min before START ──
      if (startTime >= in15 && startTime <= in20) {
        const createdAt = new Date(booking.created_date);
        if (startTime - createdAt > 15 * 60 * 1000) {

          // Notify RENTER
          const existingRenterStart = await base44.asServiceRole.entities.Notification.filter({
            user_email: booking.renter_email,
            booking_id: booking.id,
            type: "booking_starting_soon",
          });
          if (existingRenterStart.length === 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: booking.renter_email,
              title: `החניה שלך מתחילה עוד 30 דקות 🚗`,
              body: `ההזמנה שלך לחניה #${spotNumber} מתחילה ב-${startStr}. לחץ לפרטים נוספים`,
              type: "booking_starting_soon",
              booking_id: booking.id,
              read: false,
              action_url: `/BookingDetails/${booking.id}`,
            });

            // SMS to renter
            const renterPhone = residentByEmail[booking.renter_email]?.phone;
            if (renterPhone && apiKey) {
              const sms = `החניה שלך מתחילה עוד 30 דקות!\n\n🅿️ חניה #${spotNumber}\n📅 ${dateLabel}\n⏰ ${startStr}–${endStr}\n\nלפרטים:\n${bookingUrl}`;
              await sendSms(renterPhone, sms, apiKey).catch(e => console.error("SMS renter start:", e));
            }
          }

          // Notify OWNER
          const existingOwnerStart = await base44.asServiceRole.entities.Notification.filter({
            user_email: booking.owner_email,
            booking_id: booking.id,
            type: "booking_starting_soon",
          });
          if (existingOwnerStart.length === 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: booking.owner_email,
              title: `החניה שלך הוזמנה לעוד 30 דקות 🅿️`,
              body: `חניה מספר #${spotNumber} הוזמנה לשעה ${startStr}. החניה לא פנויה בסוף? לחץ לעדכון סטטוס`,
              type: "booking_starting_soon",
              booking_id: booking.id,
              read: false,
              action_url: `/BookingDetails/${booking.id}`,
            });

            // SMS to owner
            const ownerPhone = residentByEmail[booking.owner_email]?.phone;
            if (ownerPhone && apiKey) {
              const sms = `החניה שלך הוזמנה לעוד 30 דקות!\n\n🅿️ חניה #${spotNumber}\n📅 ${dateLabel}\n⏰ ${startStr}–${endStr}\n\nלפרטים ועדכון:\n${bookingUrl}`;
              await sendSms(ownerPhone, sms, apiKey).catch(e => console.error("SMS owner start:", e));
            }
          }
        }
      }

      // ── 30 min before END ──
      if (endTime >= in30 && endTime <= in35) {
        if (bookingDurationMs <= 30 * 60 * 1000) continue;

        const endUrl = `https://${APP_ID}.base44.app/BookingDetails/${booking.id}`;

        // Notify RENTER
        const existingRenter = await base44.asServiceRole.entities.Notification.filter({
          user_email: booking.renter_email,
          booking_id: booking.id,
          type: "booking_ending_soon",
        });
        if (existingRenter.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: booking.renter_email,
            title: `החניה שלך נגמרת עוד 30 דקות! ⏰`,
            body: `ההזמנה שלך לחניה #${spotNumber} מסתיימת ב-${endStr}. סיימת להחנות? לחץ לסיום החניה`,
            type: "booking_ending_soon",
            booking_id: booking.id,
            read: false,
            action_url: `/BookingDetails/${booking.id}`,
          });

          // SMS to renter
          const renterPhone = residentByEmail[booking.renter_email]?.phone;
          if (renterPhone && apiKey) {
            const sms = `החניה שלך נגמרת עוד 30 דקות! ⏰\n\n🅿️ חניה #${spotNumber}\n📅 ${dateLabel}\n⏰ מסתיימת ב-${endStr}\n\nסיימת? לחץ לסיום:\n${endUrl}`;
            await sendSms(renterPhone, sms, apiKey).catch(e => console.error("SMS renter end:", e));
          }
        }

        // Notify OWNER
        const existingOwner = await base44.asServiceRole.entities.Notification.filter({
          user_email: booking.owner_email,
          booking_id: booking.id,
          type: "booking_ending_soon",
        });
        if (existingOwner.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: booking.owner_email,
            title: `החניה שלך חוזרת אליך בקרוב 🅿️`,
            body: `${booking.renter_name || booking.renter_email} מסיים את השימוש בחניה #${spotNumber} ב-${endStr}.`,
            type: "booking_ending_soon",
            booking_id: booking.id,
            read: false,
            action_url: `/BookingDetails/${booking.id}`,
          });

          // SMS to owner
          const ownerPhone = residentByEmail[booking.owner_email]?.phone;
          if (ownerPhone && apiKey) {
            const sms = `החניה שלך חוזרת בקרוב! 🅿️\n\n${booking.renter_name || "שכן"} מסיים את השימוש בחניה #${spotNumber}\n📅 ${dateLabel}\n⏰ ב-${endStr}\n\nלפרטים:\n${endUrl}`;
            await sendSms(ownerPhone, sms, apiKey).catch(e => console.error("SMS owner end:", e));
          }
        }
      }
    }

    return Response.json({ ok: true, checked: bookings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});