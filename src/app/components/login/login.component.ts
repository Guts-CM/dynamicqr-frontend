import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QrStageComponent } from '../qr-stage/qr-stage.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, QrStageComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  host: {
    class: 'block min-h-dvh',
  },
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly passwordVisible = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }
  }
}
