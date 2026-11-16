import {
  poly,
  contains,
  ringArea,
  bounds,
  merged,
  solved,
  type Point,
  type Pose,
} from "../src/geometry";
import { writeFileSync } from "node:fs";
function fit(ids: number[], outline: Point[]): Pose[] | null {
  const box = bounds([outline]);
  const cells: Point[] = [];
  for (let y = Math.floor(box.minY * 2) / 2; y < box.maxY; y += 0.5)
    for (let x = Math.floor(box.minX * 2) / 2; x < box.maxX; x += 0.5)
      for (const [u, v] of [
        [0.25, 1 / 12],
        [5 / 12, 0.25],
        [0.25, 5 / 12],
        [1 / 12, 0.25],
      ])
        if (contains(outline, x + u, y + v)) cells.push([x + u, y + v]);
  const count = (v: bigint) => {
    let n = 0;
    while (v) {
      v &= v - 1n;
      n++;
    }
    return n;
  };
  const candidates = new Map<number, { p: Pose; mask: bigint }[]>();
  for (const id of ids) {
    const opts: { p: Pose; mask: bigint }[] = [];
    const seen = new Set<string>();
    for (let angle = 0; angle < 8; angle++)
      for (let f = 0; f < (id === 4 ? 2 : 1); f++) {
        const base = poly(id, { x: 0, y: 0, angle, flip: !!f });
        for (let ay = box.minY; ay <= box.maxY; ay += 0.5)
          for (let ax = box.minX; ax <= box.maxX; ax += 0.5) {
            const p = {
              x: ax - base[0][0],
              y: ay - base[0][1],
              angle,
              flip: !!f,
            };
            const ps = poly(id, p);
            if (
              ps.some(
                ([x, y]) =>
                  Math.abs(x * 2 - Math.round(x * 2)) > 1e-5 ||
                  Math.abs(y * 2 - Math.round(y * 2)) > 1e-5 ||
                  x < box.minX - 1e-5 ||
                  x > box.maxX + 1e-5 ||
                  y < box.minY - 1e-5 ||
                  y > box.maxY + 1e-5,
              )
            )
              continue;
            let mask = 0n;
            cells.forEach(([x, y], i) => {
              if (contains(ps, x, y)) mask |= 1n << BigInt(i);
            });
            if (Math.abs(count(mask) / 16 - ringArea(ps)) > 1e-5) continue;
            const key = mask.toString();
            if (seen.has(key)) continue;
            seen.add(key);
            opts.push({ p, mask });
          }
      }
    candidates.set(id, opts);
  }
  const full = (1n << BigInt(cells.length)) - 1n;
  let visits = 0;
  function dfs(left: number[], mask: bigint, poses: Pose[]): Pose[] | null {
    if (++visits > 3000000) return null;
    if (!left.length) return mask === full ? poses : null;
    let choice = -1,
      choices: { p: Pose; mask: bigint }[] = [];
    for (const id of left) {
      const avail = candidates.get(id)!.filter((c) => (c.mask & mask) === 0n);
      if (!avail.length) return null;
      if (choice < 0 || avail.length < choices.length) {
        choice = id;
        choices = avail;
      }
    }
    for (const c of choices) {
      const next = [...poses];
      next[choice] = c.p;
      const result = dfs(
        left.filter((i) => i !== choice),
        mask | c.mask,
        next,
      );
      if (result) return result;
    }
    return null;
  }
  const result = dfs(ids, 0n, []);
  console.log({
    ids,
    cellCount: cells.length,
    options: [...candidates].map(([i, c]) => [i, c.length]),
    visits,
    found: !!result,
  });
  return result;
}
const rest = [2, 3, 4, 5, 6];
const sq = fit(rest, [
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 2],
]);
const hull = fit(rest, [
  [0, 0],
  [5, 0],
  [4, 1],
  [1, 1],
]);
const triangle = fit(
  [0, 1, 2, 3, 4, 5, 6],
  [
    [0, 0],
    [4, 0],
    [0, 4],
  ],
);
const bridge = fit(
  [0, 1, 2, 3, 4, 5, 6],
  [
    [0, 0],
    [4, 0],
    [4, 3],
    [3, 3],
    [3, 1],
    [1, 1],
    [1, 3],
    [0, 3],
  ],
);
const tree = fit(
  [2, 4, 5, 6],
  [
    [1, 0],
    [3, 0],
    [4, 1],
    [0, 1],
  ],
);
writeFileSync(
  "scripts/wood-tilings.json",
  JSON.stringify({ sq, hull, triangle, bridge, tree }),
);
