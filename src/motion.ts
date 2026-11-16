import { Rive, Layout, Fit, Alignment, RuntimeLoader } from "@rive-app/canvas";
RuntimeLoader.setWasmUrl(`${import.meta.env.BASE_URL}assets/rive/rive.wasm`);
export class ToyMotion {
  private players = new Set<Rive>();
  handCanvas = document.createElement("canvas");
  handReady = false;
  onHandReady = () => {};
  handPlayer?: Rive;
  error = "";
  guideActive = false;
  constructor() {
    this.handCanvas.width = 200;
    this.handCanvas.height = 200;
    this.handCanvas.style.cssText =
      "position:fixed;left:0;top:0;width:200px;height:200px;opacity:0;pointer-events:none;z-index:-1";
    this.handCanvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.handCanvas);
    this.handPlayer = this.load(this.handCanvas, "Guide", true, () => {
      this.handReady = true;
      this.onHandReady();
      if (!this.guideActive) this.handPlayer?.pause();
    });
  }
  load(
    canvas: HTMLCanvasElement,
    artboard: string,
    loop = false,
    onReady = () => {},
  ) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const player = new Rive({
      src: `${import.meta.env.BASE_URL}assets/rive/wood-feedback.riv`,
      canvas,
      artboard,
      shouldDisableRiveListeners: true,
      animations:
        artboard === "Seal"
          ? "Celebrate"
          : artboard === "Page"
            ? "Turn"
            : artboard === "Bird"
              ? "Flutter"
              : "Guide",
      autoplay: !reduce,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        player.resizeDrawingSurfaceToCanvas();
        player.startRendering();
        canvas.dataset.ready = "true";
        onReady();
      },
      onLoadError: () => {
        canvas.dataset.ready = "false";
        this.error = "Rive asset failed to load";
      },
    });
    this.players.add(player);
    return player;
  }
  guide(active: boolean) {
    this.guideActive = active;
    if (!this.handPlayer) return;
    if (active && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      this.handPlayer.play();
    else this.handPlayer.pause();
  }
  attach(canvas: HTMLCanvasElement, artboard: string) {
    canvas.width = 400;
    canvas.height = 320;
    return this.load(canvas, artboard);
  }
  clear() {
    for (const p of [...this.players]) {
      if (p !== this.handPlayer) {
        p.cleanup();
        this.players.delete(p);
      }
    }
  }
}
