import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MotionButtonDirective, MotionCardDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { UsuarioCreatePayload } from '../../service/usuario.service';
import { formatUsuarioIniciales, formatUsuarioNombre } from '../usuario-format';
import { UsuarioResponse } from '../usuario-response';

@Component({
  selector: 'app-usuario-create',
  imports: [ReactiveFormsModule, MotionButtonDirective, MotionCardDirective, MotionInputDirective],
  templateUrl: './usuario-create.component.html',
  styleUrl: './usuario-create.component.css',
})
export class UsuarioCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly success = input(false);
  readonly cancel = output<void>();
  readonly save = output<UsuarioCreatePayload>();

  protected readonly submitted = signal(false);
  protected readonly formStamp = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', Validators.required],
    apellidoPaterno: [''],
    apellidoMaterno: [''],
  });

  protected readonly preview = computed(() => {
    this.formStamp();
    const value = this.form.getRawValue();
    const draft = new UsuarioResponse({
      email: value.email.trim(),
      nombre: value.nombre.trim(),
      apellidoPaterno: value.apellidoPaterno.trim(),
      apellidoMaterno: value.apellidoMaterno.trim() || null,
    });

    return {
      nombre: formatUsuarioNombre(draft),
      email: draft.email || 'correo@pendiente',
      iniciales: formatUsuarioIniciales(draft),
    };
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formStamp.update((stamp) => stamp + 1);
    });
  }

  protected invalid(name: 'email' | 'nombre'): boolean {
    const control = this.form.controls[name];
    return this.submitted() && control.invalid;
  }

  protected onSubmit(): void {
    if (this.busy() || this.success()) {
      return;
    }

    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      email: value.email.trim(),
      nombre: value.nombre.trim(),
      apellidoPaterno: value.apellidoPaterno.trim() || null,
      apellidoMaterno: value.apellidoMaterno.trim() || null,
    });
  }

  protected onCancel(): void {
    if (this.busy() || this.success()) {
      return;
    }

    this.cancel.emit();
  }
}
