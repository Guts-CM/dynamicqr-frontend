export type QrStylePalette = {
  id: string;
  label: string;
  colorModulos: string;
  colorFondo: string;
  colorGradiente: string;
};

export const QR_STYLE_PALETTES: QrStylePalette[] = [
  {
    id: 'profesional',
    label: 'Profesional',
    colorModulos: '#111827',
    colorFondo: '#FFFFFF',
    colorGradiente: '#233133',
  },
  {
    id: 'indigo',
    label: 'Índigo',
    colorModulos: '#111827',
    colorFondo: '#FFFFFF',
    colorGradiente: '#6366F1',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    colorModulos: '#152023',
    colorFondo: '#F9FBFB',
    colorGradiente: '#6E7A7D',
  },
  {
    id: 'moderno',
    label: 'Moderno',
    colorModulos: '#050D10',
    colorFondo: '#F3F5F6',
    colorGradiente: '#9FAAAC',
  },
  {
    id: 'contraste',
    label: 'Contraste',
    colorModulos: '#050D10',
    colorFondo: '#FFFFFF',
    colorGradiente: '#050D10',
  },
];

export const QR_MODULE_COLOR_SWATCHES = ['#050D10', '#111827', '#152023', '#233133', '#0F172A'] as const;
export const QR_BACKGROUND_COLOR_SWATCHES = ['#FFFFFF', '#F9FBFB', '#F3F5F6', '#E6E9EA'] as const;
export const QR_GRADIENT_COLOR_SWATCHES = ['#6366F1', '#4F5D5F', '#9FAAAC', '#233133', '#405053', '#818CF8'] as const;

export function sameHex(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();
}

export function paletteMatches(
  palette: QrStylePalette,
  colors: { colorModulos: string; colorFondo: string; colorGradiente: string; transparent: boolean },
): boolean {
  return (
    !colors.transparent &&
    sameHex(palette.colorModulos, colors.colorModulos) &&
    sameHex(palette.colorFondo, colors.colorFondo) &&
    sameHex(palette.colorGradiente, colors.colorGradiente)
  );
}

export function isCircleModule(shape: string): boolean {
  return shape === 'circulo';
}

export function isDiamondModule(shape: string): boolean {
  return shape === 'diamante';
}

export function modulePreviewRadius(shape: string): number {
  switch (shape) {
    case 'cuadrado':
      return 0.04;
    case 'suave':
      return 0.14;
    case 'extra_redondeado':
      return 0.36;
    case 'circulo':
      return 0.4;
    default:
      return 0.22;
  }
}

export function isCircleEye(shape: string): boolean {
  return shape === 'circulo';
}

export function eyePupilRadius(shape: string): number {
  switch (shape) {
    case 'cuadrado':
      return 0;
    case 'extra_redondeado':
      return 1.2;
    case 'circulo':
      return 1.5;
    default:
      return 0.55;
  }
}

export function eyeRingPath(x: number, y: number, shape: string): string {
  const outer = 7;
  const hole = 5;
  const cx = x + outer / 2;
  const cy = y + outer / 2;

  if (isCircleEye(shape)) {
    return `${circlePath(cx, cy, outer / 2)} ${circlePath(cx, cy, hole / 2)}`;
  }

  return `${roundedRectPath(x, y, outer, outer, eyeCornerRadius(shape, 'outer'))} ${roundedRectPath(
    x + 1,
    y + 1,
    hole,
    hole,
    eyeCornerRadius(shape, 'inner'),
  )}`;
}

function eyeCornerRadius(shape: string, part: 'outer' | 'inner'): number {
  if (shape === 'cuadrado') {
    return 0;
  }

  if (shape === 'extra_redondeado') {
    return part === 'outer' ? 2.35 : 1.7;
  }

  return part === 'outer' ? 1.1 : 0.75;
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${fmt(cx - r)},${fmt(cy)} a ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(r * 2)} 0 a ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-r * 2)} 0 z`;
}

function roundedRectPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
  if (r === 0) {
    return `M ${fmt(x)},${fmt(y)} h ${fmt(w)} v ${fmt(h)} h ${fmt(-w)} z`;
  }

  return (
    `M ${fmt(x + r)},${fmt(y)}` +
    ` H ${fmt(x + w - r)}` +
    ` A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + w)} ${fmt(y + r)}` +
    ` V ${fmt(y + h - r)}` +
    ` A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + w - r)} ${fmt(y + h)}` +
    ` H ${fmt(x + r)}` +
    ` A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y + h - r)}` +
    ` V ${fmt(y + r)}` +
    ` A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + r)} ${fmt(y)} z`
  );
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function diamondPoints(x: number, y: number, size = 0.8): string {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return `${cx},${y} ${x + size},${cy} ${cx},${y + size} ${x},${cy}`;
}
