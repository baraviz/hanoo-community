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

    const { type, owner_name, owner_email, owner_phone } = body;

    // Handle weekly availability published
    if (type === "weekly_published") {
      await base44.asServiceRole.entities.Notification.create({
        user_email: owner_email,
        title: "זמינותך פורסמה בהצלחה! 🎉",
        body: "שכניך יכולים כעת להזמין את החניה שלך ברגעים הבאים.",
        type: "availability_published",
        read: false,
        action_url: "/MyParking",
      });

      if (owner_phone) {
        const sms = `זמינותך פורסמה בהצלחה! 🎉\n\nשכניך יכולים כעת להזמין את החניה שלך.\n\nלצפייה בהזמנות:\nhttps://hanoo.base44.app/MyParking`;
        await sendSms(owner_phone, sms).catch(() => {});
      }
    }

    // Handle availability status changed
    if (type === "availability_status_changed") {
      const { status, parking_floor, parking_spot } = body;
      let title, bodyText, appUrl;

      if (status === "available") {
        title = "החניה שלך זמינה כעת! ✅";
        bodyText = `חניה ${parking_spot}${parking_floor ? `, קומה ${parking_floor}` : ""} זמינה לשכנים.`;
        appUrl = "/MyParking";
      } else if (status === "unavailable") {
        title = "החניה שלך לא זמינה 🔒";
        bodyText = `חניה ${parking_spot}${parking_floor ? `, קומה ${parking_floor}` : ""} סומנה כלא זמינה.`;
        appUrl = "/MyParking";
      }

      await base44.asServiceRole.entities.Notification.create({
        user_email: owner_email,
        title,
        body: bodyText,
        type: "availability_status_changed",
        read: false,
        action_url: appUrl,
      });

      if (owner_phone) {
        const smsText = `${title}\n\n${bodyText}\n\n${appUrl ? `צפייה:\nhttps://hanoo.base44.app${appUrl}` : ""}`;
        await sendSms(owner_phone, smsText).catch(() => {});
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});