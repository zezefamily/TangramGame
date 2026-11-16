import assert from "node:assert/strict";
import {
  poly,
  solved,
  canonical,
  merged,
  area,
  shapes,
  ringArea,
  type Pose,
} from "../src/geometry";
import levels from "../src/levels.json";
const keys = new Set<string>();
assert.equal(levels.length, 100);
assert(Math.abs(shapes.reduce((s, p) => s + ringArea(p), 0) - 8) < 1e-9);
for (const l of levels) {
  const ps = l.poses.map((p, i) => poly(i, p));
  assert(solved(l.poses, ps), `level ${l.id} reference`);
  const u = merged(ps);
  assert.equal(u.length, 1, `level ${l.id} disconnected`);
  assert.equal(u[0].length, 1, `level ${l.id} hole`);
  assert(Math.abs(area(u) - 8) < 1e-5);
  const k = canonical(ps);
  assert(!keys.has(k), `duplicate ${l.id}`);
  keys.add(k);
  const swapped = structuredClone(l.poses);
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  [swapped[5], swapped[6]] = [swapped[6], swapped[5]];
  assert(solved(swapped, ps), `interchangeable pieces ${l.id}`);
  const bad = structuredClone(l.poses);
  bad[0].x += 0.2;
  assert(!solved(bad, ps), `gap accepted ${l.id}`);
  const tiny = structuredClone(l.poses);
  tiny[0].x += 0.0001;
  assert(solved(tiny, ps), `rounding tolerance ${l.id}`);
  const identical = l.poses.map((p) => ({ ...p, x: 0, y: 0 }));
  assert(!solved(identical, ps), `overlap accepted ${l.id}`);
}
const p: Pose = { x: 0, y: 0, angle: 0, flip: false };
assert.deepEqual(poly(4, p), poly(4, { ...p, angle: 8 }));
assert.notDeepEqual(poly(4, p), poly(4, { ...p, flip: true }));
console.log(
  "PASS: 100 legal, connected, unique puzzles; 100 interchangeable-piece solutions; 200 invalid gap/overlap cases; 100 floating-point tolerance cases; rotation and flip.",
);

// An internal solution location must not act as an invisible snap target.
const square = levels[0];
const separated = square.poses.map((p, i) => ({ ...p, x: 20 + i * 5, y: 20 }));
separated[3] = { ...square.poses[3], x: square.poses[3].x + 0.05 };
const { alignPose } = await import("../src/geometry");
assert.deepEqual(
  alignPose(3, separated, square.outline as [number, number][]),
  separated[3],
);
// A visible outline vertex remains an alignment aid.
const visible = structuredClone(separated);
visible[3] = { x: 0.55, y: 0.5, angle: 0, flip: false };
const aligned = alignPose(3, visible, [
  [0, 0],
  [3, 0],
  [3, 3],
  [0, 3],
]);
assert(Math.abs(aligned.x - 0.5) < 1e-6 && Math.abs(aligned.y - 0.5) < 1e-6);
console.log(
  "PASS: hidden solution cannot attract pieces; visible vertex alignment remains available.",
);

const { lessonFor, chapters } = await import("../src/progression");
let previous = 0;
for (let id = 1; id <= 100; id++) {
  const lesson = lessonFor(id, "relax");
  assert(
    lesson.count >= previous && lesson.count >= 1 && lesson.count <= 7,
    `progression ${id}`,
  );
  assert.equal(new Set(lesson.movable).size, lesson.count);
  assert(lesson.movable.every((i) => i >= 0 && i < 7));
  assert.equal(lessonFor(id, "challenge").count, 7);
  previous = lesson.count;
}
assert.equal(lessonFor(1, "relax").count, 1);
assert.equal(lessonFor(3, "relax").count, 1);
assert.equal(lessonFor(4, "relax").count, 2);
assert.equal(lessonFor(7, "relax").rotation, false);
assert.equal(lessonFor(8, "relax").rotation, true);
assert.equal(lessonFor(21, "relax").flipping, false);
assert.equal(lessonFor(22, "relax").flipping, true);
assert.equal(lessonFor(35, "relax").count, 6);
assert.equal(lessonFor(36, "relax").count, 7);
assert.equal(
  chapters.reduce((n, c) => n + c.end - c.start + 1, 0),
  100,
);
console.log(
  "PASS: gradual 1–7 piece progression, delayed rotation/flip, full challenge, six continuous chapters.",
);

const { default: woodLevels } = await import("../src/wood-levels.json");
assert.equal(woodLevels.length, 8);
const woodKeys = new Set<string>();
for (const l of woodLevels) {
  const ps = l.poses.map((p, i) => poly(i, p));
  assert(Math.abs(area(merged(ps)) - 8) < 1e-5, `${l.name}: no overlap`);
  assert(
    solved(l.poses, l.outlines as [number, number][][]),
    `${l.name}: entire displayed silhouette matches reference`,
  );
  const key = canonical(ps);
  assert(!woodKeys.has(key), `${l.name}: duplicate`);
  woodKeys.add(key);
  assert(lessonFor(l.id, "relax").count <= 3);
  const invalid = structuredClone(l.poses);
  invalid[0].x += 0.3;
  assert(!solved(invalid, l.outlines as [number, number][][]));
}
assert.equal(
  woodLevels[7].outlines.length,
  2,
  "Bird point-contact silhouette preserves both components",
);
console.log(
  "PASS: 8 distinct named wooden puzzles, complete visible silhouettes, no overlaps, incomplete solutions rejected.",
);
