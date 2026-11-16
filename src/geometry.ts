import clip from "polygon-clipping";
export type Point = [number, number];
export type Pose = { x: number; y: number; angle: number; flip: boolean };
export const raw: Point[][] = [
  [
    [0, 0],
    [2, 0],
    [0, 2],
  ],
  [
    [0, 0],
    [2, 0],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 1],
    [-1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
];
export const shapes = raw.map((p) => {
  const cx = p.reduce((s, v) => s + v[0], 0) / p.length,
    cy = p.reduce((s, v) => s + v[1], 0) / p.length;
  return p.map(([x, y]) => [x - cx, y - cy] as Point);
});
export const colors = [
  "#ed3542",
  "#f3d249",
  "#8942ca",
  "#8cc931",
  "#f3942b",
  "#26a5d8",
  "#fff5dc",
];
export function poly(id: number, p: Pose): Point[] {
  const a = (p.angle * Math.PI) / 4,
    c = Math.cos(a),
    s = Math.sin(a);
  return shapes[id].map(([x, y]) => {
    x *= p.flip ? -1 : 1;
    return [round(x * c - y * s + p.x), round(x * s + y * c + p.y)];
  });
}
export const round = (x: number) => Math.round(x * 1e7) / 1e7 || 0;
export function ringArea(p: Point[]) {
  return Math.abs(
    p.reduce((a, v, i) => {
      const n = p[(i + 1) % p.length];
      return a + v[0] * n[1] - n[0] * v[1];
    }, 0) / 2,
  );
}
export function area(m: clip.MultiPolygon) {
  return m.reduce(
    (a, p) =>
      a + ringArea(p[0]) - p.slice(1).reduce((s, h) => s + ringArea(h), 0),
    0,
  );
}
export function merged(ps: Point[][]) {
  return clip.union(
    ...(ps.map((p) => [p]) as [clip.Polygon, ...clip.Polygon[]]),
  );
}
export function overlap(a: Point[], b: Point[]) {
  return area(clip.intersection([a], [b]));
}
export function bounds(ps: Point[][]) {
  const all = ps.flat();
  return {
    minX: Math.min(...all.map((p) => p[0])),
    maxX: Math.max(...all.map((p) => p[0])),
    minY: Math.min(...all.map((p) => p[1])),
    maxY: Math.max(...all.map((p) => p[1])),
  };
}
export function solved(poses: Pose[], target: Point[][]) {
  try {
    const ps = poses.map((p, i) => poly(i, p));
    const u = merged(ps);
    const sum = ps.reduce((s, p) => s + ringArea(p), 0);
    const t = merged(target);
    return (
      sum - area(u) < 0.012 &&
      area(clip.difference(u, t)) < 0.015 &&
      area(clip.difference(t, u)) < 0.015
    );
  } catch {
    return false;
  }
}
export function contains(p: Point[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i],
      b = p[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function canonical(ps: Point[][]) {
  const outline = merged(ps)[0][0].slice(0, -1);
  let keys: string[] = [];
  for (let f = 0; f < 2; f++)
    for (let r = 0; r < 8; r++) {
      const a = (r * Math.PI) / 4;
      const q = outline.map(([x, y]) => {
        x *= f ? -1 : 1;
        return [
          x * Math.cos(a) - y * Math.sin(a),
          x * Math.sin(a) + y * Math.cos(a),
        ] as Point;
      });
      const b = bounds([q]);
      keys.push(
        q
          .map(
            ([x, y]) => `${(x - b.minX).toFixed(4)},${(y - b.minY).toFixed(4)}`,
          )
          .sort()
          .join(";"),
      );
    }
  return keys.sort()[0];
}

/** Alignment uses visible geometry only; reference solutions are never an input. */
export function alignPose(
  id: number,
  poses: Pose[],
  outline: Point[],
  tolerance = 0.18,
): Pose {
  const p = poses[id];
  let best = tolerance;
  let result = p;
  const own = poly(id, p);
  const vertices = [
    ...outline,
    ...poses.flatMap((o, j) => (j === id ? [] : poly(j, o))),
  ];
  for (const v of own)
    for (const w of vertices) {
      const dx = w[0] - v[0],
        dy = w[1] - v[1],
        d = Math.hypot(dx, dy);
      if (d >= best) continue;
      const next = { ...p, x: p.x + dx, y: p.y + dy };
      if (
        poses.every(
          (o, j) => j === id || overlap(poly(id, next), poly(j, o)) < 0.008,
        )
      ) {
        best = d;
        result = next;
      }
    }
  return result;
}
