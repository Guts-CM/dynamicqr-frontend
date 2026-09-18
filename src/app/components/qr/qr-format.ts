import { parseQrFecha } from './qr-response';

export const QR_TYPE_LABELS: Record<string, string> = {
  url: 'URL',
  texto: 'Texto',
  wifi: 'Wi-Fi',
  vcard: 'vCard',
  email: 'Email',
  telefono: 'Teléfono',
};

export const QR_TYPE_OPTIONS = Object.entries(QR_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const QR_MODULE_SHAPE_OPTIONS = [
  { value: 'cuadrado', label: 'Cuadrado' },
  { value: 'suave', label: 'Suave' },
  { value: 'redondeado', label: 'Redondeado' },
  { value: 'extra_redondeado', label: 'Pastilla' },
  { value: 'circulo', label: 'Puntos' },
  { value: 'diamante', label: 'Diamante' },
] as const;

export const QR_EYE_SHAPE_OPTIONS = [
  { value: 'cuadrado', label: 'Cuadrado' },
  { value: 'redondeado', label: 'Redondeado' },
  { value: 'extra_redondeado', label: 'Suave' },
  { value: 'circulo', label: 'Circular' },
] as const;

export const QR_SHAPE_LABELS: Record<string, string> = {
  redondeado: 'Redondeado',
  rounded: 'Redondeado',
  extra_redondeado: 'Pastilla',
  suave: 'Suave',
  soft: 'Suave',
  cuadrado: 'Cuadrado',
  square: 'Cuadrado',
  circular: 'Circular',
  circulo: 'Circular',
  circle: 'Circular',
  diamante: 'Diamante',
  diamond: 'Diamante',
  punto: 'Puntos',
  dot: 'Puntos',
};

const HEX_PATTERN = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

export function qrTypeLabel(tipo: string | null | undefined): string {
  const key = (tipo ?? '').trim().toLowerCase();
  if (!key) {
    return '—';
  }

  return QR_TYPE_LABELS[key] ?? tipo!.trim();
}

export function qrShapeLabel(shape: string | null | undefined): string {
  const key = (shape ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!key) {
    return '—';
  }

  return QR_SHAPE_LABELS[key] ?? capitalizeLabel(shape!);
}

export function formatQrDay(value: string | number[] | null): string {
  const date = parseQrFecha(value);
  if (!date) {
    return 'Sin fecha';
  }

  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatQrTimestamp(value: string | number[] | null): string {
  const date = parseQrFecha(value);
  if (!date) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatQrCodeId(id: number | null | undefined): string {
  return id != null ? `QR #${id}` : 'QR #—';
}

export function formatUserName(
  name: string | null | undefined,
  id: number | null | undefined,
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }

  return id != null ? `Usuario ${id}` : '—';
}

export function isCssHex(color: string | null | undefined): boolean {
  return !!color && HEX_PATTERN.test(color.trim());
}

export function isTransparentBackground(color: string | null | undefined): boolean {
  const key = (color ?? '').trim().toLowerCase();
  return key === 'transparent' || key === 'none';
}

export function backgroundLabel(color: string | null | undefined): string {
  if (isTransparentBackground(color)) {
    return 'Transparente';
  }

  const trimmed = color?.trim();
  return trimmed || '—';
}

export function qrFileSlug(name: string | null | undefined): string {
  const slug = (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'codigo-qr';
}

function capitalizeLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '—';
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
