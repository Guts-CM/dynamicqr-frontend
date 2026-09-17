import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QrResponse } from '../qr/qr-response';

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<QrResponse[]> {
    return this.http
      .get<QrResponse[]>(`${environment.apiBaseUrl}/api/qr`)
      .pipe(map((records) => records.map((record) => new QrResponse(record))));
  }
}
