import { Component, input, output } from '@angular/core';
import {
  QR_EYE_SHAPE_OPTIONS,
  QR_MODULE_SHAPE_OPTIONS,
} from '../../qr/qr-format';
import {
  QR_BACKGROUND_COLOR_SWATCHES,
  QR_GRADIENT_COLOR_SWATCHES,
  QR_MODULE_COLOR_SWATCHES,
  QR_STYLE_PALETTES,
  paletteMatches,
  sameHex,
  type QrStylePalette,
} from '../../qr/qr-style';

export type QrStylePickerValue = {
  colorModulos: string;
  colorFondo: string;
  colorGradiente: string;
  formaModulo: string;
  formaOjo: string;
  transparent: boolean;
};

@Component({
  selector: 'app-qr-style-picker',
  templateUrl: './qr-style-picker.component.html',
  styleUrl: './qr-style-picker.component.css',
})
export class QrStylePickerComponent {
  readonly value = input.required<QrStylePickerValue>();
  readonly disabled = input(false);
  readonly valueChange = output<QrStylePickerValue>();

  protected readonly palettes = QR_STYLE_PALETTES;
  protected readonly moduleShapeOptions = QR_MODULE_SHAPE_OPTIONS;
  protected readonly eyeShapeOptions = QR_EYE_SHAPE_OPTIONS;
  protected readonly moduleSwatches = QR_MODULE_COLOR_SWATCHES;
  protected readonly backgroundSwatches = QR_BACKGROUND_COLOR_SWATCHES;
  protected readonly gradientSwatches = QR_GRADIENT_COLOR_SWATCHES;

  protected isPaletteOn(palette: QrStylePalette): boolean {
    return paletteMatches(palette, this.value());
  }

  protected isColorOn(current: string, swatch: string): boolean {
    return sameHex(current, swatch);
  }

  protected isCustomColor(current: string, swatches: readonly string[]): boolean {
    return !swatches.some((swatch) => this.isColorOn(current, swatch));
  }

  protected applyPalette(palette: QrStylePalette): void {
    if (this.disabled()) {
      return;
    }

    this.emit({
      ...this.value(),
      colorModulos: palette.colorModulos,
      colorFondo: palette.colorFondo,
      colorGradiente: palette.colorGradiente,
      transparent: false,
    });
  }

  protected setColor(key: 'colorModulos' | 'colorFondo' | 'colorGradiente', color: string): void {
    if (this.disabled()) {
      return;
    }

    this.emit({
      ...this.value(),
      [key]: color,
      transparent: key === 'colorFondo' ? false : this.value().transparent,
    });
  }

  protected onCustomColor(key: 'colorModulos' | 'colorFondo' | 'colorGradiente', event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setColor(key, input.value);
  }

  protected setShape(key: 'formaModulo' | 'formaOjo', shape: string): void {
    if (this.disabled()) {
      return;
    }

    this.emit({ ...this.value(), [key]: shape });
  }

  protected toggleTransparent(): void {
    if (this.disabled()) {
      return;
    }

    this.emit({ ...this.value(), transparent: !this.value().transparent });
  }

  private emit(next: QrStylePickerValue): void {
    this.valueChange.emit(next);
  }
}
