/** Logical board coordinates; CSS scales these without shrinking interface text. */
export type TrayBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
export const boardSize = (portrait: boolean) =>
  portrait ? { width: 700, height: 960 } : { width: 1100, height: 700 };
export const trayBounds = (portrait: boolean): TrayBounds =>
  portrait
    ? { left: 45, top: 590, right: 655, bottom: 905 }
    : { left: 733, top: 91, right: 1052, bottom: 597 };
export const targetCenter = (portrait: boolean) =>
  portrait ? [350, 270] : [335, 340];
export const inTray = (x: number, y: number, portrait: boolean) =>
  portrait ? y >= 550 : x >= 690;
