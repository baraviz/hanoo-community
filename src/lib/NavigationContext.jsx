/**
 * NavigationContext — per-tab history stacks for bottom-tab navigation.
 *
 * Each bottom tab maintains its own stack so pressing Back inside a tab
 * pops only within that tab, and switching tabs restores its last position.
 *
 * System back gestures (Android hardware back / iOS swipe-back in WebView)
 * are intercepted via the `popstate` event and routed through our stack logic.
 *
 * Strategy:
 *   - On mount we inject ONE sentinel entry above the real entry using pushState.
 *   - When `popstate` fires (user pressed hardware back), the browser has already
 *     popped back to the real entry. We immediately call `history.go(+1)` to
 *     restore the sentinel, then run our own back-stack logic — so the WebView
 *     never "exits" the app and the browser URL never changes unexpectedly.
 *   - We guard against re-entrant / double-fire with a `handling` ref flag.
 */
import { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_TABS = ["/", "/FindParking", "/MyParking", "/Bookings", "/Profile"];

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  // stacks[tabRoot] = ["/path", "/path/sub", ...]
  const stacksRef = useRef({});
  const [activeTab, setActiveTab] = useState("/");
  const navigate = useNavigate();
  const location = useLocation();
  const sentinelInjected = useRef(false);
  const handlingBack = useRef(false);

  // Determine which tab root owns the current path
  function tabForPath(path) {
    if (path === "/") return "/";
    const match = NAV_TABS.find(t => t !== "/" && path.startsWith(t));
    return match || "/";
  }

  // Navigate within the current tab (pushes to that tab's stack)
  const push = useCallback((path) => {
    const tab = tabForPath(path);
    const stacks = stacksRef.current;
    stacks[tab] = [...(stacks[tab] || [tab]), path];
    navigate(path);
  }, [navigate]);

  // Go back within the current tab's stack
  const back = useCallback(() => {
    const tab = tabForPath(location.pathname);
    const stacks = stacksRef.current;
    const stack = stacks[tab] || [];
    if (stack.length > 1) {
      const newStack = stack.slice(0, -1);
      stacks[tab] = newStack;
      navigate(newStack[newStack.length - 1]);
    } else {
      navigate(tab === "/" ? "/" : tab);
    }
  }, [location.pathname, navigate]);

  // Switch to a tab (restores its last known position)
  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    const stacks = stacksRef.current;
    const stack = stacks[tab];
    const dest = stack?.length ? stack[stack.length - 1] : tab;
    stacks[tab] = [dest];
    navigate(dest);
  }, [navigate]);

  // Can we go back in the current tab?
  const canGoBack = useCallback(() => {
    const tab = tabForPath(location.pathname);
    const stack = stacksRef.current[tab] || [];
    return stack.length > 1;
  }, [location.pathname]);

  /**
   * Android/iOS WebView back-gesture support.
   *
   * We push exactly ONE sentinel entry above the current history entry so
   * there is always something for the system "back" to pop without leaving
   * the WebView. When `popstate` fires we:
   *   1. Set a guard flag to prevent re-entrance.
   *   2. Immediately go forward (+1) to restore the sentinel position.
   *   3. Delegate the logical navigation to our own stack via `back()`.
   *
   * Using `replaceState` for the sentinel avoids inflating the browser
   * history on every render and prevents double-fire on rapid presses.
   */
  useEffect(() => {
    if (!sentinelInjected.current) {
      window.history.pushState({ __hanoo_sentinel: true }, "");
      sentinelInjected.current = true;
    }

    function handlePopState(e) {
      // Ignore if we triggered this ourselves
      if (handlingBack.current) return;
      // Only handle real user-initiated back gestures (sentinel gets popped)
      if (e.state && e.state.__hanoo_sentinel) return;

      handlingBack.current = true;

      // Restore the sentinel so the next back gesture is also caught
      window.history.go(+1);

      // Run our in-app back logic after the history restoration settles
      setTimeout(() => {
        const tab = tabForPath(window.location.pathname);
        const stacks = stacksRef.current;
        const stack = stacks[tab] || [];

        if (stack.length > 1) {
          const newStack = stack.slice(0, -1);
          stacks[tab] = newStack;
          navigate(newStack[newStack.length - 1]);
        }
        // If at tab root → swallow (stay in app, don't exit WebView)

        handlingBack.current = false;
      }, 50);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTab = tabForPath(location.pathname);

  return (
    <NavigationContext.Provider value={{ push, back, switchTab, canGoBack, currentTab, activeTab }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useAppNavigation must be used inside NavigationProvider");
  return ctx;
}