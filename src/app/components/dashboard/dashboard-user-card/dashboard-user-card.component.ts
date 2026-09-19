import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { MotionButtonDirective, MotionCardDirective } from '../../../motion/motion.directives';
import { AuthService } from '../../service/auth.service';
import { UsuarioService } from '../../service/usuario.service';
import { formatUsuarioIniciales, formatUsuarioNombre } from '../../usuario/usuario-format';
import { UsuarioResponse } from '../../usuario/usuario-response';

@Component({
  selector: 'app-dashboard-user-card',
  imports: [MotionButtonDirective, MotionCardDirective],
  templateUrl: './dashboard-user-card.component.html',
  styleUrl: './dashboard-user-card.component.css',
})
export class DashboardUserCardComponent {
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = signal(Date.now());
  private readonly usuario = signal<UsuarioResponse | null>(null);
  private expiredNotified = false;

  protected readonly logout = output<void>();

  protected readonly profile = computed(() => {
    const session = this.authService.session();
    const record = this.usuario();
    const email = record?.email?.trim() || session?.email?.trim() || 'Sin correo';
    const name = record ? formatUsuarioNombre(record) : 'Usuario';
    const displayName = !record || name === email ? 'Usuario' : name;

    return {
      name: displayName,
      email,
      initials: record ? formatUsuarioIniciales(record) : this.toInitials(displayName),
      userId: session?.usuarioId != null ? `USR-${String(session.usuarioId).padStart(3, '0')}` : 'USR-000',
      role: 'Administrador',
    };
  });

  protected readonly remainingMs = computed(() => this.authService.session()?.remainingMs(this.now()) ?? 0);
  protected readonly sessionActive = computed(() => this.remainingMs() > 0);
  protected readonly remainingLabel = computed(() => this.formatRemaining(this.remainingMs()));
  protected readonly remainingPercent = computed(() => {
    const total = this.authService.session()?.totalMs() ?? 0;
    if (!total) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.remainingMs() / total) * 100));
  });
  protected readonly expiresLabel = computed(() => {
    const expiresAt = this.authService.session()?.expiresAt;
    if (!expiresAt) {
      return 'Sin vencimiento';
    }

    const time = new Date(expiresAt).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `Expira ${time}`;
  });

  constructor() {
    const usuarioId = this.authService.session()?.usuarioId;
    if (usuarioId != null) {
      this.usuarioService
        .findById(usuarioId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (record) => this.usuario.set(record),
          error: () => this.usuario.set(null),
        });
    }

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(Date.now());

        if (!this.expiredNotified && this.authService.session() && this.remainingMs() <= 0) {
          this.expiredNotified = true;
          this.logout.emit();
        }
      });
  }

  private toInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase() || 'QR';
  }

  private formatRemaining(ms: number): string {
    if (ms <= 0) {
      return '0 s restantes';
    }

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} h ${minutes.toString().padStart(2, '0')} min ${seconds.toString().padStart(2, '0')} s`;
    }

    if (minutes > 0) {
      return `${minutes} min ${seconds.toString().padStart(2, '0')} s restantes`;
    }

    return `${seconds} s restantes`;
  }
}
