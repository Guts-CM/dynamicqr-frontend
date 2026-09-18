import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioResponse } from '../usuario/usuario-response';

export type UsuarioCreatePayload = {
  email: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
};

export type UsuarioUpdatePayload = {
  email?: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string | null;
};

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/usuarios`;

  findAll(): Observable<UsuarioResponse[]> {
    return this.http
      .get<UsuarioResponse[]>(this.base)
      .pipe(map((records) => records.map((record) => new UsuarioResponse(record))));
  }

  findById(id: number): Observable<UsuarioResponse> {
    return this.http
      .get<UsuarioResponse>(`${this.base}/${id}`)
      .pipe(map((record) => new UsuarioResponse(record)));
  }

  create(payload: UsuarioCreatePayload): Observable<void> {
    return this.http.post(`${this.base}`, payload).pipe(map(() => undefined));
  }

  update(id: number, payload: UsuarioUpdatePayload): Observable<void> {
    return this.http.put(`${this.base}/${id}`, payload, { responseType: 'text' }).pipe(map(() => undefined));
  }

  toggleActivo(id: number): Observable<void> {
    return this.http.delete(`${this.base}/${id}`, { responseType: 'text' }).pipe(map(() => undefined));
  }
}
