export class UsuarioResponse {
  usuariosId: number | null = null;
  email = '';
  nombre = '';
  apellidoPaterno = '';
  apellidoMaterno: string | null = null;
  usuarioCreador: number | null = null;
  fechaCreacion: string | number[] | null = null;
  usuarioEditor: number | null = null;
  fechaEdicion: string | number[] | null = null;
  activo: boolean | null = null;

  constructor(partial?: Partial<UsuarioResponse>) {
    Object.assign(this, partial);
  }
}
