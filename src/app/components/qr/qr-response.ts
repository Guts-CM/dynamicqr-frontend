export class QrResponse {
  qrId: number | null = null;
  nombre = '';
  tipo = '';
  destinoUrl = '';
  contenido = '';
  activo = false;
  totalEscaneos = 0;
  usuarioCreador: number | null = null;
  fechaCreacion: string | number[] | null = null;
  usuarioEditor: number | null = null;
  fechaEdicion: string | number[] | null = null;
  urlRedireccion = '';
  urlSvg = '';

  constructor(partial?: Partial<QrResponse>) {
    Object.assign(this, partial);
  }
}

export function parseQrFecha(value: string | number[] | null): Date | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (Array.isArray(value) && value.length >= 2) {
    const [year, month, day = 1, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, month - 1, day, hour, minute, second);
  }

  return null;
}
