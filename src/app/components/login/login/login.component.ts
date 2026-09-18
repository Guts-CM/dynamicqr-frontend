import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../auth/login-request';
import { MotionButtonDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { qs, qsa } from '../../../motion/motion';
import { animateInput, animateSection } from '../../../motion/ui-motion';
import { QrStageComponent } from '../../qr/qr-stage/qr-stage.component';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, QrStageComponent, MotionButtonDirective, MotionInputDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  host: {
    class: 'block min-h-dvh',
  },
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly passwordVisible = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly authError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  constructor() {
    afterNextRender(() => this.playEntrance());
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.authError.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      this.shakeInvalid();
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();
    this.submitting.set(true);

    this.authService
      .login(new LoginRequest({ email, password }), rememberMe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/dashboard');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.authError.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
          this.shakeAuth();
        },
      });
  }

  private playEntrance(): void {
    const root = this.host.nativeElement as HTMLElement;
    const visual = qs<HTMLElement>(root, '.login-visual');
    const ornaments = qsa<HTMLElement>(root, '.glass-ornament');
    const card = qs<HTMLElement>(root, '.login-card');
    const header = qs<HTMLElement>(root, '.login-header');
    const fields = qsa<HTMLElement>(root, '.field');
    const rest = qsa<HTMLElement>(
      root,
      '.login-options, .btn-primary, .login-divider, .social-row, .login-footer',
    );

    animateSection([
      ...(visual ? [{ targets: visual, y: 14, duration: 640, at: 0 }] : []),
      ...(ornaments.length ? [{ targets: ornaments, y: 0, scale: 0.96, duration: 620, stagger: 40, at: 40 }] : []),
      ...(card ? [{ targets: card, y: 16, duration: 700, at: 0 }] : []),
      ...(header ? [{ targets: header, y: 10, duration: 480, at: 160 }] : []),
      ...(fields.length ? [{ targets: fields, y: 10, duration: 460, stagger: 50, at: 210 }] : []),
      ...(rest.length ? [{ targets: rest, y: 8, duration: 420, stagger: 40, at: 320 }] : []),
    ]);
  }

  private shakeInvalid(): void {
    const fields = qsa<HTMLElement>(this.host.nativeElement as HTMLElement, '.field-control');
    if (this.form.controls.email.invalid && fields[0]) {
      animateInput(fields[0], 'invalid');
    }
    if (this.form.controls.password.invalid && fields[1]) {
      animateInput(fields[1], 'invalid');
    }
  }

  private shakeAuth(): void {
    const root = this.host.nativeElement as HTMLElement;
    const card = qs<HTMLElement>(root, '.login-card');
    const alert = qs<HTMLElement>(root, '.auth-error');
    if (card) {
      animateInput(card, 'invalid');
    }
    if (alert) {
      animateInput(alert, 'focus');
    }
  }
}
