import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QrEstilo, QrResponse } from './qr-response';

export type QrCreatePayload = {
  nombre: string;
  tipo: string;
  destinoUrl?: string | null;
  contenido?: string | null;
  estilo?: QrEstilo;
};

export type QrUpdatePayload = {
  nombre?: string;
  tipo?: string;
  destinoUrl?: string | null;
  contenido?: string | null;
  nota?: string;
  estilo?: QrEstilo;
};

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/qr`;

  findAll(): Observable<QrResponse[]> {
    return this.http
      .get<QrResponse[]>(this.base)
      .pipe(map((records) => records.map((record) => new QrResponse(record))));
  }

  findById(id: number): Observable<QrResponse> {
    return this.http.get<QrResponse>(`${this.base}/${id}`).pipe(map((record) => new QrResponse(record)));
  }

  create(payload: QrCreatePayload): Observable<void> {
    return this.http.post(`${this.base}`, payload).pipe(map(() => undefined));
  }

  update(id: number, payload: QrUpdatePayload): Observable<void> {
    return this.http.put(`${this.base}/${id}`, payload, { responseType: 'text' }).pipe(map(() => undefined));
  }

  toggleActivo(id: number): Observable<void> {
    return this.http.delete(`${this.base}/${id}`, { responseType: 'text' }).pipe(map(() => undefined));
  }

  loadSvg(url: string): Observable<string> {
    return this.download(url).pipe(map((blob) => URL.createObjectURL(blob)));
  }

  download(url: string): Observable<Blob> {
    return this.http.get(this.resolveUrl(url), { responseType: 'blob' }).pipe(
      map((blob) => {
        if (!blob.size) {
          throw new Error('empty-file');
        }

        return blob;
      }),
    );
  }

  private resolveUrl(url: string): string {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${environment.apiBaseUrl}${path}`;
  }
}
