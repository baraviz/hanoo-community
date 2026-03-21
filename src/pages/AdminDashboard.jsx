import { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";

const AdminKPICards      = lazy(() => import("@/components/admin/AdminKPICards"));
const AdminBuildingsList = lazy(() => import("@/components/admin/AdminBuildingsList"));
const AdminActiveBookings= lazy(() => import("@/components/admin/AdminActiveBookings"));
const AdminWeeklyTimeline= lazy(() => import("@/components/admin/AdminWeeklyTimeline"));
const AdminReferralFunnel= lazy(() => import("@/components/admin/AdminReferralFunnel"));
const AdminTicketing     = lazy(() => import("@/components/admin/AdminTicketing"));

const SectionFallback = () => (
  <div className="rounded-2xl border border-gray-800 h-32 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
);

const ADMIN_EMAIL = "bar.avizemer@gmail.com";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const u = await base44.auth.me().catch(() => null);
    setUser(u);
    if (!u || u.email !== ADMIN_EMAIL) {
      setLoading(false);
      return;
    }
    setAuthorized(true);
    await loadData();
    setLoading(false);
  }

  async function loadData() {
    setRefreshing(true);
    const [buildings, residents, bookings, availability, bugReports, referrals] = await Promise.all([
      base44.entities.Building.list(),
      base44.entities.Resident.list(),
      base44.entities.Booking.list(),
      base44.entities.WeeklyAvailability.list(),
      base44.entities.BugReport.list("-created_date"),
      base44.entities.ReferralEvent.list("-created_date"),
    ]);
    setData({ buildings, residents, bookings, availability, bugReports, referrals: referrals || [] });
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">גישה נדחתה</h1>
          <p className="text-gray-400">הדשבורד זמין למנהל בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Hanoo Admin</h1>
          <p className="text-gray-400 text-xs mt-0.5">ניהול קהילה — לוח בקרה</p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          aria-label="רענן נתונים"
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 text-sm font-medium transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          רענן
        </button>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
        {data && (
          <>
            <Suspense fallback={<SectionFallback />}><AdminKPICards data={data} /></Suspense>
            <Suspense fallback={<SectionFallback />}><AdminBuildingsList data={data} /></Suspense>
            <Suspense fallback={<SectionFallback />}><AdminActiveBookings bookings={data.bookings} /></Suspense>
            <Suspense fallback={<SectionFallback />}><AdminWeeklyTimeline availability={data.availability} bookings={data.bookings} residents={data.residents} /></Suspense>
            <Suspense fallback={<SectionFallback />}><AdminReferralFunnel referrals={data.referrals || []} residents={data.residents} /></Suspense>
            <Suspense fallback={<SectionFallback />}><AdminTicketing reports={data.bugReports || []} /></Suspense>
          </>
        )}
      </div>
    </div>
  );
}