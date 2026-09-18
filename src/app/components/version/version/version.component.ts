import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { MotionButtonDirective, MotionCardDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { MotionService, killMotion, qs, qsa, type MotionTeardown } from '../../../motion/motion';
import { MOTION } from '../../../motion/motion-tokens';
import {
  animateList,
  animateNavGlow,
  animateNavIndicator,
  animateSection,
  pulseElement,
} from '../../../motion/ui-motion';
import { formatQrCodeId, formatQrDay, formatQrTimestamp } from '../../qr/qr-format';
import { AuthService } from '../../service/auth.service';
import { UsuarioService } from '../../service/usuario.service';
import { UsuarioResponse } from '../../usuario/usuario-response';
import {
  compareVersionRecency,
  formatVersionDestino,
  formatVersionId,
  formatVersionNombre,
  versionEditorLabel,
  versionHasChanges,
  versionHasDestinoChange,
  versionHasNombreChange,
  versionIsLatest,
  versionMatchesQuery,
} from '../version-format';
import { VersionResponse } from '../version-response';
import { VersionService } from '../version.service';

@Component({
  selector: 'app-version',
  imports: [NgTemplateOutlet, MotionButtonDirective, MotionCardDirective, MotionInputDirective],
  templateUrl: './version.component.html',
  styleUrl: './version.component.css',
  host: {
    class: 'block min-h-dvh',
  },
})
export class VersionComponent {
  private readonly versionService = inject(VersionService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly desktopNav = viewChild<ElementRef<HTMLElement>>('desktopNav');
  private readonly dockNav = viewChild<ElementRef<HTMLElement>>('dockNav');

  private observers: ResizeObserver[] = [];
  private glowStops: MotionTeardown[] = [];
  private navReady = false;
  private navFrame = 0;
  private navMove = 0;
  private navMovedAt = 0;
  private loadRequest = 0;
  private detailRequest = 0;
  private copiedTimer = 0;

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly records = signal<VersionResponse[]>([]);
  protected readonly users = signal<UsuarioResponse[]>([]);
  protected readonly query = signal('');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly detail = signal<VersionResponse | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal(false);
  protected readonly mobileDetail = signal(false);
  protected readonly copied = signal(false);

  protected readonly selected = computed(() => {
    const id = this.selectedId();
    const detail = this.detail();
    if (detail?.versionesId === id) {
      return detail;
    }

    return this.records().find((record) => record.versionesId === id) ?? null;
  });

  protected readonly visibleRecords = computed(() => {
    const query = this.query();
    const users = this.users();
    return this.records().filter((record) => versionMatchesQuery(record, query, users));
  });

  protected readonly countLabel = computed(() => {
    const visible = this.visibleRecords().length;
    const total = this.records().length;
    if (this.query().trim() && visible !== total) {
      return `${visible} de ${total}`;
    }

    return total === 1 ? '1 versión' : `${total} versiones`;
  });

  protected readonly navItems = [
    { id: 'panel', label: 'Panel' },
    { id: 'qr', label: 'QR' },
    { id: 'escaneos', label: 'Escaneos' },
    { id: 'versiones', label: 'Versiones' },
    { id: 'usuarios', label: 'Usuarios' },
  ] as const;

  protected readonly activeSection = signal<(typeof this.navItems)[number]['id']>('versiones');
  protected readonly settledSection = signal<(typeof this.navItems)[number]['id']>('versiones');
  protected readonly dateLabel = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  constructor() {
    afterNextRender(() => this.bootMotion());

    effect(() => {
      this.motion.reduced();
      untracked(() => {
        if (this.navReady) {
          this.setupNavGlow();
        }
      });
    });

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.navFrame);
      this.observers.forEach((observer) => observer.disconnect());
      this.stopNavGlow();
      window.clearTimeout(this.copiedTimer);
      killMotion(this.host.nativeElement);
    });
    this.load();
  }

  protected selectSection(id: (typeof this.navItems)[number]['id']): void {
    if (id === 'escaneos' || id === 'versiones') {
      return;
    }

    if (id === 'qr') {
      void this.router.navigateByUrl('/qr');
      return;
    }

    if (id === 'usuarios') {
      void this.router.navigateByUrl('/usuarios');
      return;
    }

    const url = id === 'panel' ? '/dashboard' : `/dashboard?section=${id}`;
    void this.router.navigateByUrl(url);
  }

  protected goDashboard(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  protected signOut(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mobileDetail()) {
      this.backToList();
    }
  }

  protected load(): void {
    const request = ++this.loadRequest;
    this.loading.set(true);
    this.error.set(false);
    this.selectedId.set(null);
    this.detail.set(null);
    this.detailLoading.set(false);
    this.detailError.set(false);
    this.mobileDetail.set(false);
    this.copied.set(false);
    this.query.set('');

    forkJoin({
      versions: this.versionService.findAll(),
      users: this.usuarioService.findAll().pipe(catchError(() => of([] as UsuarioResponse[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ versions, users }) => {
          if (request !== this.loadRequest) {
            return;
          }

          this.users.set(users);
          this.records.set(this.sortRecords(versions));
          this.loading.set(false);
          this.queueListMotion();
        },
        error: () => {
          if (request !== this.loadRequest) {
            return;
          }

          this.records.set([]);
          this.users.set([]);
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  protected onQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query.set(input?.value ?? '');
  }

  protected selectVersion(record: VersionResponse): void {
    if (record.versionesId == null) {
      return;
    }

    this.selectedId.set(record.versionesId);
    this.mobileDetail.set(true);
    this.copied.set(false);
    this.loadDetail(record.versionesId);
  }

  protected retryDetail(): void {
    const id = this.selectedId();
    if (id == null) {
      return;
    }

    this.loadDetail(id);
  }

  protected backToList(): void {
    this.mobileDetail.set(false);
  }

  protected codeId(record: VersionResponse): string {
    return formatVersionId(record.versionesId);
  }

  protected displayName(record: VersionResponse): string {
    return formatVersionNombre(record);
  }

  protected qrLabel(record: VersionResponse): string {
    return formatQrCodeId(record.qrId);
  }

  protected createdLabel(record: VersionResponse): string {
    return formatQrDay(record.fechaCreacion);
  }

  protected createdAt(record: VersionResponse): string {
    return formatQrTimestamp(record.fechaCreacion);
  }

  protected editorLabel(record: VersionResponse): string {
    return versionEditorLabel(this.users(), record.usuarioCreador);
  }

  protected isLatest(record: VersionResponse): boolean {
    return versionIsLatest(record, this.records());
  }

  protected hasNombreChange(record: VersionResponse): boolean {
    return versionHasNombreChange(record);
  }

  protected hasDestinoChange(record: VersionResponse): boolean {
    return versionHasDestinoChange(record);
  }

  protected hasChanges(record: VersionResponse): boolean {
    return versionHasChanges(record);
  }

  protected destino(value: string | null | undefined): string {
    return formatVersionDestino(value);
  }

  protected copyDestino(value: string | null | undefined, trigger: EventTarget | null): void {
    const destino = value?.trim();
    if (!destino || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(destino).then(() => {
      this.copied.set(true);
      pulseElement(trigger instanceof Element ? trigger : null);
      window.clearTimeout(this.copiedTimer);
      this.copiedTimer = window.setTimeout(() => this.copied.set(false), 1600);
    });
  }

  private loadDetail(id: number): void {
    const request = ++this.detailRequest;
    this.detailLoading.set(true);
    this.detailError.set(false);

    this.versionService
      .findById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          if (request !== this.detailRequest || this.selectedId() !== id) {
            return;
          }

          this.detail.set(record);
          this.records.update((records) =>
            this.sortRecords(
              records.map((item) => (item.versionesId === record.versionesId ? record : item)),
            ),
          );
          this.detailLoading.set(false);
          this.queueDetailMotion();
        },
        error: () => {
          if (request !== this.detailRequest || this.selectedId() !== id) {
            return;
          }

          this.detailError.set(true);
          this.detailLoading.set(false);
        },
      });
  }

  private sortRecords(records: VersionResponse[]): VersionResponse[] {
    return [...records].sort(compareVersionRecency);
  }

  private queueListMotion(): void {
    requestAnimationFrame(() => {
      const items = qsa<HTMLElement>(this.host.nativeElement, '.qr-item');
      animateList(items, { y: 8, stagger: 42, duration: 360 });
    });
  }

  private queueDetailMotion(): void {
    requestAnimationFrame(() => {
      const detail = qs<HTMLElement>(this.host.nativeElement, '.qr-detail-live');
      if (!detail) {
        return;
      }

      animateSection([
        { targets: qsa(detail, '[data-qr-motion]'), y: 10, duration: 420, stagger: 54, at: 0 },
      ]);
    });
  }

  private bootMotion(): void {
    this.setupNav();
    this.navReady = true;
    this.syncIndicators(true);
    this.setupNavGlow();
  }

  private setupNav(): void {
    const navs = this.navElements();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.observers = navs.map((nav) => {
      const observer = new ResizeObserver(() => {
        if (performance.now() - this.navMovedAt < MOTION.duration.nav + 80) {
          return;
        }

        this.syncIndicators(true, this.navMove);
      });
      observer.observe(nav);
      return observer;
    });
  }

  private syncIndicators(instant = false, move = this.navMove): void {
    const section = this.activeSection();

    for (const nav of this.navElements()) {
      if (!nav.offsetWidth) {
        continue;
      }

      const indicator = qs<HTMLElement>(nav, '.nav-indicator');
      const active = qs<HTMLElement>(nav, `.nav-link[data-section="${section}"]`);
      if (!indicator || !active) {
        continue;
      }

      animateNavIndicator(indicator, active, nav, instant, () => {
        if (this.navMove === move) {
          this.settledSection.set(section);
        }
      });
      nav.classList.add('has-indicator');
    }
  }

  private setupNavGlow(): void {
    this.stopNavGlow();
    this.glowStops = this.navElements()
      .map((nav) => qs<HTMLElement>(nav, '.nav-indicator'))
      .filter((indicator): indicator is HTMLElement => Boolean(indicator))
      .map((indicator) =>
        animateNavGlow(indicator, {
          enabled: () => this.motion.enabled(),
        }),
      );
  }

  private stopNavGlow(): void {
    this.glowStops.forEach((stop) => stop());
    this.glowStops = [];
  }

  private navElements(): HTMLElement[] {
    return [this.desktopNav()?.nativeElement, this.dockNav()?.nativeElement].filter(
      (node): node is HTMLElement => Boolean(node),
    );
  }
}
