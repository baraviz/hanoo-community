import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800 text-base">מדיניות פרטיות</h1>
      </div>
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5 text-gray-700 text-sm leading-7">
        <p className="text-gray-400 text-xs">עדכון אחרון: מרץ 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">1. מבוא</h2>
          <p>Hanoo Community ("האפליקציה", "אנו") מכבדת את פרטיות המשתמשים שלה. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלך בעת השימוש באפליקציה לניהול חניות משותפות בבניינים.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">2. המידע שאנו אוספים</h2>
          <p>אנו אוספים את סוגי המידע הבאים:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>מידע זיהוי:</strong> שם מלא, כתובת אימייל.</li>
            <li><strong>מידע מגורים:</strong> מספר דירה, קומה, בניין.</li>
            <li><strong>מידע חנייה:</strong> מספר חנייה, קומת חנייה, שעות זמינות.</li>
            <li><strong>מספר טלפון:</strong> לצורך יצירת קשר עם שכנים (אופציונלי).</li>
            <li><strong>היסטוריית הזמנות:</strong> תאריכים, שעות, וקרדיטים.</li>
            <li><strong>נתוני שימוש:</strong> פעולות בתוך האפליקציה לשיפור השירות.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">3. שימוש במידע</h2>
          <p>המידע משמש אך ורק לצרכים הבאים:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>הפעלת שירות שיתוף החניות בין דיירי הבניין</li>
            <li>ניהול הזמנות וקרדיטים</li>
            <li>שליחת הודעות רלוונטיות לשירות</li>
            <li>שיפור חוויית המשתמש</li>
            <li>תמיכה טכנית ופתרון תקלות</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">4. שיתוף מידע עם צדדים שלישיים</h2>
          <p>אנו לא מוכרים, משכירים או מעבירים את המידע האישי שלך לצדדים שלישיים לצרכי שיווק. מידע עשוי להיות משותף רק עם:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>דיירים אחרים באותו בניין — לצורך תיאום חניות בלבד</li>
            <li>ספקי שירות טכני הפועלים מטעמנו (Base44)</li>
            <li>רשויות חוק, במקרה של דרישה חוקית</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">5. אבטחת מידע</h2>
          <p>אנו נוקטים באמצעי אבטחה מתאימים להגנה על המידע, כולל הצפנה בהעברת נתונים (HTTPS), בקרת גישה מבוססת הרשאות, וגיבויים קבועים.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">6. זכויותיך</h2>
          <p>בהתאם לחוק הגנת הפרטיות הישראלי ו-GDPR, יש לך הזכות:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>לעיין במידע שנאסף עליך</li>
            <li>לתקן מידע שגוי</li>
            <li>למחוק את חשבונך ומידעך</li>
            <li>להתנגד לעיבוד מסוים של המידע</li>
          </ul>
          <p>לבקשות פנה אלינו: <strong>Info@hanoo.co.il</strong></p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">7. שינויים במדיניות</h2>
          <p>אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יוודעו למשתמשים דרך האפליקציה.</p>
        </section>
      </div>
    </div>
  );
}