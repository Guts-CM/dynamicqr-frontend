export class VersionResponse {
  versionesId: number | null = null;
  qrId: number | null = null;
  destinoAnterior: string | null = null;
  destinoNuevo: string | null = null;
  nombreAnterior: string | null = null;
  nombreNuevo: string | null = null;
  nota: string | null = null;
  usuarioCreador: number | null = null;
  fechaCreacion: string | number[] | null = null;

  constructor(partial?: Partial<VersionResponse>) {
    Object.assign(this, partial);
  }
}
