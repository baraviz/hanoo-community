import { Building2, Users, Car, Coins } from "lucide-react";

export default function AdminKPICards({ data }) {
  const { buildings, residents, bookings } = data;

  const activeBookings = bookings.filter(b => b.status === "active").length;
  const approvedResidents = residents.filter(r => r.status === "approved").length;
  const totalCredits = residents.reduce((sum, r) => sum + (r.credits || 0), 0);

  const cards = [
    {
      label: "בניינים פעילים",
      value: buildings.length,
      icon: Building2,
      color: "var(--hanoo-blue)",
      bg: "var(--hanoo-blue-light)",
    },
    {
      label: "דיירים מאושרים",
      value: approvedResidents,
      icon: Users,
      color: "var(--hanoo-green)",
      bg: "var(--hanoo-green-light)",
    },
    {
      label: "הזמנות פעילות",
      value: activeBookings,
      icon: Car,
      color: "var(--hanoo-orange)",
      bg: "var(--hanoo-orange-light)",
    },
    {
      label: "קרדיטים במחזור",
      value: totalCredits.toLocaleString(),
      icon: Coins,
      color: "var(--hanoo-blue-dark)",
      bg: "var(--hanoo-blue-light)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="rounded-2xl p-5 border border-gray-800"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: bg }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-gray-400 text-xs mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}