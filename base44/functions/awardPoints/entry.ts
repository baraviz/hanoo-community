import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Updated league thresholds — harder to advance
const LEAGUES = [
  { name: "Diamond",  min: 2000 },
  { name: "Platinum", min: 900  },
  { name: "Gold",     min: 400  },
  { name: "Silver",   min: 150  },
  { name: "Bronze",   min: 0    },
];

function calcLeague(points) {
  for (const l of LEAGUES) {
    if (points >= l.min) return l.name;
  }
  return "Bronze";
}

/**
 * Payload:
 *   user_email: string
 *   reason: "booking_completed" | "slot_shared_hours" | "availability_published_hours" | "first_availability" | "whatsapp_thanks" | "manual"
 *   hours?: number        (for slot_shared_hours and availability_published_hours)
 *   custom_points?: number (only for "manual")
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user_email, reason, hours, custom_points } = body;

    if (!user_email || !reason) {
      return Response.json({ error: "Missing user_email or reason" }, { status: 400 });
    }

    let pts = 0;
    if (reason === "booking_completed")            pts = 5;
    else if (reason === "slot_shared_hours")       pts = Math.round((hours || 0) * 10);
    else if (reason === "availability_published_hours") pts = Math.round((hours || 0) * 5);
    else if (reason === "first_availability")      pts = 20;
    else if (reason === "whatsapp_thanks")         pts = 10;
    else if (reason === "referral")               pts = 10;
    else if (reason === "manual")                  pts = custom_points || 0;
    else return Response.json({ error: "Unknown reason" }, { status: 400 });

    if (pts === 0) return Response.json({ ok: true, message: "0 points, nothing to do" });

    const residents = await base44.asServiceRole.entities.Resident.filter({ user_email });
    if (residents.length === 0) return Response.json({ error: "Resident not found" }, { status: 404 });

    const resident = residents[0];
    const oldPoints = resident.points || 0;
    const newPoints = oldPoints + pts;
    const oldLeague = resident.league || "Bronze";
    const newLeague = calcLeague(newPoints);

    await base44.asServiceRole.entities.Resident.update(resident.id, {
      points: newPoints,
      league: newLeague,
    });

    // Notify if league upgraded
    if (newLeague !== oldLeague) {
      await base44.asServiceRole.entities.Notification.create({
        user_email,
        title: `עלית ליגה! ברכות 🎉`,
        body: `עברת מ-${oldLeague} ל-${newLeague}! המשך כך וצבור עוד נקודות.`,
        type: "booking_received",
        read: false,
      });
    }

    return Response.json({
      ok: true,
      points_awarded: pts,
      total_points: newPoints,
      league: newLeague,
      league_changed: newLeague !== oldLeague,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});