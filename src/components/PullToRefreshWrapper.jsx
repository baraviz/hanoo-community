import { usePullToRefresh } from "@/hooks/usePullToRefresh";

/**
 * Wrap any scrollable page content with this to get pull-to-refresh.
 * Usage:
 *   <PullToRefreshWrapper onRefresh={loadData} className="flex-1 overflow-y-auto">
 *     ...content
 *   </PullToRefreshWrapper>
 */
export default function PullToRefreshWrapper({ onRefresh, children, className = "", style = {} }) {
  const { containerRef, pullDistance, refreshing } = usePullToRefresh(onRefresh);

  return (
    <div ref={containerRef} className={`relative overflow-y-auto ${className}`} style={style}>
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-200"
        style={{
          height: pullDistance > 0 || refreshing ? (refreshing ? 48 : pullDistance) : 0,
          opacity: pullDistance > 20 || refreshing ? 1 : 0,
          overflow: "hidden",
        }}
      >
        <div
          className="w-7 h-7 border-2 border-blue-300 border-t-blue-500 rounded-full"
          style={{
            animation: refreshing ? "spin 0.7s linear infinite" : "none",
            transform: refreshing ? "none" : `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
          }}
        />
      </div>
      <div style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none", transition: pullDistance === 0 ? "transform 0.25s ease" : "none" }}>
        {children}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}