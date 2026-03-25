import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const INFORU_API_KEY = Deno.env.get("INFORU_API_KEY");

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const booking = body.data;
    if (!booking || !booking.owner_email) {
      return Response.json({ ok: true });
    }

    // Create in-app notification for the parking owner
    await base44.asServiceRole.entities.Notification.create({
      user_email: booking.owner_email,
      title: "החניה שלך הוזמנה 🅿️",
      body: `${booking.renter_name || booking.renter_email} הזמין את החניה שלך (#${booking.spot_number || "?"}) מ-${formatTime(booking.start_time)} עד ${formatTime(booking.end_time)}`,
      type: "booking_received",
      booking_id: booking.id || "",
      action_url: `/BookingDetails/${booking.id}`,
      read: false,
    });

    // Send SMS to the owner
    const owners = await base44.asServiceRole.entities.Resident.filter({ user_email: booking.owner_email });
    const ownerPhone = owners[0]?.phone;
    if (ownerPhone) {
      const startFmt = formatTime(booking.start_time);
      const endFmt = formatTimeOnly(booking.end_time);
      const smsText = `הי! החניה שלך (#${booking.spot_number || "?"}) הוזמנה ע"י ${booking.renter_name || "שכן"}\n📅 ${startFmt}–${endFmt}\n\nHanoo 🅿️`;
      await sendSms(ownerPhone, smsText);
    }

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

function formatTimeOnly(isoString) {
  if (!isoString) return "?";
  const d = new Date(isoString);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}