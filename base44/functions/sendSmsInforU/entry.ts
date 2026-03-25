import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, message } = await req.json();
    if (!phone || !message) return Response.json({ error: 'Missing phone or message' }, { status: 400 });

    const apiKey = Deno.env.get("INFORU_API_KEY");
    const credential = apiKey.includes(":") ? btoa(apiKey) : apiKey;

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
        "Authorization": `Basic ${credential}`,
      },
      body,
    });

    const text = await res.text();
    console.log("InforU response:", text);
    return Response.json({ ok: true, response: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});