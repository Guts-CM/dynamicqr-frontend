import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../auth/auth-session';
import { LoginRequest } from '../auth/login-request';
import { TokenResponse } from '../auth/token-response';

const STORAGE_KEY = 'dynamicqr.auth.session';

export type LoginResult = { kind: 'session'; session: AuthSession } | { kind: 'cambio' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly session = this.sessionState.asReadonly();
  readonly token = computed(() => this.sessionState()?.token ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.sessionState();
    return !!session && !session.isExpired();
  });

  login(request: LoginRequest, rememberMe: boolean): Observable<LoginResult> {
    return this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/api/auth/login`, {
        email: request.email,
        password: request.password,
      })
      .pipe(
        map((response) => {
          if (response.requiereCambioPassword) {
            return { kind: 'cambio' as const };
          }

          const session = this.toSession(response, request.email);
          this.persist(session, rememberMe);
          return { kind: 'session' as const, session };
        }),
        catchError((error: HttpErrorResponse) => throwError(() => this.toAuthError(error))),
      );
  }

  cambiarPassword(
    email: string,
    passwordTemporal: string,
    passwordNueva: string,
    rememberMe: boolean,
  ): Observable<AuthSession> {
    return this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/api/auth/password`, {
        email,
        password: passwordTemporal,
        passwordNueva,
      })
      .pipe(
        map((response) => this.toSession(response, email)),
        tap((session) => this.persist(session, rememberMe)),
        catchError((error: HttpErrorResponse) => throwError(() => this.toAuthError(error))),
      );
  }

  logout(): void {
    this.clearSession();
  }

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    this.sessionState.set(null);
  }

  private toSession(response: TokenResponse, email: string): AuthSession {
    const claims = this.decodeJwtPayload(response.token);
    const issuedAt = claims.iat ? claims.iat * 1000 : Date.now();
    const expiresAt = claims.exp
      ? claims.exp * 1000
      : issuedAt + Math.max(Number(response.duracion) || 0, 0) * 60_000;
    const duracion =
      Number(response.duracion) ||
      Math.max(1, Math.round((expiresAt - issuedAt) / 60_000));

    return new AuthSession({
      token: response.token,
      duracion,
      usuarioId: response.usuarioId ?? claims.uid ?? null,
      email: email || claims.sub || '',
      issuedAt,
      expiresAt,
    });
  }

  private decodeJwtPayload(token: string): { exp?: number; iat?: number; sub?: string; uid?: number } {
    const segment = token.split('.')[1];
    if (!segment) {
      return {};
    }

    try {
      const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(padded);
      return JSON.parse(json) as { exp?: number; iat?: number; sub?: string; uid?: number };
    } catch {
      return {};
    }
  }

  private persist(session: AuthSession, rememberMe: boolean): void {
    const payload = JSON.stringify(session);
    this.clearSession();

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, payload);
    } else {
      sessionStorage.setItem(STORAGE_KEY, payload);
    }

    this.sessionState.set(session);
  }

  private readStoredSession(): AuthSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      const session = new AuthSession(parsed);
      if (session.token) {
        const claims = this.decodeJwtPayload(session.token);
        if (claims.exp) {
          session.expiresAt = claims.exp * 1000;
        }
        if (claims.iat) {
          session.issuedAt = claims.iat * 1000;
        }
      }
      if (session.isExpired()) {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  private toAuthError(error: HttpErrorResponse): Error {
    if (error.status === 403) {
      return new Error('Esta cuenta está desactivada');
    }

    if (error.status === 401) {
      return new Error('Credenciales inválidas');
    }

    if (error.status === 0) {
      return new Error('No se pudo conectar con el servidor');
    }

    const backendMessage =
      typeof error.error === 'object' && error.error && 'error' in error.error
        ? String((error.error as { error: string }).error)
        : '';

    return new Error(backendMessage || 'No se pudo iniciar sesión');
  }
}
