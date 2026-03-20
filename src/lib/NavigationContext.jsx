/**
 * NavigationContext — per-tab history stacks for bottom-tab navigation.
 *
 * Each bottom tab maintains its own stack so pressing Back inside a tab
 * pops only within that tab, and switching tabs restores its last position.
 *
 * System back gestures (Android hardware back / iOS swipe-back in WebView)
 * are intercepted via the `popstate` event and routed through our stack logic.
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
   * System back-gesture support (Android WebView hardware back / iOS swipe).
   *
   * We push a dummy history entry on mount so that a system "back" pops it
   * instead of leaving the WebView. We then handle the `popstate` event and
   * re-push the dummy entry to keep the browser history neutral, while
   * delegating the actual navigation to our stack logic.
   */
  useEffect(() => {
    // Push a sentinel so there's always something to pop back to
    window.history.pushState({ __hanoo: true }, "");

    function handlePopState(e) {
      // Re-push the sentinel so the next back gesture is also caught
      window.history.pushState({ __hanoo: true }, "");

      // Delegate to our in-app back logic
      const tab = tabForPath(window.location.pathname);
      const stacks = stacksRef.current;
      const stack = stacks[tab] || [];

      if (stack.length > 1) {
        const newStack = stack.slice(0, -1);
        stacks[tab] = newStack;
        navigate(newStack[newStack.length - 1]);
      }
      // If we're at a tab root, swallow the gesture (stay in app)
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