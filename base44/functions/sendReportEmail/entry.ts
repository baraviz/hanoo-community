import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Send parking issue report to info@hanoo.co.il with image and details
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_email, user_name, booking_id, report_text, image_url } = await req.json();

    // Compose email
    const emailBody = `
דיווח על בעיה בחניה

שם: ${user_name}
אימייל: ${user_email}
מספר הזמנה: ${booking_id}

תיאור הבעיה:
${report_text}

${image_url ? `תמונה: ${image_url}` : ''}
    `.trim();

    // Send email via Base44
    await base44.integrations.Core.SendEmail({
      to: "info@hanoo.co.il",
      subject: `דיווח בעיה חניה - ${user_name}`,
      body: emailBody,
      from_name: "Hanoo Reports",
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});