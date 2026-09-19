import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, NgZone, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginRequest } from '../../auth/login-request';
import { MotionButtonDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { qs, qsa } from '../../../motion/motion';
import { animateInput, animateWorkspaceIn, animateWorkspaceOut, revealTargets } from '../../../motion/ui-motion';
import { QrStageComponent } from '../../qr/qr-stage/qr-stage.component';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, QrStageComponent, MotionButtonDirective, MotionInputDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  host: {
    class: 'block',
    '[class.is-switching]': 'transitioning()',
  },
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private viewGen = 0;

  private pendingEmail = '';
  private pendingPassword = '';
  private pendingRemember = false;

  protected readonly mode = signal<'login' | 'cambio'>('login');
  protected readonly transitioning = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly nuevaVisible = signal(false);
  protected readonly confirmVisible = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly authError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  protected readonly cambioForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: LoginComponent.passwordsMatch },
  );

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected toggleNuevaVisibility(): void {
    this.nuevaVisible.update((visible) => !visible);
  }

  protected toggleConfirmVisibility(): void {
    this.confirmVisible.update((visible) => !visible);
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.authError.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting() || this.transitioning()) {
      this.shakeInvalid();
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();
    this.submitting.set(true);

    this.authService
      .login(new LoginRequest({ email, password }), rememberMe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.kind === 'cambio') {
            this.pendingEmail = email;
            this.pendingPassword = password;
            this.pendingRemember = rememberMe;
            this.submitting.set(false);
            this.submitted.set(false);
            this.cambioForm.reset();
            this.swapView('cambio');
            return;
          }

          void this.router.navigateByUrl('/dashboard');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.authError.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
          this.shakeAuth();
        },
      });
  }

  protected onCambioSubmit(): void {
    this.submitted.set(true);
    this.authError.set(null);
    this.cambioForm.markAllAsTouched();

    if (this.cambioForm.invalid || this.submitting() || this.transitioning()) {
      this.shakeCambioInvalid();
      return;
    }

    const { password } = this.cambioForm.getRawValue();
    this.submitting.set(true);

    this.authService
      .cambiarPassword(this.pendingEmail, this.pendingPassword, password, this.pendingRemember)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/dashboard');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.authError.set(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña');
          this.shakeAuth();
        },
      });
  }

  protected backToLogin(): void {
    if (this.submitting() || this.transitioning()) {
      return;
    }

    this.pendingEmail = '';
    this.pendingPassword = '';
    this.pendingRemember = false;
    this.authError.set(null);
    this.submitted.set(false);
    this.cambioForm.reset();
    this.swapView('login');
  }

  private swapView(next: 'login' | 'cambio'): void {
    if (this.mode() === next) {
      return;
    }

    const gen = ++this.viewGen;
    this.transitioning.set(true);
    const root = this.swapRoot();

    const enter = (): void => {
      this.zone.run(() => {
        if (gen !== this.viewGen) {
          return;
        }

        this.mode.set(next);
        this.cdr.detectChanges();
        this.playIncoming(gen);
      });
    };

    if (!root) {
      enter();
      return;
    }

    animateWorkspaceOut(root, enter);
  }

  private playIncoming(gen: number): void {
    const run = (): void => {
      this.zone.run(() => {
        if (gen !== this.viewGen) {
          return;
        }

        const incoming = this.swapRoot();
        const finish = (): void => {
          this.zone.run(() => {
            if (gen !== this.viewGen) {
              return;
            }

            this.revealSwap();
            this.transitioning.set(false);
          });
        };

        if (incoming) {
          animateWorkspaceIn(incoming, finish);
          return;
        }

        finish();
      });
    };

    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => requestAnimationFrame(run));
    });
  }

  private revealSwap(): void {
    const root = this.swapRoot() ?? this.host.nativeElement;
    revealTargets([
      root,
      ...qsa(
        root,
        '.login-header, .field, .login-options, .btn-primary, .btn-ghost, .login-divider, .social-row, .login-footer',
      ),
    ]);
  }

  private swapRoot(): HTMLElement | null {
    return qs<HTMLElement>(this.host.nativeElement, '.login-swap');
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

  private shakeCambioInvalid(): void {
    const fields = qsa<HTMLElement>(this.host.nativeElement as HTMLElement, '.field-control');
    if (this.cambioForm.controls.password.invalid && fields[0]) {
      animateInput(fields[0], 'invalid');
    }
    if (
      (this.cambioForm.controls.confirmacion.invalid || this.cambioForm.hasError('mismatch')) &&
      fields[1]
    ) {
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

  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmacion = group.get('confirmacion')?.value;
    if (!password || !confirmacion || password === confirmacion) {
      return null;
    }

    return { mismatch: true };
  }
}
