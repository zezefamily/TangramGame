import { boardSize, trayBounds, targetCenter, inTray } from "./layout";
import { makeWorkbench, pieceTexture } from "./materials";
import { lessonFor } from "./progression";
import Phaser from "phaser";
import {
  poly,
  colors,
  contains,
  bounds,
  solved,
  alignPose,
  overlap,
  ringArea,
  type Pose,
  type Point,
} from "./geometry";
export type Level = {
  id: number;
  name: string;
  poses: Pose[];
  outline: number[][];
  difficulty: number;
  version: number;
  outlines?: number[][][];
  story?: string;
};
export class Board extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
  pieceSprites: Phaser.GameObjects.Image[] = [];
  wood!: CanvasImageSource;
  paper?: Phaser.GameObjects.Image;
  lift = 0;
  onAction = (_: string) => {};
  poses: Pose[] = [];
  target: Point[][] = [];
  selected = -1;
  drag = false;
  dragPointer = -1;
  offset = [0, 0];
  history: Pose[][] = [];
  hint = 0;
  hintIndex = 0;
  paused = false;
  won = false;
  portrait = false;
  scaleUnit = 80;
  tx = 340;
  ty = 340;
  level!: Level;
  mode = "relax";
  lesson = lessonFor(1, "relax");
  fixed = new Set<number>();
  guide?: Phaser.GameObjects.Text | Phaser.GameObjects.Image;
  guideTween?: Phaser.Tweens.Tween;
  onChange = () => {};
  onWin = () => {};
  onSelect = () => {};
  onReady = () => {};
  onGuideState = (_: boolean) => {};
  constructor() {
    super("board");
  }
  preload() {
    this.load.image("beech", `${import.meta.env.BASE_URL}assets/wood/beech.jpg`);
  }
  create() {
    this.wood = this.textures.get("beech").getSourceImage() as HTMLImageElement;
    this.paper = this.add
      .image(0, 0, makeWorkbench(this, this.wood))
      .setOrigin(0)
      .setDepth(-2);
    this.g = this.add.graphics();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.paused || this.won || this.drag) return;
      const [x, y] = this.world(p.x, p.y);
      let found = -1;
      for (let i = 6; i >= 0; i--)
        if (!this.fixed.has(i) && contains(poly(i, this.poses[i]), x, y)) {
          found = i;
          break;
        }
      if (
        this.selected >= 0 &&
        !this.fixed.has(this.selected) &&
        contains(poly(this.selected, this.poses[this.selected]), x, y)
      )
        found = this.selected;
      this.selected = found;
      this.onSelect();
      if (found >= 0) {
        this.checkpoint();
        this.drag = true;
        this.lift = 9;
        this.onAction("pick");
        this.dragPointer = p.id;
        this.hideGuide();
        this.offset = [x - this.poses[found].x, y - this.poses[found].y];
      }
      this.paint();
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (
        !this.drag ||
        this.selected < 0 ||
        p.id !== this.dragPointer ||
        this.paused
      )
        return;
      const [x, y] = this.world(p.x, p.y);
      const pose = this.poses[this.selected];
      pose.x = Math.max(
        (35 - this.tx) / this.scaleUnit,
        Math.min(
          (boardSize(this.portrait).width - 35 - this.tx) / this.scaleUnit,
          x - this.offset[0],
        ),
      );
      pose.y = Math.max(
        (35 - this.ty) / this.scaleUnit,
        Math.min(
          (boardSize(this.portrait).height - 40 - this.ty) / this.scaleUnit,
          y - this.offset[1],
        ),
      );
      this.paint();
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.dragPointer) this.release();
    });
    this.input.on("pointerupoutside", (p: Phaser.Input.Pointer) => {
      if (p.id === this.dragPointer) this.release();
    });
    this.game.canvas.setAttribute(
      "aria-label",
      "七巧板拼图区域，拖动木块拼出轮廓，用下方按钮旋转，也可用方向键移动",
    );
    this.game.canvas.setAttribute("role", "img");
    this.paint();
    this.onReady();
  }
  world(x: number, y: number) {
    return [(x - this.tx) / this.scaleUnit, (y - this.ty) / this.scaleUnit];
  }
  point(p: Point) {
    return new Phaser.Geom.Point(
      p[0] * this.scaleUnit + this.tx,
      p[1] * this.scaleUnit + this.ty,
    );
  }
  setupLevel(
    level: Level,
    mode: string,
    saved?: Pose[],
    savedPortrait = false,
  ) {
    this.level = level;
    this.mode = mode;
    this.lesson = lessonFor(level.id, mode);
    this.fixed = new Set(
      [0, 1, 2, 3, 4, 5, 6].filter((i) => !this.lesson.movable.includes(i)),
    );
    this.hideGuide();
    this.target = level.poses.map((p, i) => poly(i, p));
    const b = bounds(this.target);
    this.scaleUnit = Math.min(
      this.lesson.count === 1
        ? 110
        : this.lesson.count === 2
          ? 95
          : this.lesson.count === 3
            ? 85
            : 75,
      500 / (b.maxX - b.minX),
      400 / (b.maxY - b.minY),
    );
    this.tx =
      targetCenter(this.portrait)[0] - ((b.minX + b.maxX) / 2) * this.scaleUnit;
    this.ty =
      targetCenter(this.portrait)[1] - ((b.minY + b.maxY) / 2) * this.scaleUnit;
    this.poses = saved ? this.adaptPoses(saved, savedPortrait) : this.initial();
    this.paper?.setTexture(makeWorkbench(this, this.wood, this.portrait));
    this.pieceSprites.forEach((p) => p.destroy());
    this.pieceSprites = [];
    for (let i = 0; i < 7; i++) {
      const t = pieceTexture(this, i, this.scaleUnit, this.wood);
      this.pieceSprites.push(
        this.add.image(0, 0, t.key).setOrigin(t.originX, t.originY),
      );
    }
    this.lift = 0;
    for (const i of this.fixed) this.poses[i] = { ...level.poses[i] };
    this.selected = this.lesson.count === 1 ? this.lesson.movable[0] : -1;
    this.drag = false;
    this.dragPointer = -1;
    this.history = [];
    this.hint = 0;
    this.hintIndex = 0;
    this.won = false;
    this.paused = false;
    this.paint();
    if (mode === "relax" && level.id <= 3) this.showGuide();
  }
  initial(): Pose[] {
    const places: number[][] = this.portrait
      ? this.lesson.count === 1
        ? [[350, 750]]
        : this.lesson.count === 2
          ? [
              [200, 750],
              [500, 750],
            ]
          : this.lesson.count === 3
            ? [
                [155, 750],
                [350, 750],
                [545, 750],
              ]
            : [
                [170, 690],
                [400, 690],
                [560, 690],
                [140, 840],
                [320, 840],
                [480, 840],
                [600, 840],
              ]
      : this.lesson.count === 1
        ? [[892, 350]]
        : this.lesson.count === 2
          ? [
              [900, 210],
              [900, 495],
            ]
          : this.lesson.count === 3
            ? [
                [890, 210],
                [810, 465],
                [990, 465],
              ]
            : [
                [790, 170],
                [990, 170],
                [800, 355],
                [1000, 355],
                [875, 480],
                [800, 600],
                [990, 600],
              ];
    const result = this.level.poses.map((target, i) => {
      if (this.fixed.has(i)) return { ...target };
      const index = this.lesson.movable.indexOf(i),
        [sx, sy] = places[this.lesson.count >= 4 ? i : index],
        [x, y] = this.world(sx, sy);
      const angle = !this.lesson.rotation
        ? target.angle
        : this.mode === "challenge"
          ? 0
          : (target.angle +
              (this.level.id <= 12 ? (index === 0 ? 1 : 0) : 1 + (index % 3))) %
            8;
      const flip = this.lesson.flipping && i === 4 ? !target.flip : target.flip;
      return { x, y, angle, flip };
    });
    return this.packTray(result, this.lesson.movable);
  }
  packTray(result: Pose[], movable: number[]) {
    const area = trayBounds(this.portrait);
    // Pack actual rotated silhouettes, both on first load and when changing orientation.
    const placed: Point[][] = [];
    const ids = [...movable].sort(
      (a, b) => ringArea(poly(b, result[b])) - ringArea(poly(a, result[a])),
    );
    for (const id of ids) {
      const preferred = result[id];
      const fits = (p: Pose) => {
        const ps = poly(id, p);
        return (
          ps.every((v) => {
            const q = this.point(v);
            return (
              q.x >= area.left &&
              q.x <= area.right &&
              q.y >= area.top &&
              q.y <= area.bottom
            );
          }) && placed.every((other) => overlap(ps, other) < 0.001)
        );
      };
      if (!fits(preferred)) {
        const candidates: { x: number; y: number; distance: number }[] = [];
        const center = this.point([preferred.x, preferred.y]);
        for (let sy = area.top + 10; sy <= area.bottom; sy += 10)
          for (let sx = area.left + 10; sx <= area.right; sx += 10)
            candidates.push({
              x: sx,
              y: sy,
              distance: (sx - center.x) ** 2 + (sy - center.y) ** 2,
            });
        candidates.sort((a, b) => a.distance - b.distance);
        const spot = candidates.find((v) => {
          const [x, y] = this.world(v.x, v.y);
          return fits({ ...preferred, x, y });
        });
        if (spot) {
          const [x, y] = this.world(spot.x, spot.y);
          result[id] = { ...preferred, x, y };
        }
      }
      placed.push(poly(id, result[id]));
    }
    return result;
  }
  adaptPoses(saved: Pose[], previousPortrait: boolean): Pose[] {
    const result = structuredClone(saved);
    if (previousPortrait === this.portrait) return result;
    const center = targetCenter(previousPortrait);
    const oldTx = this.tx + center[0] - targetCenter(this.portrait)[0];
    const oldTy = this.ty + center[1] - targetCenter(this.portrait)[1];
    const loose = this.lesson.movable.filter((i) =>
      inTray(
        saved[i].x * this.scaleUnit + oldTx,
        saved[i].y * this.scaleUnit + oldTy,
        previousPortrait,
      ),
    );
    const initial = this.initial();
    for (const id of loose)
      result[id] = {
        ...initial[id],
        angle: saved[id].angle,
        flip: saved[id].flip,
      };
    return this.packTray(result, loose);
  }
  setPortrait(portrait: boolean) {
    if (this.portrait === portrait) return;
    const previous = this.portrait;
    const history = this.history;
    const hint = this.hint,
      hintIndex = this.hintIndex,
      selected = this.selected,
      won = this.won,
      paused = this.paused;
    this.portrait = portrait;
    const size = boardSize(portrait);
    this.scale.setGameSize(size.width, size.height);
    if (!this.level) return;
    this.setupLevel(this.level, this.mode, this.poses, previous);
    this.history = history.map((poses) => this.adaptPoses(poses, previous));
    this.hint = hint;
    this.hintIndex = hintIndex;
    this.selected = selected;
    this.won = won;
    this.paused = paused;
    if (won || paused) this.hideGuide();
    this.paint();
    this.onChange();
  }
  hideGuide() {
    this.guideTween?.stop();
    this.guide?.destroy();
    this.guide = undefined;
    this.onGuideState(false);
  }
  showGuide() {
    this.hideGuide();
    const id = this.lesson.movable[0],
      p = this.point([this.poses[id].x, this.poses[id].y]);
    const target = this.point([this.level.poses[id].x, this.level.poses[id].y]);
    const hand = this.textures.exists("rive-hand")
      ? this.add
          .image(p.x, p.y + 20, "rive-hand")
          .setDisplaySize(105, 105)
          .setOrigin(0.45, 0.35)
          .setDepth(100)
      : this.add
          .text(p.x, p.y + 20, "☝", { fontSize: "44px" })
          .setOrigin(0.3, 0)
          .setDepth(100);
    this.guide = hand;
    this.onGuideState(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    this.guideTween = this.tweens.add({
      targets: hand,
      x: target.x,
      y: target.y + 20,
      alpha: 0.65,
      duration: 1500,
      yoyo: true,
      repeat: 0,
      onComplete: () => this.hideGuide(),
    });
  }

  checkpoint() {
    this.history.push(structuredClone(this.poses));
    if (this.history.length > 150) this.history.shift();
  }
  select(id: number) {
    if (this.fixed.has(id) || this.paused || this.won) return;
    this.selected = id;
    this.hideGuide();
    this.paint();
    this.onSelect();
  }
  release() {
    if (!this.drag) return;
    this.drag = false;
    this.dragPointer = -1;
    this.onAction("drop");
    this.tweens.add({
      targets: this,
      lift: 0,
      duration: 130,
      onUpdate: () => this.paint(),
    });
    this.snap();
    this.changed();
  }
  snap() {
    const id = this.selected;
    if (id < 0) return;
    this.poses[id] = alignPose(
      id,
      this.poses,
      (this.level.outlines?.flat() || this.level.outline) as Point[],
    );
  }

  transform(delta: number, flip = false) {
    if (
      this.selected < 0 ||
      this.paused ||
      this.won ||
      this.fixed.has(this.selected)
    )
      return;
    if ((!flip && !this.lesson.rotation) || (flip && !this.lesson.flipping))
      return;
    this.checkpoint();
    this.onAction(flip ? "flip" : "rotate");
    const p = this.poses[this.selected];
    p.angle = (p.angle + delta + 8) % 8;
    if (flip && this.selected === 4) p.flip = !p.flip;
    this.snap();
    this.changed();
  }
  move(dx: number, dy: number) {
    if (this.selected < 0 || this.paused || this.won) return;
    this.checkpoint();
    const p = this.poses[this.selected];
    p.x = Math.max(
      (35 - this.tx) / this.scaleUnit,
      Math.min(
        (boardSize(this.portrait).width - 35 - this.tx) / this.scaleUnit,
        p.x + dx,
      ),
    );
    p.y = Math.max(
      (35 - this.ty) / this.scaleUnit,
      Math.min(
        (boardSize(this.portrait).height - 40 - this.ty) / this.scaleUnit,
        p.y + dy,
      ),
    );
    this.changed();
  }
  undo() {
    if (this.paused || this.won) return;
    const p = this.history.pop();
    if (p) {
      this.poses = p;
      this.changed();
    }
  }
  changed() {
    this.paint();
    this.onChange();
    if (solved(this.poses, this.target)) {
      this.won = true;
      this.paint();
      this.onWin();
    }
  }
  paint() {
    if (!this.g || !this.level) return;
    const g = this.g;
    g.clear();
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    for (const outline of this.level.outlines || [this.level.outline]) {
      const ps = outline.map((p) => this.point(p as Point));
      g.fillStyle(0xded4bc, 0.38);
      g.fillPoints(ps, true);
      g.lineStyle(2, 0xb3a080, 0.65);
      g.strokePoints(ps, true);
    }
    const showAll = this.hint === 3;
    this.target.forEach((p, i) => {
      if (showAll || (this.hint >= 2 && i === this.hintIndex)) {
        g.lineStyle(1.7, 0x71816c, 0.65);
        g.strokePoints(
          p.map((v) => this.point(v)),
          true,
        );
        if (this.hint >= 2 && i === this.hintIndex) {
          g.fillStyle(parseInt(colors[i].slice(1), 16), 0.25);
          g.fillPoints(
            p.map((v) => this.point(v)),
            true,
          );
        }
      }
    });
    const order = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== this.selected);
    if (this.selected >= 0) order.push(this.selected);
    for (const i of order) {
      const lifted = i === this.selected ? this.lift : 0;
      const ps = poly(i, this.poses[i]).map((p) => this.point(p));
      for (let blur = 3; blur > 0; blur--) {
        g.fillStyle(0x50341e, 0.025);
        g.fillPoints(
          ps.map(
            (p) =>
              new Phaser.Geom.Point(
                p.x + 2 + blur,
                p.y + 7 + blur + lifted * 0.4,
              ),
          ),
          true,
        );
      }
      g.fillStyle(0x8b572e, 0.7);
      g.fillPoints(
        ps.map((p) => new Phaser.Geom.Point(p.x, p.y + 4 - lifted)),
        true,
      );
      if (i === this.selected && !this.fixed.has(i)) {
        g.lineStyle(5, 0xf3d48c, 0.9);
        g.strokePoints(
          ps.map((p) => new Phaser.Geom.Point(p.x, p.y - lifted)),
          true,
        );
      }
      const c = this.point([this.poses[i].x, this.poses[i].y]);
      this.pieceSprites[i]
        ?.setPosition(c.x, c.y - lifted)
        .setRotation((this.poses[i].angle * Math.PI) / 4)
        .setFlipX(this.poses[i].flip)
        .setDepth(i === this.selected ? 30 : 3 + i);
    }
  }
  update() {
    if (
      this.guide instanceof Phaser.GameObjects.Image &&
      this.textures.exists("rive-hand")
    ) {
      const texture = this.textures.get(
        "rive-hand",
      ) as Phaser.Textures.CanvasTexture;
      texture.refresh();
    }
  }
}
