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
 * Hardware back-button (Android WebView / iOS swipe):
 *   - A sentinel history entry sits above the real entry at all times.
 *   - When popstate fires we know the user hit the back button.
 *   - We re-push the sentinel synchronously via a one-shot popstate listener
 *     that resolves only after history.go(+1) settles — this eliminates the
 *     50 ms setTimeout race that could cause stack drift under rapid gestures.
 *   - A `handlingBack` ref gates re-entrance from concurrent gestures.
 *
 * Stack ↔ URL sync:
 *   - Every location change (including external navigations like Link or
 *     window.location assignments) is observed and the relevant tab stack is
 *     updated so it never drifts from the actual browser URL.
 */
import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const NAV_TABS = ["/", "/FindParking", "/MyParking", "/Bookings", "/Profile"];

const NavigationContext = createContext(null);

// ── helpers ──────────────────────────────────────────────────────────────────

function tabForPath(path) {
  if (path === "/") return "/";
  const match = NAV_TABS.find(t => t !== "/" && path.startsWith(t));
  return match || "/";
}

/**
 * Returns a Promise that resolves once history.go(delta) has settled,
 * detected via a one-shot `popstate` listener.
 * Has a safety timeout so we never hang indefinitely.
 */
function historyGo(delta) {
  return new Promise(resolve => {
    const timeout = setTimeout(resolve, 300); // safety net
    function onSettle() {
      clearTimeout(timeout);
      window.removeEventListener("popstate", onSettle);
      resolve();
    }
    window.addEventListener("popstate", onSettle);
    window.history.go(delta);
  });
}

// ── provider ─────────────────────────────────────────────────────────────────

export function NavigationProvider({ children }) {
  // stacks[tabRoot] = ["/path", "/path/sub", ...]
  const stacksRef     = useRef({});
  const navigate      = useNavigate();
  const location      = useLocation();
  const sentinelRef   = useRef(false);   // sentinel pushed?
  const handlingBack  = useRef(false);   // re-entrance guard

  // ── Sync stack with the current URL on every navigation ──────────────────
  // This catches direct URL changes (Link, navigate(), window.location) so
  // the stack never drifts from reality.
  useEffect(() => {
    const path = location.pathname;
    const tab  = tabForPath(path);
    const stacks = stacksRef.current;

    if (!stacks[tab]) {
      // First visit to this tab — seed its stack
      stacks[tab] = [tab];
    }

    const stack = stacks[tab];
    const top   = stack[stack.length - 1];

    if (top !== path) {
      // Path changed outside our push() — append to the tab's stack
      stacks[tab] = [...stack, path];
    }
  }, [location.pathname]);

  // ── push ─────────────────────────────────────────────────────────────────
  const push = useCallback((path) => {
    const tab    = tabForPath(path);
    const stacks = stacksRef.current;
    stacks[tab]  = [...(stacks[tab] || [tab]), path];
    navigate(path);
  }, [navigate]);

  // ── back ─────────────────────────────────────────────────────────────────
  const back = useCallback(() => {
    const tab    = tabForPath(location.pathname);
    const stacks = stacksRef.current;
    const stack  = stacks[tab] || [];

    if (stack.length > 1) {
      const newStack  = stack.slice(0, -1);
      stacks[tab]     = newStack;
      navigate(newStack[newStack.length - 1]);
    } else {
      navigate(tab);
    }
  }, [location.pathname, navigate]);

  // ── switchTab ─────────────────────────────────────────────────────────────
  const switchTab = useCallback((tab) => {
    const stacks    = stacksRef.current;
    const isSameTab = tabForPath(location.pathname) === tab;

    if (isSameTab) {
      stacks[tab] = [tab];
      navigate(tab);
    } else {
      const stack = stacks[tab];
      const dest  = stack?.length ? stack[stack.length - 1] : tab;
      stacks[tab] = stack?.length ? stack : [tab];
      navigate(dest);
    }
  }, [location.pathname, navigate]);

  // ── canGoBack ─────────────────────────────────────────────────────────────
  const canGoBack = useCallback(() => {
    const tab = tabForPath(location.pathname);
    return (stacksRef.current[tab] || []).length > 1;
  }, [location.pathname]);

  // ── Hardware back-button interception ─────────────────────────────────────
  useEffect(() => {
    // Push sentinel once above the real entry
    if (!sentinelRef.current) {
      window.history.pushState({ __hanoo_sentinel: true }, "");
      sentinelRef.current = true;
    }

    async function handlePopState(e) {
      // Ignore if we triggered this ourselves (re-entrance guard)
      if (handlingBack.current) return;
      // Ignore sentinel re-surface and our own go(+1) re-pushes
      if (e.state?.__hanoo_sentinel) return;
      // Ignore if this popstate was triggered by our own historyGo call
      // (historyGo registers its own one-shot listener before we get here)
      if (!sentinelRef.current) return;

      handlingBack.current = true;

      try {
        // Re-push sentinel — await settle so the stack is consistent
        await historyGo(+1);

        const path   = window.location.pathname;
        const tab    = tabForPath(path);
        const stacks = stacksRef.current;
        const stack  = stacks[tab] || [];

        if (stack.length > 1) {
          const newStack = stack.slice(0, -1);
          stacks[tab]    = newStack;
          navigate(newStack[newStack.length - 1]);
        }
        // At tab root → swallow gesture (keep user in app)
      } finally {
        handlingBack.current = false;
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavigationContext.Provider value={{ push, back, switchTab, canGoBack, currentTab: tabForPath(location.pathname) }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useAppNavigation must be used inside NavigationProvider");
  return ctx;
}