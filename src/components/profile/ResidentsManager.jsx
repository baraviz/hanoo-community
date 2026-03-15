export default function ResidentsManager({ residents, onApprove, onReject }) {
  if (residents.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-4">אין דיירים נוספים בבניין</p>;
  }

  const statusLabel = { approved: "פעיל", pending: "ממתין", rejected: "דחוי" };
  const statusColor = { approved: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-600" };

  return (
    <div className="space-y-3">
      {residents.map(r => (
        <div key={r.id} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-none" style={{ background: "#007AFF" }}>
            {(r.user_name || "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">{r.user_name || r.user_email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-gray-400 text-xs">דירה {r.apartment_number || "?"}</p>
              {r.parking_spot && <p className="text-gray-400 text-xs">· חניה {r.parking_spot}</p>}
            </div>
          </div>
          {r.status === "pending" ? (
            <div className="flex gap-1.5 flex-none">
              <button onClick={() => onReject(r)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold" style={{ background: "#FFE5E5", color: "#FF3B30" }}>דחה</button>
              <button onClick={() => onApprove(r)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: "#34C759" }}>אשר</button>
            </div>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-none ${statusColor[r.status]}`}>
              {statusLabel[r.status]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}