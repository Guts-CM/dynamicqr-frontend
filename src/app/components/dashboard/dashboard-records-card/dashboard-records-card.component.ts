import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MotionButtonDirective, MotionCardDirective, MotionListDirective } from '../../../motion/motion.directives';
import { formatQrDay, qrTypeLabel } from '../../qr/qr-format';
import { QrResponse, parseQrFecha } from '../../qr/qr-response';
import { QrService } from '../../qr/qr.service';

export interface DashboardQrRecord {
  id: string;
  name: string;
  created: string;
  type: string;
  status: 'Activo' | 'Inactivo';
}

const LATEST_LIMIT = 6;

@Component({
  selector: 'app-dashboard-records-card',
  imports: [MotionButtonDirective, MotionCardDirective, MotionListDirective],
  templateUrl: './dashboard-records-card.component.html',
  styleUrl: './dashboard-records-card.component.css',
})
export class DashboardRecordsCardComponent {
  private readonly qrService = inject(QrService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly records = signal<DashboardQrRecord[]>([]);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.qrService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          this.records.set(this.toLatest(records));
          this.loading.set(false);
        },
        error: () => {
          this.records.set([]);
          this.error.set('No se pudieron cargar los registros QR');
          this.loading.set(false);
        },
      });
  }

  private toLatest(records: QrResponse[]): DashboardQrRecord[] {
    return [...records]
      .sort((left, right) => this.timeOf(right.fechaCreacion) - this.timeOf(left.fechaCreacion))
      .slice(0, LATEST_LIMIT)
      .map((record) => this.toRow(record));
  }

  private toRow(record: QrResponse): DashboardQrRecord {
    return {
      id: record.qrId != null ? `QR-${String(record.qrId).padStart(3, '0')}` : 'QR-000',
      name: record.nombre?.trim() || 'Sin nombre',
      created: formatQrDay(record.fechaCreacion),
      type: qrTypeLabel(record.tipo),
      status: record.activo ? 'Activo' : 'Inactivo',
    };
  }

  private timeOf(value: string | number[] | null): number {
    return parseQrFecha(value)?.getTime() ?? 0;
  }
}
