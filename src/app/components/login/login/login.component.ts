import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../auth/login-request';
import { MotionButtonDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { qs, qsa } from '../../../motion/motion';
import { animateInput } from '../../../motion/ui-motion';
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
