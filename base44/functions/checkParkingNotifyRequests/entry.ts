import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendSms(phone, message, apiKey) {
  const phoneClean = phone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("0") ? "972" + phoneClean.slice(1) : phoneClean;

  const body = JSON.stringify({
    Data: {
      Message: message,
      Recipients: [{ Phone: phoneFormatted }],
    },
    Settings: {
      MessageType: "SMS",
      Sender: "Hanoo",
    },
  });

  const res = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${apiKey}`,
    },
    body,
  });

  const text = await res.text();
  console.log("InforU SMS response:", text);
  return text;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const slot = payload.data;

    if (!slot) return Response.json({ ok: true, skipped: "no data" });
    if (slot.slot_type === "block") return Response.json({ ok: true, skipped: "block slot" });

    const requests = await base44.asServiceRole.entities.ParkingNotifyRequest.filter({
      building_id: slot.building_id,
      notified: false,
    });

    if (requests.length === 0) return Response.json({ ok: true, skipped: "no pending requests" });

    const apiKey = Deno.env.get("INFORU_API_KEY");

    for (const notifyReq of requests) {
      const reqFrom = new Date(notifyReq.from_time);
      const reqTo = new Date(notifyReq.to_time);
      let covers = false;

      if (slot.slot_type === "temp") {
        const slotStart = new Date(slot.start_at);
        const slotEnd = new Date(slot.end_at);
        covers = slotStart <= reqFrom && slotEnd >= reqTo;
      } else if (slot.slot_type === "recurring") {
        const reqDay = reqFrom.getDay();
        const reqFromMins = reqFrom.getHours() * 60 + reqFrom.getMinutes();
        const reqToMins = reqTo.getHours() * 60 + reqTo.getMinutes();
        covers = (slot.days_of_week || []).includes(reqDay) &&
          slot.time_start <= reqFromMins &&
          slot.time_end >= reqToMins;
      }

      if (!covers) continue;

      const fromStr = reqFrom.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const toStr = reqTo.toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit" });

      // In-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: notifyReq.user_email,
        title: "🅿️ התפנתה חניה!",
        body: `יש חניה זמינה בדיוק בשעות שביקשת: ${fromStr} עד ${toStr}. היכנס לאפליקציה להזמנה.`,
        type: "booking_received",
        read: false,
      }).catch(e => console.error("notification error:", e));

      // SMS
      if (notifyReq.phone && apiKey) {
        const smsText = `Hanoo: התפנתה חניה! ${fromStr}-${toStr}. היכנס לאפליקציה להזמנה 🅿️`;
        await sendSms(notifyReq.phone, smsText, apiKey).catch(e => console.error("SMS error:", e));
      }

      // Mark notified
      await base44.asServiceRole.entities.ParkingNotifyRequest.update(notifyReq.id, { notified: true });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});