import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const INFORU_API_KEY = Deno.env.get("INFORU_API_KEY");
const APP_ID = Deno.env.get("BASE44_APP_ID");

async function sendSms(phone, message) {
  if (!phone || !INFORU_API_KEY) return;
  const cleaned = phone.replace(/\D/g, "");
  const formatted = cleaned.startsWith("0") ? "972" + cleaned.slice(1) : cleaned;
  const payload = {
    Data: { Message: message, Recipients: [{ Phone: formatted }] },
    Settings: { Encoding: "Unicode" },
    Authentication: { ApiKey: INFORU_API_KEY },
  };
  await fetch("https://api.inforu.co.il/SendMessageXml.ashx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function formatTime(isoString) {
  if (!isoString) return "?";
  const d = new Date(isoString);
  return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const booking = body.data;
    if (!booking || !booking.renter_email) {
      return Response.json({ ok: true });
    }

    const startFmt = formatTime(booking.start_time);
    const appUrl = `https://${APP_ID}.base44.app/BookingDetails/${booking.id}`;

    // Create in-app notification for the renter
    await base44.asServiceRole.entities.Notification.create({
      user_email: booking.renter_email,
      title: "הזמנתך בוצעה בהצלחה! ✅",
      body: `חניה #${booking.spot_number || "?"} של ${booking.owner_name} בוצעה בהצלחה. היא שלך מ-${startFmt}.`,
      type: "booking_confirmed",
      booking_id: booking.id || "",
      read: false,
      action_url: `/BookingDetails/${booking.id}`,
    });

    // Send SMS to the renter
    const renters = await base44.asServiceRole.entities.Resident.filter({ user_email: booking.renter_email });
    const renterPhone = renters[0]?.phone;
    if (renterPhone) {
      const smsText = `הזמנתך בוצעה בהצלחה! ✅\n\n🅿️ חניה #${booking.spot_number || "?"}\n👤 של ${booking.owner_name}\n📅 ${startFmt}\n\nלפרטים:\n${appUrl}`;
      await sendSms(renterPhone, smsText);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});