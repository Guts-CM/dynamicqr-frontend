export interface QrEstilo {
  colorModulos: string | null;
  colorFondo: string | null;
  colorGradiente: string | null;
  formaModulo: string | null;
  formaOjo: string | null;
}

export class QrResponse {
  qrId: number | null = null;
  nombre = '';
  tipo = '';
  destinoUrl: string | null = null;
  contenido: string | null = null;
  activo = false;
  totalEscaneos = 0;
  usuarioCreador: number | null = null;
  nombreCreador: string | null = null;
  fechaCreacion: string | number[] | null = null;
  usuarioEditor: number | null = null;
  nombreEditor: string | null = null;
  fechaEdicion: string | number[] | null = null;
  urlRedireccion: string | null = null;
  urlSvg: string | null = null;
  urlPng: string | null = null;
  estilo: QrEstilo | null = null;

  constructor(partial?: Partial<QrResponse>) {
    Object.assign(this, partial);
  }
}

export function parseQrFecha(value: string | number[] | null): Date | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(.*)?$/,
    );
    if (match) {
      const [, year, month, day, hour, minute, second, fraction, suffix] = match;
      const ms = fraction ? Number((fraction + '000').slice(0, 3)) : 0;
      const tz = (suffix ?? '').trim();
      if (tz === 'Z' || tz === 'z' || /^[+-]\d{2}:?\d{2}$/.test(tz)) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        ms,
      );
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (Array.isArray(value) && value.length >= 2) {
    const [year, month, day = 1, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const ms = Number(nano) > 1000 ? Math.floor(Number(nano) / 1e6) : Number(nano) || 0;
    return new Date(year, month - 1, day, hour, minute, second, ms);
  }

  return null;
}
