import Phaser from "phaser";
import { poly, colors, bounds, type Point } from "./geometry";
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function wood(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  tint = "rgba(255,244,216,.22)",
) {
  ctx.save();
  ctx.drawImage(img, x, y, w, h);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
export function makeWorkbench(
  scene: Phaser.Scene,
  img: CanvasImageSource,
  portrait = false,
) {
  const key = portrait ? "wooden-workbench-portrait" : "wooden-workbench";
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = portrait ? 700 : 1100;
  c.height = portrait ? 960 : 700;
  const x = c.getContext("2d")!;
  if (portrait) {
    x.save();
    x.shadowColor = "#5e341529";
    x.shadowBlur = 14;
    x.shadowOffsetY = 6;
    rounded(x, 20, 12, 660, 525, 16);
    x.fillStyle = "#fffdf4";
    x.fill();
    x.restore();
    x.strokeStyle = "#dfd4b8";
    x.lineWidth = 2;
    rounded(x, 20, 12, 660, 525, 16);
    x.stroke();
    x.save();
    x.shadowColor = "#633a1e38";
    x.shadowBlur = 14;
    x.shadowOffsetY = 8;
    rounded(x, 20, 563, 660, 370, 22);
    x.fillStyle = "#ad7845";
    x.fill();
    x.restore();
    x.save();
    rounded(x, 20, 555, 660, 370, 22);
    x.clip();
    wood(x, img, 20, 555, 660, 370);
    x.restore();
    x.strokeStyle = "#fff1ce";
    x.lineWidth = 3;
    rounded(x, 24, 559, 652, 362, 20);
    x.stroke();
    x.save();
    rounded(x, 45, 580, 610, 325, 12);
    x.clip();
    wood(x, img, 45, 580, 610, 325, "rgba(114,74,30,.16)");
    x.restore();
    x.strokeStyle = "#946330a0";
    x.lineWidth = 2;
    rounded(x, 45, 580, 610, 325, 12);
    x.stroke();
    scene.textures.addCanvas(key, c);
    return key;
  }
  // A sheet of lightly textured drawing paper and a real wooden storage tray share the tabletop.
  x.save();
  x.translate(346, 350);
  x.rotate(-0.012);
  x.shadowColor = "#5e341529";
  x.shadowBlur = 16;
  x.shadowOffsetY = 8;
  rounded(x, -315, -302, 630, 604, 5);
  x.fillStyle = "#fffdf4";
  x.fill();
  x.restore();
  x.save();
  x.translate(346, 350);
  x.rotate(-0.012);
  x.strokeStyle = "#dfd4b8";
  x.lineWidth = 1;
  rounded(x, -315, -302, 630, 604, 5);
  x.stroke();
  x.fillStyle = "#d7c8aa";

  x.restore();
  // The wooden lip has a beveled upper edge and a recessed inner floor.
  x.save();
  x.shadowColor = "#633a1e38";
  x.shadowBlur = 16;
  x.shadowOffsetY = 12;
  rounded(x, 713, 73, 365, 559, 20);
  x.fillStyle = "#ad7845";
  x.fill();
  x.restore();
  x.save();
  rounded(x, 710, 65, 365, 559, 20);
  x.clip();
  wood(x, img, 710, 65, 365, 559);
  x.restore();
  x.strokeStyle = "#fff1ce";
  x.lineWidth = 3;
  rounded(x, 713, 68, 359, 553, 18);
  x.stroke();
  x.save();
  rounded(x, 733, 91, 319, 506, 10);
  x.clip();
  wood(x, img, 733, 91, 319, 506, "rgba(114,74,30,.16)");
  const shade = x.createLinearGradient(0, 91, 0, 597);
  shade.addColorStop(0, "#3a211c2c");
  shade.addColorStop(0.08, "#78491a04");
  shade.addColorStop(0.9, "#ffffff00");
  shade.addColorStop(1, "#fff3c32e");
  x.fillStyle = shade;
  x.fillRect(733, 91, 319, 506);
  x.restore();
  x.strokeStyle = "#946330a0";
  x.lineWidth = 2;
  rounded(x, 733, 91, 319, 506, 10);
  x.stroke();
  x.fillStyle = "#ab7b49";
  x.beginPath();
  x.ellipse(1071, 340, 8, 27, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#e8c497";
  x.beginPath();
  x.ellipse(1075, 338, 7, 25, 0, 0, Math.PI * 2);
  x.fill();
  x.font = "16px sans-serif";
  x.textAlign = "center";
  x.fillStyle = "#916c43";

  scene.textures.addCanvas(key, c);
  return key;
}
export function pieceTexture(
  scene: Phaser.Scene,
  id: number,
  unit: number,
  img: CanvasImageSource,
) {
  const key = `painted-wood-${id}-${unit.toFixed(3)}`;
  const ps = poly(id, { x: 0, y: 0, angle: 0, flip: false }).map(
      ([x, y]) => [x * unit, y * unit] as Point,
    ),
    b = bounds([ps]);
  const pad = 8,
    w = Math.ceil(b.maxX - b.minX) + pad * 2,
    h = Math.ceil(b.maxY - b.minY) + pad * 2;
  const ox = -b.minX + pad,
    oy = -b.minY + pad;
  if (!scene.textures.exists(key)) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d")!;
    const path = () => {
      x.beginPath();
      ps.forEach((p, j) =>
        j ? x.lineTo(p[0] + ox, p[1] + oy) : x.moveTo(p[0] + ox, p[1] + oy),
      );
      x.closePath();
    };
    x.save();
    path();
    x.clip();
    x.fillStyle = colors[id];
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "multiply";
    x.globalAlpha = id === 6 ? 0.9 : 0.38;
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = "source-over";
    x.globalAlpha = 1;
    const l = x.createLinearGradient(0, 0, w, h);
    l.addColorStop(0, "#ffffff23");
    l.addColorStop(0.5, "#ffffff00");
    l.addColorStop(1, "#4b1a0c18");
    x.fillStyle = l;
    x.fillRect(0, 0, w, h);
    x.restore();
    path();
    x.lineWidth = 3;
    x.strokeStyle = "#542b2060";
    x.lineJoin = "round";
    x.stroke();
    x.save();
    x.translate(-0.5, -0.8);
    path();
    x.lineWidth = 1.6;
    x.strokeStyle = "#ffffff65";
    x.stroke();
    x.restore();
    scene.textures.addCanvas(key, c);
  }
  return { key, originX: ox / w, originY: oy / h };
}
