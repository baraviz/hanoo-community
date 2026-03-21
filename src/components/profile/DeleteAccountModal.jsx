/**
 * DeleteAccountModal
 * A 3-step bottom-sheet confirmation flow for permanent account deletion.
 *
 * Step 1 — Summary of everything that will be erased
 * Step 2 — Final "are you absolutely sure?" gate
 * Step 3 — Done / logging-out state
 */
import { memo } from "react";
import { AlertTriangle, CheckCircle, Trash2, Car, CalendarDays, User } from "lucide-react";

const WHAT_GETS_DELETED = [
  { icon: User,         label: "פרופיל הדייר ופרטים אישיים" },
  { icon: CalendarDays, label: "כל הזמינויות (קבועות וחד-פעמיות)" },
  { icon: Car,          label: "הזמנות פעילות (כשוכר וכבעל חניה)" },
];

const DeleteAccountModal = memo(function DeleteAccountModal({
  step,         // 1 | 2 | 3
  credits,
  deleting,
  deleteError,
  onClose,
  onNext,       // step 1 → 2
  onConfirm,    // step 2 → triggers deletion
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-label="אישור מחיקת חשבון"
      onClick={step !== 3 ? onClose : undefined}
    >
      <div
        className="rounded-t-3xl p-6 space-y-5"
        style={{
          background: "var(--sheet-bg)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 80px + 1.5rem)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div
          className="w-10 h-1 rounded-full mx-auto"
          style={{ background: "var(--sheet-handle)" }}
          aria-hidden="true"
        />

        {/* ── STEP 1: What gets deleted ── */}
        {step === 1 && (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "var(--hanoo-red-light)" }}
            >
              <AlertTriangle size={28} style={{ color: "var(--hanoo-red)" }} aria-hidden="true" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>מחיקת חשבון</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                פעולה זו <span className="font-bold" style={{ color: "var(--hanoo-red)" }}>לא ניתנת לביטול</span>. הנה מה שימחק לצמיתות:
              </p>
            </div>

            {/* What gets erased list */}
            <ul
              className="space-y-3 rounded-2xl p-4"
              style={{ background: "var(--hanoo-red-light)", border: "1px solid rgba(255,59,48,0.2)" }}
              aria-label="רשימת נתונים שיימחקו"
            >
              {WHAT_GETS_DELETED.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-none"
                    style={{ background: "rgba(255,59,48,0.12)" }}
                  >
                    <Icon size={15} style={{ color: "var(--hanoo-red)" }} aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
                </li>
              ))}
            </ul>

            {/* Credits warning */}
            {credits > 0 && (
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "var(--hanoo-orange-light)", border: "1px solid rgba(255,149,0,0.3)" }}
                role="alert"
              >
                <span className="text-xl" aria-hidden="true">⚠️</span>
                <p className="text-sm font-medium" style={{ color: "var(--hanoo-orange)" }}>
                  <span className="font-bold">{credits} קרדיטים</span> שצברת יאבדו לצמיתות
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                aria-label="ביטול — סגור את חלון מחיקת החשבון"
                className="flex-1 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}
              >
                ביטול
              </button>
              <button
                onClick={onNext}
                aria-label="המשך לשלב אישור סופי"
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white"
                style={{ background: "var(--hanoo-red)" }}
              >
                המשך →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Final confirmation ── */}
        {step === 2 && (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "var(--hanoo-red-light)" }}
            >
              <Trash2 size={28} style={{ color: "var(--hanoo-red)" }} aria-hidden="true" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>אתה בטוח לחלוטין?</h2>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                לא ניתן לשחזר חשבון לאחר המחיקה. פעולה זו סופית.
              </p>
            </div>

            {deleteError && (
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "var(--hanoo-red-light)" }}
                role="alert"
              >
                <p className="text-xs font-medium" style={{ color: "var(--hanoo-red)" }}>{deleteError}</p>
              </div>
            )}

            <button
              onClick={onConfirm}
              disabled={deleting}
              aria-label="אשר מחיקת חשבון לצמיתות"
              aria-describedby="delete-warning"
              className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-sm"
              style={{ background: "var(--hanoo-red)", opacity: deleting ? 0.65 : 1 }}
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  מוחק נתונים...
                </>
              ) : (
                <>
                  <Trash2 size={15} aria-hidden="true" />
                  כן, מחק את החשבון שלי
                </>
              )}
            </button>
            <p
              id="delete-warning"
              className="text-center text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              כל הנתונים, הזמינויות וההזמנות יימחקו
            </p>

            <button
              onClick={onClose}
              disabled={deleting}
              aria-label="בטל — חזור בלי למחוק"
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)", opacity: deleting ? 0.5 : 1 }}
            >
              בטל — לא, שמור את החשבון שלי
            </button>
          </>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--hanoo-green-light)" }}
            >
              <CheckCircle size={32} style={{ color: "var(--hanoo-green)" }} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-center" style={{ color: "var(--text-primary)" }}>החשבון נמחק</h2>
            <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              כל הנתונים שלך הוסרו בהצלחה. מתנתק...
            </p>
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--surface-card-border)", borderTopColor: "var(--hanoo-green)" }}
              role="status"
              aria-label="מתנתק"
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default DeleteAccountModal;