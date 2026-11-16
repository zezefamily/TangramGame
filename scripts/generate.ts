import { writeFileSync } from "node:fs";
import {
  shapes,
  poly,
  overlap,
  merged,
  bounds,
  canonical,
  solved,
  type Pose,
  type Point,
} from "../src/geometry";
let seed = 73196;
function rand() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(rand() * a.length)];
}
const candidates: {
  poses: Pose[];
  outline: Point[];
  score: number;
  key: string;
}[] = [];
const seen = new Set<string>();
for (let trial = 0; candidates.length < 160 && trial < 3000; trial++) {
  const poses: Pose[] = [{ x: 0, y: 0, angle: 0, flip: false }];
  let ps = [poly(0, poses[0])];
  for (let id = 1; id < 7; id++) {
    const opts: { p: Pose; score: number }[] = [];
    for (let attempt = 0; attempt < 160; attempt++) {
      const host = pick(ps),
        edge = Math.floor(rand() * host.length),
        h = host[edge],
        hn = host[(edge + 1) % host.length];
      const p: Pose = {
        x: 0,
        y: 0,
        angle: Math.floor(rand() * 8),
        flip: id === 4 && rand() < 0.5,
      };
      const q = poly(id, p);
      const j = Math.floor(rand() * q.length),
        v = q[j],
        vn = q[(j + 1) % q.length];
      const hv: [number, number] = [hn[0] - h[0], hn[1] - h[1]],
        qv = [vn[0] - v[0], vn[1] - v[1]];
      if (
        Math.abs(hv[0] * qv[1] - hv[1] * qv[0]) > 1e-5 ||
        hv[0] * qv[0] + hv[1] * qv[1] >= 0
      )
        continue;
      const anchor = rand() < 0.5 ? h : hn,
        own = anchor === h ? vn : v;
      p.x = anchor[0] - own[0];
      p.y = anchor[1] - own[1];
      const pp = poly(id, p);
      try {
        if (ps.some((other) => overlap(other, pp) > 1e-5)) continue;
        const u = merged([...ps, pp]);
        if (u.length !== 1 || u[0].length !== 1) continue;
        const b = bounds([...ps, pp]);
        const w = b.maxX - b.minX,
          h = b.maxY - b.minY;
        if (w > 6.8 || h > 6.8 || Math.max(w / h, h / w) > 2.3) continue;
        opts.push({ p, score: w * h + rand() * 9 });
      } catch {}
    }
    if (!opts.length) break;
    opts.sort((a, b) => a.score - b.score);
    const selected = pick(opts.slice(0, Math.min(5, opts.length))).p;
    poses.push(selected);
    ps.push(poly(id, selected));
  }
  if (poses.length !== 7) continue;
  const key = canonical(ps);
  if (seen.has(key)) continue;
  seen.add(key);
  const outline = merged(ps)[0][0];
  const b = bounds(ps);
  const complexity =
    outline.length + (b.maxX - b.minX) * (b.maxY - b.minY) * 0.45;
  if (!solved(poses, ps)) throw Error("Invalid generated puzzle");
  candidates.push({ poses, outline, score: complexity, key });
}
if (candidates.length < 100)
  throw Error(`Only ${candidates.length} candidates`);
candidates.sort((a, b) => a.score - b.score);
const names = [
  "初见",
  "折角",
  "小径",
  "山脊",
  "纸舟",
  "回廊",
  "风向",
  "阶梯",
  "侧影",
  "岬角",
  "远山",
  "小岛",
  "飞翼",
  "屋檐",
  "转折",
  "石阶",
  "浪尖",
  "枝桠",
  "风帆",
  "拼境",
];
const levels = Array.from({ length: 99 }, (_, i) => {
  const c = candidates[Math.floor((i * (candidates.length - 1)) / 98)];
  return {
    id: i + 2,
    name: `${names[i % 20]}${["", " · 二", " · 三", " · 四", " · 五"][Math.floor(i / 20)]}`,
    poses: c.poses,
    outline: c.outline,
    version: 1,
    difficulty: i + 2 <= 20 ? 0 : i + 2 <= 50 ? 1 : i + 2 <= 80 ? 2 : 3,
  };
});
const squareRaw: Point[][] = [
  [
    [0, 0],
    [4, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [2, 2],
    [0, 4],
  ],
  [
    [4, 2],
    [4, 4],
    [2, 4],
  ],
  [
    [2, 2],
    [3, 1],
    [4, 2],
    [3, 3],
  ],
  [
    [0, 4],
    [1, 3],
    [3, 3],
    [2, 4],
  ],
  [
    [4, 0],
    [4, 2],
    [3, 1],
  ],
  [
    [2, 2],
    [3, 3],
    [1, 3],
  ],
];
const squarePoses = squareRaw.map((raw, id) => {
  const pts = raw.map(([x, y]) => [(x - y) / 2, (x + y) / 2] as Point);
  const x = pts.reduce((s, v) => s + v[0], 0) / pts.length,
    y = pts.reduce((s, v) => s + v[1], 0) / pts.length;
  for (let flip = 0; flip < 2; flip++)
    for (let angle = 0; angle < 8; angle++) {
      const p = { x, y, angle, flip: !!flip };
      if (
        poly(id, p).every((v) =>
          pts.some((w) => Math.hypot(v[0] - w[0], v[1] - w[1]) < 1e-5),
        )
      )
        return p;
    }
  throw Error("square fitting");
});
levels.unshift({
  id: 1,
  name: "方寸之间",
  poses: squarePoses,
  outline: merged(squarePoses.map((p, i) => poly(i, p)))[0][0],
  version: 1,
  difficulty: 0,
});
writeFileSync("src/levels.json", JSON.stringify(levels));
console.log(
  `Generated ${levels.length} unique, connected, hole-free legal puzzles from ${candidates.length} candidates.`,
);
