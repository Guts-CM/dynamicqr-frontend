import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VersionResponse } from './version-response';

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/versiones`;

  findAll(qrId?: number | null): Observable<VersionResponse[]> {
    const options = qrId == null ? {} : { params: { qrId } };
    return this.http
      .get<VersionResponse[]>(this.base, options)
      .pipe(map((records) => records.map((record) => new VersionResponse(record))));
  }

  findById(id: number): Observable<VersionResponse> {
    return this.http
      .get<VersionResponse>(`${this.base}/${id}`)
      .pipe(map((record) => new VersionResponse(record)));
  }
}
