import { ChevronRight } from "lucide-react";
import { useAppNavigation } from "@/lib/NavigationContext";

export default function Accessibility() {
  const { back } = useAppNavigation();
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 z-10">
        <button onClick={() => back()} aria-label="חזור" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800 text-base">הצהרת נגישות</h1>
      </div>
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5 text-gray-700 text-sm leading-7">
        <p className="text-gray-400 text-xs">עדכון אחרון: מרץ 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">מחויבות לנגישות</h2>
          <p>Hanoo Community מחויבת לאפשר שימוש נוח ונגיש לכלל המשתמשים, לרבות אנשים עם מוגבלויות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח–1998, ותקנות הנגישות לשירות.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">רמת הנגישות</h2>
          <p>אנו שואפים לעמוד בתקן WCAG 2.1 ברמה AA. האפליקציה עוברת בקרות נגישות שוטפות לשיפור מתמיד.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">תכונות נגישות קיימות</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>תמיכה מלאה בכיווניות RTL (עברית מימין לשמאל)</li>
            <li>גדלי טקסט ברורים וקריאים</li>
            <li>ניגודיות צבעים עומדת בסטנדרט WCAG AA</li>
            <li>כפתורים ואזורי לחיצה בגודל מינימלי של 44×44 פיקסל</li>
            <li>תמיכה בטקסט חלופי לאלמנטים גרפיים</li>
            <li>ניווט ברור ועקבי בין מסכים</li>
            <li>הודעות שגיאה ומצב מובנות</li>
            <li>תמיכה בהגדלת טקסט של מערכת ההפעלה</li>
            <li>תמיכה ב-VoiceOver (iOS) ו-TalkBack (Android)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">מגבלות ידועות</h2>
          <p>אנו מודעים למגבלות הנגישות הבאות ועובדים על שיפורן:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>ממשק לוח הזמנות השבועי עשוי להיות מורכב לניווט מלא עם קוראי מסך</li>
            <li>חלק מהאנימציות עשויות להפריע למשתמשים עם רגישות לתנועה</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">טכנולוגיות נתמכות</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>iOS 14 ומעלה עם VoiceOver</li>
            <li>Android 10 ומעלה עם TalkBack</li>
            <li>דפדפני Chrome, Safari, Firefox בגרסאות עדכניות</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">פנייה בנושא נגישות</h2>
          <p>נתקלת בבעיית נגישות? נשמח לשמוע ולתקן. ניתן לפנות אלינו:</p>
          <ul className="list-none space-y-1 text-gray-600">
            <li><strong>אימייל:</strong> info@hanoo.co.il</li>
            <li><strong>נושא הפנייה:</strong> "בעיית נגישות – Hanoo"</li>
          </ul>
          <p>אנו מתחייבים לחזור תוך 5 ימי עסקים.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">תאריך סקר נגישות אחרון</h2>
          <p>מרץ 2026. האפליקציה עוברת סקר נגישות פעם בשנה לפחות.</p>
        </section>
      </div>
    </div>
  );
}