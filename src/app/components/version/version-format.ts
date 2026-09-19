import { formatQrCodeId, formatQrDay, formatUserName } from '../qr/qr-format';
import { parseQrFecha } from '../qr/qr-response';
import { formatUsuarioReferencia } from '../usuario/usuario-format';
import { UsuarioResponse } from '../usuario/usuario-response';
import { VersionResponse } from './version-response';

export function formatVersionId(id: number | null | undefined): string {
  return id != null ? `Versión #${id}` : 'Versión #—';
}

export function formatVersionNombre(record: VersionResponse | null | undefined): string {
  const next = record?.nombreNuevo?.trim();
  if (next) {
    return next;
  }

  const previous = record?.nombreAnterior?.trim();
  if (previous) {
    return previous;
  }

  return formatQrCodeId(record?.qrId);
}

export function formatVersionDestino(value: string | null | undefined): string {
  return value?.trim() || '—';
}

export function textChanged(previous: string | null | undefined, next: string | null | undefined): boolean {
  return (previous ?? '').trim() !== (next ?? '').trim();
}

export function versionHasNombreChange(record: VersionResponse): boolean {
  return textChanged(record.nombreAnterior, record.nombreNuevo);
}

export function versionHasDestinoChange(record: VersionResponse): boolean {
  return textChanged(record.destinoAnterior, record.destinoNuevo);
}

export function versionHasChanges(record: VersionResponse): boolean {
  return versionHasNombreChange(record) || versionHasDestinoChange(record);
}

export function versionEditorLabel(users: UsuarioResponse[], id: number | null | undefined): string {
  return formatUsuarioReferencia(users, id) || formatUserName(null, id);
}

export function versionIsLatest(record: VersionResponse, records: VersionResponse[]): boolean {
  if (record.versionesId == null || record.qrId == null) {
    return false;
  }

  const latest = records
    .filter((item) => item.qrId === record.qrId)
    .reduce<VersionResponse | null>((current, item) => {
      if (!current) {
        return item;
      }

      return compareVersionRecency(item, current) < 0 ? item : current;
    }, null);

  return latest?.versionesId === record.versionesId;
}

export function compareVersionRecency(left: VersionResponse, right: VersionResponse): number {
  const delta =
    (parseQrFecha(right.fechaCreacion)?.getTime() ?? 0) -
    (parseQrFecha(left.fechaCreacion)?.getTime() ?? 0);

  return delta || (right.versionesId ?? 0) - (left.versionesId ?? 0);
}

export function versionMatchesQuery(
  record: VersionResponse,
  query: string,
  users: UsuarioResponse[],
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    formatVersionId(record.versionesId),
    String(record.versionesId ?? ''),
    formatQrCodeId(record.qrId),
    String(record.qrId ?? ''),
    record.nombreAnterior,
    record.nombreNuevo,
    record.destinoAnterior,
    record.destinoNuevo,
    record.nota,
    versionEditorLabel(users, record.usuarioCreador),
    formatQrDay(record.fechaCreacion),
  ];

  return haystack.some((value) => value?.toLowerCase().includes(needle));
}
