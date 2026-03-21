/**
 * NavigationContext — isolated per-tab history stacks for bottom-tab navigation.
 *
 * Rules:
 *   - Each tab owns an independent stack: ["/tab", "/tab/sub", ...]
 *   - push()      → pushes to the current tab's stack
 *   - back()      → pops the current tab's stack (stays within tab)
 *   - switchTab() → if switching to a DIFFERENT tab, restore its last position
 *                   if tapping the ALREADY ACTIVE tab, reset it to root
 *
 * Android/iOS WebView hardware back:
 *   - One sentinel entry is pushed above the real entry on mount.
 *   - popstate fires → we go(+1) to restore the sentinel, then delegate
 *     to our own back() logic. A `handlingBack` guard prevents re-entrance.
 */
import { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const NAV_TABS = ["/", "/FindParking", "/MyParking", "/Bookings", "/Profile"];

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  // stacks[tabRoot] = ["/path", "/path/sub", ...]
  const stacksRef = useRef({});
  const navigate = useNavigate();
  const location = useLocation();
  const sentinelInjected = useRef(false);
  const handlingBack = useRef(false);

  // Derive the tab that owns a given path
  function tabForPath(path) {
    if (path === "/") return "/";
    const match = NAV_TABS.find(t => t !== "/" && path.startsWith(t));
    return match || "/";
  }

  // The tab the current URL belongs to
  const currentTab = tabForPath(location.pathname);

  // ── push ──────────────────────────────────────────────────────────────────
  // Navigate within the active tab (adds to that tab's stack)
  const push = useCallback((path) => {
    const tab = tabForPath(path);
    const stacks = stacksRef.current;
    stacks[tab] = [...(stacks[tab] || [tab]), path];
    navigate(path);
  }, [navigate]);

  // ── back ──────────────────────────────────────────────────────────────────
  // Pop the current tab's stack
  const back = useCallback(() => {
    const tab = tabForPath(location.pathname);
    const stacks = stacksRef.current;
    const stack = stacks[tab] || [];
    if (stack.length > 1) {
      const newStack = stack.slice(0, -1);
      stacks[tab] = newStack;
      navigate(newStack[newStack.length - 1]);
    } else {
      navigate(tab);
    }
  }, [location.pathname, navigate]);

  // ── switchTab ─────────────────────────────────────────────────────────────
  // Called by the bottom nav bar buttons.
  // • Tapping a DIFFERENT tab  → restore last position in that tab's stack
  // • Tapping the ACTIVE tab   → reset that tab's stack to its root
  const switchTab = useCallback((tab) => {
    const stacks = stacksRef.current;
    const isSameTab = tabForPath(location.pathname) === tab;

    if (isSameTab) {
      // Reset to root
      stacks[tab] = [tab];
      navigate(tab);
    } else {
      // Restore last known position (or default to root)
      const stack = stacks[tab];
      const dest = stack?.length ? stack[stack.length - 1] : tab;
      stacks[tab] = stack?.length ? stack : [tab];
      navigate(dest);
    }
  }, [location.pathname, navigate]);

  // ── canGoBack ─────────────────────────────────────────────────────────────
  const canGoBack = useCallback(() => {
    const tab = tabForPath(location.pathname);
    return (stacksRef.current[tab] || []).length > 1;
  }, [location.pathname]);

  // ── Hardware back gesture (Android WebView / iOS swipe) ───────────────────
  useEffect(() => {
    if (!sentinelInjected.current) {
      window.history.pushState({ __hanoo_sentinel: true }, "");
      sentinelInjected.current = true;
    }

    function handlePopState(e) {
      if (handlingBack.current) return;
      // The sentinel itself popping is a no-op (shouldn't happen, but guard it)
      if (e.state?.__hanoo_sentinel) return;

      handlingBack.current = true;

      // Re-push the sentinel so the next back gesture is also intercepted
      window.history.go(+1);

      setTimeout(() => {
        const tab = tabForPath(window.location.pathname);
        const stacks = stacksRef.current;
        const stack = stacks[tab] || [];

        if (stack.length > 1) {
          const newStack = stack.slice(0, -1);
          stacks[tab] = newStack;
          navigate(newStack[newStack.length - 1]);
        }
        // At tab root → swallow the gesture (keep user in app)

        handlingBack.current = false;
      }, 50);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavigationContext.Provider value={{ push, back, switchTab, canGoBack, currentTab }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useAppNavigation must be used inside NavigationProvider");
  return ctx;
}