import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// League thresholds (must match LeagueConfig records)
const LEAGUES = [
  { name: "Diamond",  min: 500 },
  { name: "Platinum", min: 250 },
  { name: "Gold",     min: 100 },
  { name: "Silver",   min: 40  },
  { name: "Bronze",   min: 0   },
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
 *   reason: "booking_completed" | "slot_shared" | "first_availability" | "positive_rating" | "manual"
 *   custom_points?: number  (only for "manual")
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { user_email, reason, custom_points } = body;

    if (!user_email || !reason) {
      return Response.json({ error: "Missing user_email or reason" }, { status: 400 });
    }

    // Point values per reason
    const POINTS_MAP = {
      booking_completed:    15,  // השלמת הזמנה
      slot_shared:          10,  // שיתוף חניה (פרסום זמינות)
      first_availability:   20,  // פרסום זמינות ראשון
      positive_rating:      25,  // קבלת דירוג חיובי
      manual:               custom_points || 0,
    };

    const pts = POINTS_MAP[reason];
    if (pts === undefined) return Response.json({ error: "Unknown reason" }, { status: 400 });
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
        type: "booking_received", // reusing closest type
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