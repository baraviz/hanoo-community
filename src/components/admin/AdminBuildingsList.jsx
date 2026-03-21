import { Building2, Users, Car, CalendarDays } from "lucide-react";

export default function AdminBuildingsList({ data }) {
  const { buildings, residents, bookings, availability } = data;

  const buildingStats = buildings.map(b => {
    const bResidents = residents.filter(r => r.building_id === b.id && r.status === "approved");
    const bActiveBookings = bookings.filter(bk => bk.building_id === b.id && bk.status === "active");
    const bAvailability = availability.filter(a => a.building_id === b.id && a.slot_type === "recurring");
    const uniqueOwners = new Set(bAvailability.map(a => a.owner_email)).size;
    return { ...b, residentCount: bResidents.length, activeBookings: bActiveBookings.length, availableOwners: uniqueOwners };
  });

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">בניינים</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {buildingStats.map(b => (
          <div
            key={b.id}
            className="rounded-2xl p-4 border border-gray-800"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: "var(--hanoo-blue-light)" }}>
                <Building2 size={18} style={{ color: "var(--hanoo-blue)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{b.name}</p>
                <p className="text-gray-400 text-xs truncate">{b.address}, {b.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{b.residentCount}</p>
                <p className="text-gray-400 text-[11px]">דיירים</p>
              </div>
              <div className="text-center border-x border-gray-800">
                <p className="text-lg font-bold" style={{ color: b.activeBookings > 0 ? "#F59E0B" : "#6B7280" }}>{b.activeBookings}</p>
                <p className="text-gray-400 text-[11px]">הזמנות פעילות</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: b.availableOwners > 0 ? "#10B981" : "#6B7280" }}>{b.availableOwners}</p>
                <p className="text-gray-400 text-[11px]">חניות זמינות</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}