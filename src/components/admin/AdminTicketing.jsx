import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle, Clock, X, ChevronDown } from "lucide-react";

const STATUS_CONFIG = {
  open:        { label: "פתוח",       bg: "#FEE2E2", color: "#DC2626" },
  in_progress: { label: "בטיפול",     bg: "#FEF3C7", color: "#D97706" },
  resolved:    { label: "נפתר",       bg: "#D1FAE5", color: "#059669" },
  closed:      { label: "סגור",       bg: "#F3F4F6", color: "#6B7280" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export default function AdminTicketing({ reports: initialReports }) {
  const [reports, setReports] = useState(initialReports || []);
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    setReports(initialReports || []);
  }, [initialReports]);

  async function updateStatus(id, status) {
    setSaving(id);
    await base44.entities.BugReport.update(id, { status });
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setSaving(null);
  }

  async function saveNotes(id) {
    setSaving(id + "_notes");
    await base44.entities.BugReport.update(id, { admin_notes: notes[id] || "" });
    setReports(prev => prev.map(r => r.id === id ? { ...r, admin_notes: notes[id] || "" } : r));
    setSaving(null);
  }

  const openCount = reports.filter(r => r.status === "open").length;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-500" />
          <h3 className="font-bold text-gray-800">תקלות שדווחו</h3>
          {openCount > 0 && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#EF4444" }}>
              {openCount}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-400">{reports.length} סה"כ</span>
      </div>

      {reports.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">אין תקלות פתוחות</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {reports.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(report => (
            <div key={report.id} className="px-5 py-4">
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(expanded === report.id ? null : report.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={report.status} />
                    <span className="text-xs text-gray-400">
                      {report.user_name || report.user_email}
                    </span>
                    <span className="text-xs text-gray-300">
                      {report.created_date ? new Date(report.created_date).toLocaleDateString("he-IL") : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{report.description}</p>
                </div>
                <ChevronDown
                  size={16}
                  className="text-gray-400 flex-none mt-1 transition-transform"
                  style={{ transform: expanded === report.id ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>

              {expanded === report.id && (
                <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
                  {/* Full description */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">תיאור מלא</p>
                    <p className="text-sm text-gray-700">{report.description}</p>
                    <p className="text-xs text-gray-400 mt-2">מאת: {report.user_email}</p>
                  </div>

                  {/* Status change */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">שנה סטטוס</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => updateStatus(report.id, key)}
                          disabled={saving === report.id}
                          className="px-3 py-1 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: report.status === key ? cfg.bg : "#F3F4F6",
                            color: report.status === key ? cfg.color : "#6B7280",
                            border: report.status === key ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                          }}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Admin notes */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">הערות פנימיות</p>
                    <textarea
                      rows={2}
                      value={notes[report.id] !== undefined ? notes[report.id] : (report.admin_notes || "")}
                      onChange={e => setNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      placeholder="הוסף הערה..."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none resize-none"
                    />
                    <button
                      onClick={() => saveNotes(report.id)}
                      disabled={saving === report.id + "_notes"}
                      className="mt-1 px-4 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#007AFF", opacity: saving === report.id + "_notes" ? 0.6 : 1 }}
                    >
                      שמור הערה
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}