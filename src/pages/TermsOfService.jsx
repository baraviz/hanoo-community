import { ChevronRight } from "lucide-react";
import { useAppNavigation } from "@/lib/NavigationContext";

export default function TermsOfService() {
  const { back } = useAppNavigation();
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 z-10">
        <button onClick={() => back()} aria-label="חזור" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800 text-base">תנאי שימוש</h1>
      </div>
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5 text-gray-700 text-sm leading-7">
        <p className="text-gray-400 text-xs">עדכון אחרון: מרץ 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">1. קבלת התנאים</h2>
          <p>השימוש באפליקציה Hanoo Community מהווה הסכמה מלאה לתנאי שימוש אלה. אם אינך מסכים לתנאים, אנא הפסק את השימוש באפליקציה.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">2. תיאור השירות</h2>
          <p>Hanoo Community הינה פלטפורמה לשיתוף חניות בין דיירי בניין. האפליקציה מאפשרת לדיירים לשתף את מקומות החנייה שלהם עם שכניהם בתמורה לקרדיטים, ולהשתמש בקרדיטים אלה לחנייה בחניות של שכנים אחרים.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">3. הרשמה ושימוש</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>ההרשמה מחייבת הזנת פרטים אמיתיים ומדויקים</li>
            <li>כל משתמש רשאי להחזיק חשבון אחד בלבד</li>
            <li>אתה אחראי על אבטחת סיסמתך</li>
            <li>הצטרפות לבניין מחייבת אישור ממנהל הבניין</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">4. מערכת הקרדיטים</h2>
          <p>הקרדיטים באפליקציה הם נקודות זיכוי פנימיות בלבד, ואינם ניתנים להמרה לכסף או להעברה מחוץ לאפליקציה. מחיר ברירת המחדל הוא 10 קרדיטים לשעה. הקרדיטים עשויים להשתנות בהחלטת מנהל הבניין.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">5. התנהגות מותרת ואסורה</h2>
          <p>מותר:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>שיתוף מקום החנייה האישי שלך בזמנים שאתה לא זקוק לו</li>
            <li>הזמנת חניה פנויה של שכנים בבניינך</li>
            <li>יצירת קשר עם שכנים לצורך תיאום</li>
          </ul>
          <p className="mt-2">אסור:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>שיתוף מקום חנייה שאינו בבעלותך</li>
            <li>שימוש בחנייה מעבר לזמן שהוזמן</li>
            <li>הטרדת משתמשים אחרים</li>
            <li>ניסיון לעקוף את מערכת הקרדיטים</li>
            <li>שימוש לרעה בפרטי הקשר של שכנים</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">6. אחריות</h2>
          <p>Hanoo Community מספקת פלטפורמה לחיבור בין דיירים בלבד. אנו לא נושאים באחריות לנזקים לרכב, מחלוקות בין שכנים, או כל נזק הנובע משימוש בשירות. המשתמשים אחראים אישית לקיום הסכמים ביניהם.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">7. סיום שירות</h2>
          <p>אנו שומרים לעצמנו את הזכות להשעות או לסגור חשבון משתמש שהפר את תנאי השימוש, ללא הודעה מוקדמת.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">8. שינויים</h2>
          <p>אנו רשאים לשנות את תנאי השימוש בכל עת. המשך השימוש לאחר שינוי מהווה הסכמה לתנאים המעודכנים.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">9. דין וסמכות שיפוט</h2>
          <p>תנאים אלה כפופים לדיני מדינת ישראל. סמכות השיפוט הבלעדית תהא לבתי המשפט המוסמכים בתל אביב.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-900 text-base">10. יצירת קשר</h2>
          <p>לכל שאלה בנוגע לתנאי שימוש אלה: <strong>info@hanoo.co.il</strong></p>
        </section>
      </div>
    </div>
  );
}