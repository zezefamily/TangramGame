import Phaser from "phaser";
import { boardSize } from "./layout";
import { readViewport, fitBoard } from "./viewport";
import { Board, type Level } from "./board";
import levelsData from "./levels.json";
import woodLevels from "./wood-levels.json";
import { ToyMotion } from "./motion";
import {
  art,
  headerView,
  homeView as toyHome,
  bookView,
  playView,
  type ViewState,
} from "./views";
import { poly, colors, bounds, type Pose } from "./geometry";
import { chapters, lessonFor } from "./progression";
import "./style.css";
import "./app.css";
const params = new URLSearchParams(location.search);
const edition =
  params.get("pack") === "classic" ||
  (params.get("pack") !== "wood" && Number(params.get("level")) > 8)
    ? "classic"
    : "wood";
const levels = (edition === "classic" ? levelsData : woodLevels) as Level[];
const total = levels.length;
const storageKey = edition === "classic" ? "sevenfold-v1" : "sevenfold-wood-v1";
const motion = new ToyMotion();
type Run = {
  poses: Pose[];
  seconds: number;
  usedHint: boolean;
  hint: number;
  hintIndex: number;
  lessonVersion?: number;
  portrait?: boolean;
};
type RecordEntry = { done: boolean; independent: boolean; best?: number };
type Store = {
  mode: string;
  last: number;
  sound: boolean;
  records: Record<string, RecordEntry>;
  runs: Record<string, Run>;
  intro: boolean;
  rulesVersion: number;
};
const defaults: Store = {
  mode: "relax",
  last: 1,
  sound: true,
  records: {},
  runs: {},
  intro: false,
  rulesVersion: 3,
};
let store: Store = structuredClone(defaults);
let storageOK = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (saved && saved.records && saved.runs) {
    store = { ...defaults, ...saved };
    if (saved.rulesVersion !== 3) {
      store.mode = "relax";
      store.rulesVersion = 3;
    }
  }
} catch {
  storageOK = false;
}
let mode = store.mode === "challenge" ? "challenge" : "relax",
  current = Math.min(total, Math.max(1, store.last || 1));
let screen = "home",
  seconds = 0,
  usedHint = false,
  pause = false,
  lastTick = Date.now(),
  modalOpen = false;
let active = false,
  showClock = false;
let lastResult = { independent: false, best: false };
const board = new Board();
let viewport = readViewport();
function applyViewport() {
  viewport = readViewport();
  document.documentElement.style.setProperty(
    "--app-height",
    `${viewport.height}px`,
  );
  document.documentElement.dataset.compactHeight = String(viewport.compact);
}
applyViewport();
const portraitLayout = () => viewport.portrait;
board.portrait = portraitLayout();
const stage = document.createElement("div");
stage.id = "board-stage";
const app = document.querySelector<HTMLDivElement>("#app")!;
const difficulty = chapters.map((c) => c.name);
const key = () => `${mode}:${current}`;
function save() {
  store.mode = mode;
  store.last = current;
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    storageOK = false;
  }
}
function persist() {
  if (screen !== "game" || !active || board.won) return;
  store.runs[key()] = {
    poses: structuredClone(board.poses),
    seconds,
    usedHint,
    hint: board.hint,
    hintIndex: board.hintIndex,
    lessonVersion: 2,
    portrait: board.portrait,
  };
  save();
}
function time(s: number) {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
}
function stats() {
  const rs = Object.entries(store.records)
    .filter(([k]) => k.startsWith(`${mode}:`))
    .map(([, v]) => v);
  return {
    done: rs.filter((r) => r.done).length,
    independent: rs.filter((r) => r.independent).length,
  };
}
function viewState(): ViewState {
  return {
    levels,
    current,
    mode,
    records: store.records,
    edition,
    sharedId,
    hasRun: !!store.runs[key()],
  };
}
function svg(level: Level, colored = false, cls = "") {
  return art(level, colored, cls);
}
function render() {
  document.body.dataset.screen = screen;
  document.body.dataset.lesson = String(current);
  document.body.dataset.mode = mode;
  active = false;
  board.paused = true;
  if (screen !== "game") board.hideGuide();
  motion.clear();
  const state = viewState();
  app.innerHTML =
    headerView(store.sound) +
    (screen === "home"
      ? toyHome(state)
      : screen === "game"
        ? playView(state, showClock, time(seconds))
        : bookView(state, screen === "collection")) +
    `<footer class="app-tabs" aria-label="主要导航"><button data-action="home" ${screen === "home" ? 'aria-current="page"' : ""}><b aria-hidden="true">◩</b><span>玩具桌</span></button><button data-action="levels" ${screen === "levels" ? 'aria-current="page"' : ""}><b aria-hidden="true">▤</b><span>图谱</span></button><button data-action="collection" ${screen === "collection" ? 'aria-current="page"' : ""}><b aria-hidden="true">✶</b><span>我的作品</span></button></footer><div id="modal-root"></div><div id="toast" role="status"></div>`;
  if (screen === "game") {
    document.querySelector("#canvas-slot")!.appendChild(stage);
    boardObserver.disconnect();
    boardObserver.observe(document.querySelector(".workbench")!);
    scheduleBoardLayout();
    active = true;
    board.paused = pause;
    board.paint();
    updateControls();
    updatePause();
  }
  bind();
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  ...boardSize(board.portrait),
  backgroundColor: "#fffdf7",
  parent: stage,
  transparent: true,
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: board,
  input: { activePointers: 2 },
  banner: false,
});
let layoutFrame = 0;
function scheduleBoardLayout() {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    if (!board.g || screen !== "game") return;
    board.setPortrait(portraitLayout());
    const slot = document.querySelector<HTMLElement>("#canvas-slot");
    const workbench = document.querySelector<HTMLElement>(".workbench");
    if (
      !slot ||
      !workbench ||
      workbench.clientWidth <= 0 ||
      workbench.clientHeight <= 0
    )
      return;
    const size = boardSize(board.portrait);
    const fitted = fitBoard(
      workbench.clientWidth,
      workbench.clientHeight,
      size.width,
      size.height,
    );
    slot.style.width = `${fitted.width}px`;
    slot.style.height = `${fitted.height}px`;
    board.scale.getParentBounds();
    board.scale.refresh();
  });
}
const boardObserver = new ResizeObserver(scheduleBoardLayout);
function viewportChanged() {
  applyViewport();
  scheduleBoardLayout();
}
window.addEventListener("resize", viewportChanged);
window.addEventListener("pageshow", viewportChanged);
window.visualViewport?.addEventListener("resize", viewportChanged);
function attachHand() {
  if (motion.handReady && board.g) {
    if (!game.textures.exists("rive-hand"))
      game.textures.addCanvas("rive-hand", motion.handCanvas);
    if (screen === "game" && board.lesson.count === 1 && current <= 3)
      board.showGuide();
  }
}
motion.onHandReady = attachHand;
board.onGuideState = (active) => motion.guide(active);
board.onReady = attachHand;
board.onAction = (action) => woodSound(action);
function woodSound(action: string) {
  if (!store.sound) return;
  try {
    const ctx = new AudioContext(),
      now = ctx.currentTime;
    const duration = action === "page" ? 0.14 : 0.045;
    const noise = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * duration),
        ctx.sampleRate,
      ),
      data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.22));
    const n = ctx.createBufferSource();
    n.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value =
      action === "page" ? 4300 : 1500 + Math.max(0, board.selected) * 110;
    filter.Q.value = action === "page" ? 0.5 : 1.5;
    const ng = ctx.createGain();
    ng.gain.value = action === "page" ? 0.025 : 0.07;
    n.connect(filter);
    filter.connect(ng);
    ng.connect(ctx.destination);
    n.start();
    if (action !== "page") {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value =
        (action === "pick" ? 440 : action === "drop" ? 260 : 350) +
        Math.max(0, board.selected) * 13;
      g.gain.setValueAtTime(0.055, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(now + 0.07);
    }
    setTimeout(() => ctx.close(), 350);
  } catch {}
}

function updateControls() {
  const label = document.querySelector("#selection-label");
  if (label)
    label.textContent =
      board.selected < 0 ? "拿起一块，试试看" : "轻轻拿起，慢慢摆好";
  for (const a of ["left", "right"]) {
    const b = document.querySelector<HTMLButtonElement>(`[data-action="${a}"]`);
    if (b) b.disabled = board.selected < 0;
  }
  const f = document.querySelector<HTMLButtonElement>("#flip-btn");
  if (f) f.disabled = board.selected !== 4;
  document.querySelectorAll<HTMLElement>("[data-piece]").forEach((b) => {
    b.classList.toggle("selected", Number(b.dataset.piece) === board.selected);
    b.setAttribute(
      "aria-pressed",
      String(Number(b.dataset.piece) === board.selected),
    );
  });
}
board.onSelect = updateControls;
board.onChange = persist;
board.onWin = () => {
  const old = store.records[key()];
  const independent = mode === "challenge" && !usedHint;
  lastResult = {
    independent,
    best: !usedHint && (!old?.best || seconds < old.best),
  };
  store.records[key()] = {
    done: true,
    independent: !!old?.independent || independent,
    best: !usedHint ? Math.min(old?.best ?? Infinity, seconds) : old?.best,
  };
  delete store.runs[key()];
  save();
  tone(true);
  setTimeout(winModal, 220);
};
function tone(win = false) {
  if (!store.sound) return;
  try {
    const ctx = new AudioContext();
    [0, ...(win ? [0.12, 0.24] : [])].forEach((delay, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = [440, 554, 659][i];
      g.gain.setValueAtTime(0.05, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.25,
      );
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.26);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {}
}
function start(id = current, fresh = false) {
  if (!board.g) {
    setTimeout(() => start(id, fresh), 100);
    return;
  }
  current = id;
  history.replaceState(
    null,
    "",
    `${location.pathname}?level=${id}&mode=${mode}&pack=${edition}`,
  );
  store.last = id;
  const storedRun = fresh ? undefined : store.runs[key()];
  const run =
    edition === "wood" && storedRun?.lessonVersion !== 2
      ? undefined
      : storedRun;
  seconds = run?.seconds || 0;
  usedHint = !!run?.usedHint;
  pause = false;
  board.setupLevel(levels[id - 1], mode, run?.poses, run?.portrait || false);
  board.hint = run?.hint || 0;
  board.hintIndex = run?.hintIndex || 0;
  screen = "game";
  lastTick = Date.now();
  render();
  persist();
  if (!store.intro) {
    store.intro = true;
    save();
    if (mode === "challenge") help();
  }
}
function navigate(to: string) {
  persist();
  history.replaceState(
    null,
    "",
    location.pathname + (edition === "classic" ? "?pack=classic" : ""),
  );
  screen = to;
  pause = false;
  render();
  window.scrollTo(0, 0);
}
function setMode(m: string) {
  persist();
  mode = m;
  if (
    current > 1 &&
    !store.records[`${mode}:${current - 1}`]?.done &&
    !store.records[key()]?.done &&
    sharedId !== current
  )
    current = 1;
  save();
  render();
}
function bind() {
  document.body.onclick = null;
  document
    .querySelectorAll<HTMLButtonElement>("button[data-action]")
    .forEach((b) => (b.onclick = () => action(b.dataset.action!)));
  document
    .querySelectorAll<HTMLButtonElement>("button[data-mode]")
    .forEach((b) => (b.onclick = () => setMode(b.dataset.mode!)));
  document
    .querySelectorAll<HTMLButtonElement>("button[data-level]")
    .forEach((b) => (b.onclick = () => start(Number(b.dataset.level))));
  document
    .querySelectorAll<HTMLButtonElement>("button[data-piece]")
    .forEach((b) => (b.onclick = () => board.select(Number(b.dataset.piece))));
}
function action(a: string) {
  if (a === "home") navigate("home");
  if (a === "levels") navigate("levels");
  if (a === "collection") navigate("collection");
  if (a === "settings") settings();
  if (a === "start") start();
  if (a === "sound") {
    store.sound = !store.sound;
    save();
    const b = document.querySelector<HTMLButtonElement>(
      '[data-action="sound"]',
    )!;
    b.textContent = store.sound ? "♫" : "♩";
    b.setAttribute("aria-label", store.sound ? "关闭音效" : "开启音效");
    tone();
  }
  if (a === "help") help();
  if (a === "left") board.transform(-1);
  if (a === "right") board.transform(1);
  if (a === "flip") board.transform(0, true);
  if (a === "undo") board.undo();
  if (a === "hint") hint();
  if (a === "clock") {
    showClock = !showClock;
    document.querySelector("#clock")!.textContent = showClock
      ? time(seconds)
      : "显示计时";
  }
  if (a === "pause") {
    pause = !pause;
    updatePause();
    persist();
  }
  if (a === "reset")
    modal(
      "要重新拼吗？",
      "这次从头来，得到的星星会保留。",
      `<button class="secondary" id="cancel-reset">▶ 接着玩</button><button class="primary" id="confirm-reset">⟳ 重新拼</button>`,
      () => {
        document
          .querySelector("#cancel-reset")!
          .addEventListener("click", closeModal);
        document
          .querySelector("#confirm-reset")!
          .addEventListener("click", () => {
            delete store.runs[key()];
            closeModal();
            start(current, true);
          });
      },
    );
}
function updatePause() {
  board.paused = pause || modalOpen || document.hidden;
  motion.guide(!board.paused && !!board.guide && screen === "game");
  const c = document.querySelector<HTMLElement>("#pause-cover");
  if (c) c.hidden = !pause;
}
let priorFocus: HTMLElement | null = null;
function modal(
  title: string,
  body: string,
  buttons: string,
  bindExtra?: () => void,
) {
  priorFocus = document.activeElement as HTMLElement;
  modalOpen = true;
  board.paused = true;
  document.querySelector("#modal-root")!.innerHTML =
    `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close icon-button" id="close-modal" aria-label="关闭对话框">×</button><h2 id="modal-title">${title}</h2><div class="modal-body">${body}</div><div class="modal-actions">${buttons}</div></section></div>`;
  document.querySelector("#close-modal")!.addEventListener("click", closeModal);
  bindExtra?.();
  document.querySelector<HTMLButtonElement>("#close-modal")!.focus();
}
function closeModal() {
  modalOpen = false;
  document.querySelector("#modal-root")!.innerHTML = "";
  motion.clear();
  updatePause();
  priorFocus?.focus();
}
function help() {
  modal(
    "一起学会拼图",
    `<div class="help-steps"><p><b>☝ 拖一拖</b>把彩色拼板拖到空白处。</p><p><b>↻ 转一转</b>后面的关卡会出现旋转按钮。</p><p><b>💡 帮帮我</b>想不出来时，可以点小灯泡。</p></div>`,
    `<button class="primary" id="help-ok">▶ 我来试试</button>`,
    () =>
      document.querySelector("#help-ok")!.addEventListener("click", closeModal),
  );
}

function hint() {
  if (board.won || pause) return;
  usedHint = true;
  board.hint = Math.min(
    3,
    board.hint + (mode === "relax" && board.hint === 0 ? 2 : 1),
  );
  if (board.hint === 1) {
    const note = document.querySelector("#game-note")!;
    note.textContent = board.lesson.rotation
      ? "先找一个角，试着把拼板转一转。"
      : "看看空白的形状，哪一块和它一样呢？";
  } else if (board.hint === 2) {
    board.hintIndex = board.lesson.movable[0];
    document.querySelector("#game-note")!.textContent =
      `看看发亮的区域，这一块可以放在那里。`;
  } else
    document.querySelector("#game-note")!.textContent =
      "分块线来帮忙啦，试着把空白填满吧。";
  board.paint();
  persist();
}
function winModal() {
  modal(
    current === total ? "这一册，你都拼出来了！" : "收进你的作品小册。",
    `<div class="finished-card"><span class="pencil-note">我的第 ${current} 张作品</span>${svg(levels[current - 1], true, "win-puzzle")}<h3>${levels[current - 1].name}</h3><p>${levels[current - 1].story || "每次尝试，都会有新的发现。"}</p><canvas id="reward-motion" class="reward-motion" aria-label="盖上完成印章"></canvas></div>`,
    `<button class="play-tag" id="next">${current < total ? "翻到下一张　›" : "打开我的作品集"}</button><button class="secondary" id="replay">再摆一次</button><button class="secondary" id="share">分享这一张</button>`,
    () => {
      document.querySelector("#next")!.addEventListener("click", () => {
        closeModal();
        flipPage(() =>
          current < total ? start(current + 1) : navigate("collection"),
        );
      });
      document.querySelector("#replay")!.addEventListener("click", () => {
        closeModal();
        start(current, true);
      });
      document.querySelector("#share")!.addEventListener("click", share);
      document.querySelector<HTMLButtonElement>("#close-modal")!.hidden = true;
      document.querySelector<HTMLButtonElement>("#next")!.focus();
      motion.attach(
        document.querySelector("#reward-motion")!,
        current === 8 ? "Bird" : "Seal",
      );
    },
  );
}
function flipPage(next: () => void) {
  woodSound("page");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    next();
    return;
  }
  const overlay = document.createElement("div");
  overlay.className = "page-transition";
  const canvas = document.createElement("canvas");
  overlay.appendChild(canvas);
  document.body.appendChild(overlay);
  motion.attach(canvas, "Page");
  setTimeout(() => {
    overlay.remove();
    next();
  }, 550);
}
function settings() {
  modal(
    "家长的小抽屉",
    `<p>从补一块开始，或让七块木头一起上场。</p><div class="parent-options"><button id="settings-sound" class="secondary">${store.sound ? "音效：已开启" : "音效：已关闭"}</button><button id="gentle-mode" class="secondary">一步一步玩</button><button id="full-mode" class="secondary">七块完整挑战</button><button id="switch-book" class="secondary">${edition === "wood" ? "经典 100 题（保留旧记录）" : "回到木作第一册"}</button></div>`,
    `<button id="settings-done" class="play-tag">收好，继续玩</button>`,
    () => {
      document
        .querySelector("#settings-sound")!
        .addEventListener("click", () => {
          store.sound = !store.sound;
          save();
          document.querySelector("#settings-sound")!.textContent = store.sound
            ? "音效：已开启"
            : "音效：已关闭";
        });
      document.querySelector("#gentle-mode")!.addEventListener("click", () => {
        closeModal();
        setMode("relax");
        if (screen === "game") start(current);
      });
      document.querySelector("#full-mode")!.addEventListener("click", () => {
        closeModal();
        setMode("challenge");
        if (screen === "game") start(current);
      });
      document.querySelector("#switch-book")!.addEventListener("click", () => {
        persist();
        location.href =
          location.pathname + (edition === "wood" ? "?pack=classic" : "");
      });
      document
        .querySelector("#settings-done")!
        .addEventListener("click", closeModal);
    },
  );
}

async function share() {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("level", String(current));
  url.searchParams.set("mode", mode);
  url.searchParams.set("pack", edition);
  try {
    await navigator.clipboard.writeText(url.href);
    toast("关卡链接已复制，发给朋友一起挑战。");
  } catch {
    modal(
      "分享这一关",
      `<p>复制链接，在其他设备打开即可挑战同一道题。</p><input class="share-input" readonly aria-label="关卡链接" value="${url.href.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"/>`,
      '<button class="primary" id="share-back">返回成绩</button>',
      () =>
        document.querySelector("#share-back")!.addEventListener("click", () => {
          closeModal();
          winModal();
        }),
    );
  }
}
let toastTimeout: ReturnType<typeof setTimeout>;
function toast(s: string) {
  const el = document.querySelector("#toast")!;
  el.textContent = s;
  el.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("visible"), 3000);
}
window.addEventListener("keydown", (e) => {
  if (modalOpen) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
    if (e.key === "Tab") {
      const f = Array.from(
        document.querySelectorAll<HTMLElement>(".modal button,.modal input"),
      );
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (screen !== "game" || pause || board.won) return;
  const k = e.key.toLowerCase();
  if (k === "q") board.transform(-1);
  if (k === "e") board.transform(1);
  if (k === "f") board.transform(0, true);
  if (k === "z" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    board.undo();
  }
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-0.025, 0],
    ArrowRight: [0.025, 0],
    ArrowUp: [0, -0.025],
    ArrowDown: [0, 0.025],
  };
  if (moves[e.key]) {
    e.preventDefault();
    board.move(...moves[e.key]);
  }
});
setInterval(() => {
  const now = Date.now(),
    delta = (now - lastTick) / 1000;
  lastTick = now;
  if (
    screen === "game" &&
    active &&
    !pause &&
    !modalOpen &&
    !document.hidden &&
    !board.won
  ) {
    seconds += Math.min(delta, 1.5);
    const el = document.querySelector("#clock");
    if (el && showClock) el.textContent = time(seconds);
    persist();
  }
}, 1000);
document.addEventListener("visibilitychange", () => {
  lastTick = Date.now();
  updatePause();
  persist();
});
window.addEventListener("pagehide", persist);
const paramId = Number(params.get("level"));
const sharedId =
  Number.isInteger(paramId) && paramId >= 1 && paramId <= total ? paramId : 0;
if (params.get("mode") === "challenge" || params.get("mode") === "relax")
  mode = params.get("mode")!;
render();
if (sharedId) start(sharedId);

if (import.meta.env.DEV) {
  (window as unknown as { __tangram: unknown }).__tangram = {
    board,
    game,
    motion,
    edition,
  };
}
