export type ViewportMetrics = {
  width: number;
  height: number;
  visualWidth?: number;
  visualHeight?: number;
  scale?: number;
};

/** The host has already removed its native navigation bar. Never subtract it again. */
export function availableViewport(metrics: ViewportMetrics) {
  const unzoomed = Math.abs((metrics.scale ?? 1) - 1) < 0.01;
  const width = Math.floor(
    unzoomed && metrics.visualWidth && metrics.visualWidth > 0
      ? Math.min(metrics.width, metrics.visualWidth)
      : metrics.width,
  );
  const height = Math.floor(
    unzoomed && metrics.visualHeight && metrics.visualHeight > 0
      ? Math.min(metrics.height, metrics.visualHeight)
      : metrics.height,
  );
  const portrait = metrics.width <= 900 && metrics.height > metrics.width;
  return { width, height, portrait, compact: !portrait && height <= 740 };
}

export function readViewport() {
  const visual = window.visualViewport;
  return availableViewport({
    width: Math.min(
      window.innerWidth,
      document.documentElement.clientWidth || window.innerWidth,
    ),
    height: Math.min(
      window.innerHeight,
      document.documentElement.clientHeight || window.innerHeight,
    ),
    visualWidth: visual?.width,
    visualHeight: visual?.height,
    scale: visual?.scale,
  });
}

export function fitBoard(
  width: number,
  height: number,
  boardWidth: number,
  boardHeight: number,
) {
  const scale = Math.max(0, Math.min(width / boardWidth, height / boardHeight));
  return { width: boardWidth * scale, height: boardHeight * scale };
}
