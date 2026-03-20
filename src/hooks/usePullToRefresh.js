import { useState, useRef, useEffect } from "react";

/**
 * usePullToRefresh — attach to a scrollable container ref.
 * @param {Function} onRefresh - async callback to call on pull
 * @param {Object} options
 * @param {number} options.threshold - px to pull before triggering (default 72)
 */
export function usePullToRefresh(onRefresh, { threshold = 72 } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e) {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && el.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
      }
    }

    async function onTouchEnd() {
      if (startY.current === null) return;
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true);
        setPullDistance(threshold);
        await onRefresh();
        setRefreshing(false);
      }
      setPullDistance(0);
      startY.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance, refreshing, threshold]);

  return { containerRef, pullDistance, refreshing };
}