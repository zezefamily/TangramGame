import { poly, bounds, colors, type Point } from "./geometry";
import type { Level } from "./board";
import { lessonFor } from "./progression";
export type ViewState = {
  levels: Level[];
  current: number;
  mode: string;
  records: Record<string, { done: boolean; independent: boolean }>;
  edition: string;
  sharedId: number;
  hasRun: boolean;
};
let artId = 0;
export function art(level: Level, colored = false, cls = "") {
  const ps = level.poses.map((p, i) => poly(i, p)),
    b = bounds(ps),
    id = "grain-" + artId++;
  return `<svg class="${cls}" viewBox="${b.minX - 0.2} ${b.minY - 0.2} ${b.maxX - b.minX + 0.4} ${b.maxY - b.minY + 0.4}" aria-hidden="true"><defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="3" height="3"><image href="${import.meta.env.BASE_URL}assets/wood/beech.jpg" width="3" height="3"/></pattern></defs>${
    colored
      ? ps
          .map((p, i) => {
            const points = p.map((v) => v.join(",")).join(" ");
            return `<polygon points="${points}" fill="${colors[i]}" stroke="#66402566" stroke-width=".025" stroke-linejoin="round"/><polygon points="${points}" fill="url(#${id})" opacity="${i === 6 ? 0.92 : 0.3}" style="mix-blend-mode:multiply"/>`;
          })
          .join("")
      : (level.outlines || [level.outline])
          .map(
            (p) =>
              `<polygon points="${p.map((v) => v.join(",")).join(" ")}" fill="currentColor"/>`,
          )
          .join("")
  }</svg>`;
}
export function pieceArt(i: number) {
  const ps = poly(i, { x: 0, y: 0, angle: 0, flip: false }),
    b = bounds([ps]);
  return `<svg viewBox="${b.minX - 0.2} ${b.minY - 0.2} ${b.maxX - b.minX + 0.4} ${b.maxY - b.minY + 0.4}" aria-hidden="true"><polygon points="${ps.map((v) => v.join(",")).join(" ")}" fill="currentColor"/></svg>`;
}
export function headerView(sound: boolean) {
  return `<header class="toy-header"><button class="brand" data-action="home" aria-label="返回玩具桌"><span class="brand-mark">◩</span><span>七巧木作<small>小小的木头，大大的世界</small></span></button><nav><button data-action="levels" class="round-tool" aria-label="打开图谱">▤</button><button data-action="sound" class="round-tool" aria-label="${sound ? "关闭音效" : "开启音效"}">${sound ? "♫" : "♩"}</button><button data-action="settings" class="round-tool parent-tool" aria-label="家长设置">⚙</button></nav></header>`;
}
export function homeView(s: ViewState) {
  const done = s.levels.filter(
    (l) => s.records[`${s.mode}:${l.id}`]?.done,
  ).length;
  return `<main class="toy-home"><section class="invitation"><span class="pencil-note">今天，想拼出什么呢？</span><h1>把想象<br>握在手里。</h1><p>拿一张图，摆几块木头。<br>慢慢试，总会有新发现。</p><button class="play-tag" data-action="start"><span class="play-triangle">▶</span>${s.hasRun ? "接着拼" : "拿出来玩"}<small>第 ${s.current} 张图</small></button><span class="home-footnote">一小步、一小步，拼出自己的小世界。</span></section><section class="toy-display" aria-label="木质七巧板玩具"><div class="desk-shadow"></div><button class="wood-box" data-action="start" aria-label="拿起七巧板开始游戏"><div class="tray-interior">${art(s.levels[0], true, "home-tangram")}</div><span class="finger-notch"></span><span class="box-engraving">七 巧 木 作</span></button><button class="book-object" data-action="levels" aria-label="打开拼图图谱"><span class="book-thread"></span><span class="book-title">我的七巧图谱</span>${art(s.levels[Math.min(2, s.levels.length - 1)], true, "book-cover-art")}<span class="book-subtitle">${s.levels.length} 张小世界</span><span class="book-corner"></span></button><button class="collection-object" data-action="collection" aria-label="查看我的作品"><span class="pressed-star">✶</span><span>我的作品<small>已收集 ${done} 张</small></span></button><span class="table-doodle doodle-a">✧</span><span class="table-doodle doodle-b">✦</span></section></main><div class="desk-caption"><span>榉木的温度，想象的形状。</span><button data-action="help">第一次玩？看一看小手示范</button></div>`;
}
export function bookView(s: ViewState, collection = false) {
  return `<main class="book-page ${collection ? "collection-page" : ""}"><div class="book-page-top"><button class="paper-back" data-action="home" aria-label="返回玩具桌">‹</button><div><span class="pencil-note">${collection ? "每一张，都是你亲手拼出来的" : "翻开一页，开始一个小故事"}</span><h1>${collection ? "我的作品小册" : "七巧图谱"}</h1></div><button class="book-tab" data-action="${collection ? "levels" : "collection"}">${collection ? "去挑一张图" : "看我的作品"}</button></div><div class="paper-binding" aria-hidden="true"><i></i><i></i><i></i></div><div class="card-shelf">${s.levels
    .map((l) => {
      const record = s.records[`${s.mode}:${l.id}`],
        unlocked =
          l.id === 1 ||
          !!s.records[`${s.mode}:${l.id - 1}`]?.done ||
          !!record?.done ||
          s.sharedId === l.id;
      const canPlay = collection ? !!record?.done : unlocked;
      return `<button class="puzzle-card ${record?.done ? "collected" : ""} ${canPlay ? "" : "locked"}" data-level="${l.id}" ${canPlay ? "" : "disabled"} aria-label="第 ${l.id} 张 ${l.name}${canPlay ? "" : "，尚未解锁"}"><span class="card-number">${String(l.id).padStart(2, "0")}</span>${art(l, collection && !!record?.done, "card-art")}<span class="card-name">${collection && !record?.done ? "等待你的作品" : l.name}</span><span class="card-note">${record?.done ? "再拼一次" : collection ? "" : unlocked ? `自己摆 ${lessonFor(l.id, s.mode).count} 块` : "再往前拼一张"}</span>${record?.done ? '<span class="card-stamp" aria-label="已完成">✶</span>' : ""}</button>`;
    })
    .join(
      "",
    )}</div><span class="book-pagination">${s.edition === "classic" ? "经典图谱 · 原有记录保留" : "木作小样 · 第一册"} / ${s.levels.length}</span></main>`;
}
export function playView(s: ViewState, showClock: boolean, clock: string) {
  const l = s.levels[s.current - 1],
    lesson = lessonFor(s.current, s.mode);
  return `<main class="game-page"><div class="play-top"><button class="paper-back" data-action="levels" aria-label="返回图谱">‹</button><div class="lesson-title"><span>第 ${s.current} / ${s.levels.length} 关</span><h1>${l.name}</h1></div><div class="little-mission"><span aria-hidden="true">☝</span><span>${lesson.instruction}</span></div><div class="play-utilities"><button id="clock" data-action="clock" aria-label="显示或隐藏计时">${showClock ? clock : "◷"}</button><button class="round-tool" data-action="pause" aria-label="暂停游戏">Ⅱ</button><button class="round-tool" data-action="settings" aria-label="家长设置">⚙</button></div></div><section class="workbench" aria-label="木质拼图桌"><div id="canvas-slot"></div><div id="pause-cover" hidden><span>先让小木头休息一下。</span><button class="play-tag" data-action="pause">▶ 接着拼</button></div></section><div class="tools"><div class="selection-tools"><span id="selection-label">拿起一块，试试看</span>${lesson.rotation ? '<button class="wood-tool" data-action="left" aria-label="向左旋转"><b>↶</b><span>左转</span></button><button class="wood-tool" data-action="right" aria-label="向右旋转"><b>↷</b><span>右转</span></button>' : ""}${lesson.flipping ? '<button class="wood-tool" data-action="flip" id="flip-btn" aria-label="翻面"><b>⇋</b><span>翻面</span></button>' : ""}<button class="wood-tool" data-action="undo" aria-label="撤销上一步"><b>↩</b><span>退一步</span></button></div><div class="other-tools"><button class="wood-tool" data-action="reset" aria-label="重新开始"><b>⟳</b><span>重新摆</span></button><button class="paper-tool" data-action="hint" aria-label="获取提示"><b>✧</b><span>帮帮我</span></button></div></div><div class="piece-select" aria-label="选择木块">${lesson.movable.map((i) => `<button data-piece="${i}" style="--piece:${colors[i]}" aria-label="选择第 ${i + 1} 块木块">${pieceArt(i)}</button>`).join("")}<span>拿起 · 转一转 · 放下</span></div><p id="game-note">${lesson.count < 7 ? `已经摆好的木块会留在原处，自己补上 ${lesson.count} 块。` : "看着图谱，慢慢找到七块木头的组合。"}</p></main>`;
}
