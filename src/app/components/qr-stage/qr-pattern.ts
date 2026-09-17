export type QrModuleKind = 'finder' | 'timing' | 'data';

export interface QrModule {
  id: string;
  x: number;
  y: number;
  kind: QrModuleKind;
}

export const QR_SIZE = 21;
export const QR_CENTER = QR_SIZE / 2;
export const QR_PARTICLE_COUNT = 22;

const FINDER_ORIGINS = [
  [0, 0],
  [QR_SIZE - 7, 0],
  [0, QR_SIZE - 7],
] as const;

function finderOrigin(x: number, y: number): readonly [number, number] | null {
  for (const origin of FINDER_ORIGINS) {
    if (x >= origin[0] && x < origin[0] + 7 && y >= origin[1] && y < origin[1] + 7) {
      return origin;
    }
  }

  return null;
}

function isFinderFilled(x: number, y: number, ox: number, oy: number): boolean {
  const i = x - ox;
  const j = y - oy;
  const border = i === 0 || i === 6 || j === 0 || j === 6;
  const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
  return border || core;
}

function isTiming(x: number, y: number): boolean {
  const onVertical = x === 6 && y >= 8 && y <= QR_SIZE - 9;
  const onHorizontal = y === 6 && x >= 8 && x <= QR_SIZE - 9;
  return onVertical || onHorizontal;
}

function isDataFilled(x: number, y: number): boolean {
  const mixed = (x * 73 + y * 157 + ((x ^ y) * 19)) >>> 0;
  const checker = (x + y) % 2 === 0;
  return checker ? mixed % 3 !== 1 : mixed % 5 > 1;
}

export function createQrModules(): QrModule[] {
  const modules: QrModule[] = [];

  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      const finder = finderOrigin(x, y);

      if (finder) {
        if (isFinderFilled(x, y, finder[0], finder[1])) {
          modules.push({ id: `${x}-${y}`, x, y, kind: 'finder' });
        }
        continue;
      }

      if (isTiming(x, y)) {
        if ((x + y) % 2 === 0) {
          modules.push({ id: `${x}-${y}`, x, y, kind: 'timing' });
        }
        continue;
      }

      if (isDataFilled(x, y)) {
        modules.push({ id: `${x}-${y}`, x, y, kind: 'data' });
      }
    }
  }

  return modules;
}

export const QR_PARTICLES = Array.from({ length: QR_PARTICLE_COUNT }, (_, index) => index);
