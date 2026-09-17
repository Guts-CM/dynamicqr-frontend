import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QrResponse, parseQrFecha } from '../../qr/qr-response';
import { QrService } from '../../service/qr.service';

export interface MonthlyQrCount {
  key: string;
  label: string;
  value: number;
  current: boolean;
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-dashboard-chart-card',
  templateUrl: './dashboard-chart-card.component.html',
  styleUrl: './dashboard-chart-card.component.css',
})
export class DashboardChartCardComponent {
  private readonly qrService = inject(QrService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly months = signal<MonthlyQrCount[]>(this.emptyMonths());

  protected readonly maxValue = computed(() => {
    const peak = Math.max(0, ...this.months().map((month) => month.value));
    return peak;
  });
  protected readonly scaleMax = computed(() => Math.max(this.maxValue(), 1));
  protected readonly scaleMid = computed(() => {
    const max = this.scaleMax();
    return max <= 1 ? null : Math.round(max / 2);
  });
  protected readonly chartLabel = computed(() => {
    const months = this.months();
    if (!months.length) {
      return 'Registros QR por mes';
    }

    const summary = months.map((month) => `${month.label} ${month.value}`).join(', ');
    return `Códigos QR creados en los últimos meses: ${summary}`;
  });

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
          this.months.set(this.groupByMonth(records));
          this.loading.set(false);
        },
        error: () => {
          this.months.set(this.emptyMonths());
          this.error.set('No se pudieron cargar los registros QR');
          this.loading.set(false);
        },
      });
  }

  private emptyMonths(): MonthlyQrCount[] {
    return this.groupByMonth([]);
  }

  private groupByMonth(records: QrResponse[]): MonthlyQrCount[] {
    const now = new Date();
    const buckets = new Map<string, MonthlyQrCount>();
    const ordered: MonthlyQrCount[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket: MonthlyQrCount = {
        key,
        label: MONTH_LABELS[date.getMonth()] ?? '',
        value: 0,
        current: offset === 0,
      };
      buckets.set(key, bucket);
      ordered.push(bucket);
    }

    for (const record of records) {
      const created = parseQrFecha(record.fechaCreacion);
      if (!created) {
        continue;
      }

      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.value += 1;
      }
    }

    return ordered;
  }
}
