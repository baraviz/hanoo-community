/**
 * NavigationContext — per-tab history stacks for bottom-tab navigation.
 *
 * Each bottom tab maintains its own stack so pressing Back inside a tab
 * pops only within that tab, and switching tabs restores its last position.
 */
import { createContext, useContext, useCallback, useRef, useState } from "react";
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
    // Reset stack to just the root when switching
    stacks[tab] = [dest];
    navigate(dest);
  }, [navigate]);

  // Can we go back in the current tab?
  const canGoBack = useCallback(() => {
    const tab = tabForPath(location.pathname);
    const stack = stacksRef.current[tab] || [];
    return stack.length > 1;
  }, [location.pathname]);

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