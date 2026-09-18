import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MotionButtonDirective, MotionCardDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { QR_TYPE_OPTIONS, qrShapeLabel, qrTypeLabel } from '../../qr/qr-format';
import {
  diamondPoints,
  eyePupilRadius,
  eyeRingPath,
  isCircleEye,
  isCircleModule,
  isDiamondModule,
  modulePreviewRadius,
} from '../../qr/qr-style';
import { QR_FINDER_ORIGINS, QR_SIZE, createQrModules } from '../../qr-stage/qr-pattern';
import { QrCreatePayload } from '../../service/qr.service';
import { QrStylePickerComponent, type QrStylePickerValue } from '../qr-style-picker/qr-style-picker.component';

@Component({
  selector: 'app-dashboard-qr-create',
  imports: [ReactiveFormsModule, MotionButtonDirective, MotionCardDirective, MotionInputDirective, QrStylePickerComponent],
  templateUrl: './dashboard-qr-create.component.html',
  styleUrl: './dashboard-qr-create.component.css',
})
export class DashboardQrCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly success = input(false);
  readonly cancel = output<void>();
  readonly save = output<QrCreatePayload>();

  protected readonly submitted = signal(false);
  protected readonly tipo = signal('url');
  protected readonly formStamp = signal(0);
  protected readonly transparentBg = signal(false);
  protected readonly typeOptions = QR_TYPE_OPTIONS;
  protected readonly modules = createQrModules().filter((module) => module.kind !== 'finder');
  protected readonly previewSize = QR_SIZE;
  protected readonly gradientId = `qr-create-grad-${Math.random().toString(36).slice(2, 8)}`;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: ['url', Validators.required],
    destinoUrl: [''],
    contenido: [''],
    colorModulos: ['#111827'],
    colorFondo: ['#FFFFFF'],
    colorGradiente: ['#6366F1'],
    formaModulo: ['redondeado'],
    formaOjo: ['redondeado'],
  });

  protected readonly preview = computed(() => {
    this.formStamp();
    const value = this.form.getRawValue();
    const formaModulo = value.formaModulo;
    const formaOjo = value.formaOjo;
    return {
      colorModulos: this.cssColor(value.colorModulos, '#111827'),
      colorFondo: this.cssColor(value.colorFondo, '#FFFFFF'),
      transparent: this.transparentBg(),
      colorGradiente: this.cssColor(value.colorGradiente, value.colorModulos || '#6366F1'),
      formaModulo,
      formaOjo,
      moduleRadius: modulePreviewRadius(formaModulo),
      circleModules: isCircleModule(formaModulo),
      diamondModules: isDiamondModule(formaModulo),
      circleEyes: isCircleEye(formaOjo),
      finders: QR_FINDER_ORIGINS.map(([x, y]) => ({
        id: `${x}-${y}`,
        x,
        y,
        ring: eyeRingPath(x, y, formaOjo),
        pupilRx: eyePupilRadius(formaOjo),
      })),
      typeLabel: qrTypeLabel(value.tipo),
      moduleLabel: qrShapeLabel(formaModulo),
      eyeLabel: qrShapeLabel(formaOjo),
      nombre: value.nombre.trim() || 'Sin nombre',
    };
  });

  protected readonly styleValue = computed((): QrStylePickerValue => {
    this.formStamp();
    const value = this.form.getRawValue();
    return {
      colorModulos: value.colorModulos,
      colorFondo: value.colorFondo,
      colorGradiente: value.colorGradiente,
      formaModulo: value.formaModulo,
      formaOjo: value.formaOjo,
      transparent: this.transparentBg(),
    };
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formStamp.update((stamp) => stamp + 1);
      this.tipo.set(this.form.controls.tipo.value);
    });
  }

  protected onStyleChange(next: QrStylePickerValue): void {
    this.form.patchValue({
      colorModulos: next.colorModulos,
      colorFondo: next.colorFondo,
      colorGradiente: next.colorGradiente,
      formaModulo: next.formaModulo,
      formaOjo: next.formaOjo,
    });
    this.transparentBg.set(next.transparent);
  }

  protected modulePoints(x: number, y: number): string {
    return diamondPoints(x + 0.1, y + 0.1);
  }

  protected invalid(name: 'nombre' | 'destinoUrl' | 'contenido'): boolean {
    const control = this.form.controls[name];
    return this.submitted() && control.invalid;
  }

  protected onSubmit(): void {
    if (this.busy() || this.success()) {
      return;
    }

    this.submitted.set(true);
    this.form.markAllAsTouched();

    const value = this.form.getRawValue();
    const isUrl = value.tipo === 'url';
    if (!value.nombre.trim()) {
      return;
    }

    if (isUrl && !/^https?:\/\/.+/i.test(value.destinoUrl.trim())) {
      this.form.controls.destinoUrl.setErrors({ url: true });
      return;
    }

    if (!isUrl && !value.contenido.trim()) {
      this.form.controls.contenido.setErrors({ required: true });
      return;
    }

    this.save.emit({
      nombre: value.nombre.trim(),
      tipo: value.tipo,
      destinoUrl: isUrl ? value.destinoUrl.trim() : null,
      contenido: isUrl ? null : value.contenido.trim(),
      estilo: {
        colorModulos: value.colorModulos.trim() || null,
        colorFondo: this.transparentBg() ? 'transparent' : value.colorFondo.trim() || '#FFFFFF',
        colorGradiente: value.colorGradiente.trim() || null,
        formaModulo: value.formaModulo,
        formaOjo: value.formaOjo,
      },
    });
  }

  protected onCancel(): void {
    if (this.busy() || this.success()) {
      return;
    }

    this.cancel.emit();
  }

  private cssColor(value: string, fallback: string): string {
    const hex = value.trim();
    return /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex) ? hex : fallback;
  }
}
