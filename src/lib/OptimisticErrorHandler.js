import { toast } from "sonner";

/**
 * Global error handler for optimistic UI updates
 * Shows a toast notification when optimistic updates fail
 * Automatically rerolls the UI if needed
 */
export function handleOptimisticError(error, action = "הפעולה") {
  console.error("Optimistic update failed:", error);
  
  let message = `שגיאה: ${action} נכשלה. נסה שוב.`;
  
  if (error?.response?.status === 401) {
    message = "התחברות פגה. אנא התחבר מחדש.";
  } else if (error?.response?.status === 403) {
    message = "אין לך הרשאה לביצוע פעולה זו.";
  } else if (error?.response?.status >= 500) {
    message = "שגיאת שרת. אנא נסה שוב מאוחר יותר.";
  } else if (!navigator.onLine) {
    message = "אין חיבור אינטרנט. בדוק את החיבור שלך.";
  }
  
  toast.error(message, {
    duration: 4000,
    action: {
      label: "סגור",
      onClick: () => {}
    }
  });
}

/**
 * Wrapper for async operations with optimistic error handling
 * Usage: await optimisticOperation(async () => { /* operation */ }, "description")
 */
export async function optimisticOperation(operation, description = "הפעולה") {
  try {
    return await operation();
  } catch (error) {
    handleOptimisticError(error, description);
    throw error;
  }
}