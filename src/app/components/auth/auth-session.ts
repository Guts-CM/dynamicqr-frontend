export class AuthSession {
  token = '';
  duracion = 0;
  usuarioId: number | null = null;
  email = '';
  issuedAt = 0;
  expiresAt = 0;

  constructor(partial?: Partial<AuthSession>) {
    Object.assign(this, partial);
  }

  isExpired(now = Date.now()): boolean {
    return !this.token || this.expiresAt <= now;
  }

  remainingMs(now = Date.now()): number {
    return Math.max(0, this.expiresAt - now);
  }

  totalMs(): number {
    if (this.issuedAt > 0 && this.expiresAt > this.issuedAt) {
      return this.expiresAt - this.issuedAt;
    }

    return Math.max(this.duracion, 0) * 60_000;
  }
}
