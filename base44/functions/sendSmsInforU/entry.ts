import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, message } = await req.json();
    if (!phone || !message) return Response.json({ error: 'Missing phone or message' }, { status: 400 });

    const apiKey = Deno.env.get("INFORU_API_KEY");
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

    const res = await fetch("https://api.inforu.co.il/SendMessageXml.ashx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body,
    });

    const text = await res.text();
    return Response.json({ ok: true, response: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});