import { useCallback, useRef } from 'react';

interface PerformanceMetrics {
  layout_ms: number;
  commit_ms: number;
  item_count: number;
}

interface TelemetryThresholds {
  layout_ms: number;
  commit_ms: number;
  items_for_warning: number;
}

const DEFAULT_THRESHOLDS: TelemetryThresholds = {
  layout_ms: 8,
  commit_ms: 12,
  items_for_warning: 1000
};

export function usePerformanceTelemetry(thresholds: TelemetryThresholds = DEFAULT_THRESHOLDS) {
  const frameId = useRef<number | null>(null);
  const pendingCommits = useRef<Array<() => void>>([]);

  const measureLayout = useCallback(<T>(
    operation: () => T,
    itemCount: number,
    label: string = 'Layout'
  ): T => {
    const startTime = performance.now();
    const result = operation();
    const layoutTime = performance.now() - startTime;

    // Log warning if layout exceeds threshold for large item counts
    if (itemCount >= thresholds.items_for_warning && layoutTime > thresholds.layout_ms) {
      console.warn(
        `⚠️ ${label} performance warning: ${layoutTime.toFixed(2)}ms > ${thresholds.layout_ms}ms threshold (${itemCount} items)`
      );
    }

    return result;
  }, [thresholds]);

  const scheduleCommit = useCallback((commitFn: () => void) => {
    pendingCommits.current.push(commitFn);

    // Cancel any existing frame
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
    }

    // Schedule all commits in a single rAF
    frameId.current = requestAnimationFrame(() => {
      const startTime = performance.now();
      
      // Execute all pending commits in a single frame
      const commits = pendingCommits.current.splice(0);
      commits.forEach(commit => commit());
      
      const commitTime = performance.now() - startTime;
      
      // Log warning if commit exceeds threshold
      if (commits.length >= thresholds.items_for_warning && commitTime > thresholds.commit_ms) {
        console.warn(
          `⚠️ Commit performance warning: ${commitTime.toFixed(2)}ms > ${thresholds.commit_ms}ms threshold (${commits.length} commits)`
        );
      }

      // Log telemetry for debugging
      console.debug(`📊 Render telemetry: ${commits.length} commits in ${commitTime.toFixed(2)}ms`);
      
      frameId.current = null;
    });
  }, [thresholds]);

  const batchStyleUpdates = useCallback((
    elements: HTMLElement[],
    updateFn: (element: HTMLElement, index: number) => void
  ) => {
    const startTime = performance.now();
    
    // Batch all style updates into a single commit
    scheduleCommit(() => {
      elements.forEach((element, index) => {
        // Apply all transforms as a single property to avoid multiple reflows
        updateFn(element, index);
      });
    });

    const batchTime = performance.now() - startTime;
    
    if (elements.length >= thresholds.items_for_warning && batchTime > thresholds.layout_ms) {
      console.warn(
        `⚠️ Style batch warning: ${batchTime.toFixed(2)}ms > ${thresholds.layout_ms}ms threshold (${elements.length} elements)`
      );
    }
  }, [scheduleCommit, thresholds]);

  return {
    measureLayout,
    scheduleCommit,
    batchStyleUpdates
  };
}