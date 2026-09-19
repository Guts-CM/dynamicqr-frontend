import { formatUserName } from '../qr/qr-format';
import { UsuarioResponse } from './usuario-response';

export function formatUsuarioId(id: number | null | undefined): string {
  return id != null ? `USR #${id}` : 'USR #—';
}

export function formatUsuarioNombre(record: UsuarioResponse | null | undefined): string {
  if (!record) {
    return 'Sin nombre';
  }

  const parts = [record.nombre, record.apellidoPaterno, record.apellidoMaterno]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.join(' ') || record.email?.trim() || 'Sin nombre';
}

export function formatUsuarioIniciales(record: UsuarioResponse | null | undefined): string {
  const nombre = record?.nombre?.trim().charAt(0) ?? '';
  const apellido =
    record?.apellidoPaterno?.trim().charAt(0) || record?.apellidoMaterno?.trim().charAt(0) || '';
  const initials = `${nombre}${apellido}`.toUpperCase();
  return initials || record?.email?.trim().charAt(0).toUpperCase() || '?';
}

export function formatUsuarioReferencia(
  records: UsuarioResponse[],
  id: number | null | undefined,
): string {
  if (id == null) {
    return '—';
  }

  const match = records.find((record) => record.usuariosId === id);
  return formatUserName(match ? formatUsuarioNombre(match) : null, id);
}

export function usuarioMatchesQuery(record: UsuarioResponse, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    formatUsuarioId(record.usuariosId),
    String(record.usuariosId ?? ''),
    record.email,
    record.nombre,
    record.apellidoPaterno,
    record.apellidoMaterno,
    formatUsuarioNombre(record),
  ];

  return haystack.some((value) => value?.toLowerCase().includes(needle));
}
