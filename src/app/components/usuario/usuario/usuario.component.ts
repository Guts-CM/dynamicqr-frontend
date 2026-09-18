import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { MotionButtonDirective, MotionCardDirective, MotionInputDirective } from '../../../motion/motion.directives';
import { MotionService, killMotion, qs, qsa, type MotionTeardown } from '../../../motion/motion';
import { MOTION } from '../../../motion/motion-tokens';
import {
  animateList,
  animateModal,
  animateNavGlow,
  animateNavIndicator,
  animateSection,
  animateWorkspaceIn,
  animateWorkspaceOut,
  pulseElement,
  revealTargets,
} from '../../../motion/ui-motion';
import { formatQrDay, formatQrTimestamp } from '../../qr/qr-format';
import { parseQrFecha } from '../../qr/qr-response';
import { AuthService } from '../../service/auth.service';
import { UsuarioCreatePayload, UsuarioService } from '../../service/usuario.service';
import { UsuarioCreateComponent } from '../usuario-create/usuario-create.component';
import {
  formatUsuarioId,
  formatUsuarioIniciales,
  formatUsuarioNombre,
  formatUsuarioReferencia,
  usuarioMatchesQuery,
} from '../usuario-format';
import { UsuarioResponse } from '../usuario-response';

type UsuarioDialog = 'edit' | 'delete' | null;

@Component({
  selector: 'app-usuario',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MotionButtonDirective,
    MotionCardDirective,
    MotionInputDirective,
    UsuarioCreateComponent,
  ],
  templateUrl: './usuario.component.html',
  styleUrl: './usuario.component.css',
  host: {
    class: 'block min-h-dvh',
    '[class.is-switching]': 'transitioning()',
  },
})
export class UsuarioComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly desktopNav = viewChild<ElementRef<HTMLElement>>('desktopNav');
  private readonly dockNav = viewChild<ElementRef<HTMLElement>>('dockNav');

  private observers: ResizeObserver[] = [];
  private glowStops: MotionTeardown[] = [];
  private navReady = false;
  private navFrame = 0;
  private navMove = 0;
  private navMovedAt = 0;

  private loadRequest = 0;
  private copiedTimer = 0;
  private dialogTimer = 0;
  private successTimer = 0;
  private viewGen = 0;
  private resumeId: number | null = null;

  readonly mode = signal<'manage' | 'create'>('manage');
  readonly transitioning = signal(false);
  protected readonly createBusy = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createSuccess = signal(false);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly records = signal<UsuarioResponse[]>([]);
  protected readonly query = signal('');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly mobileDetail = signal(false);
  protected readonly copied = signal(false);
  protected readonly dialog = signal<UsuarioDialog>(null);
  protected readonly actionBusy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', Validators.required],
    apellidoPaterno: ['', Validators.required],
    apellidoMaterno: [''],
  });

  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return this.records().find((record) => record.usuariosId === id) ?? null;
  });

  protected readonly visibleRecords = computed(() => {
    const query = this.query();
    return this.records().filter((record) => usuarioMatchesQuery(record, query));
  });

  protected readonly countLabel = computed(() => {
    const visible = this.visibleRecords().length;
    const total = this.records().length;
    if (this.query().trim() && visible !== total) {
      return `${visible} de ${total}`;
    }

    return total === 1 ? '1 usuario' : `${total} usuarios`;
  });

  protected readonly navItems = [
    { id: 'panel', label: 'Panel' },
    { id: 'qr', label: 'QR' },
    { id: 'escaneos', label: 'Escaneos' },
    { id: 'versiones', label: 'Versiones' },
    { id: 'usuarios', label: 'Usuarios' },
  ] as const;

  protected readonly activeSection = signal<(typeof this.navItems)[number]['id']>('usuarios');
  protected readonly settledSection = signal<(typeof this.navItems)[number]['id']>('usuarios');
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
      window.clearTimeout(this.dialogTimer);
      window.clearTimeout(this.successTimer);
      killMotion(this.host.nativeElement);
    });
    this.load();
  }

  protected creatingLocked(): boolean {
    return this.mode() === 'create' || this.transitioning();
  }

  protected startCreate(): void {
    this.openCreate();
  }

  protected selectSection(id: (typeof this.navItems)[number]['id']): void {
    if (id === 'usuarios') {
      return;
    }

    if (id === 'qr') {
      void this.router.navigateByUrl('/qr');
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
    if (this.createBusy()) {
      return;
    }

    if (this.dialog() && !this.actionBusy()) {
      this.closeDialog();
      return;
    }

    if (this.mode() === 'create' && !this.createSuccess()) {
      this.cancelCreate();
    }
  }

  openCreate(): void {
    if (this.transitioning() || this.mode() === 'create' || this.actionBusy()) {
      return;
    }

    this.dialog.set(null);
    this.createError.set(null);
    this.createSuccess.set(false);
    this.resumeId = this.selectedId();
    this.swapView('create');
  }

  protected cancelCreate(): void {
    if (this.createBusy() || this.createSuccess() || this.mode() !== 'create') {
      return;
    }

    this.swapView('manage', () => this.resumeManagement(this.resumeId));
  }

  protected submitCreate(payload: UsuarioCreatePayload): void {
    if (this.createBusy() || this.createSuccess() || this.transitioning()) {
      return;
    }

    if (this.hasDuplicateEmail(payload.email)) {
      this.createError.set('Ya existe un usuario con ese correo electrónico.');
      return;
    }

    this.createBusy.set(true);
    this.createError.set(null);

    this.usuarioService
      .create(payload)
      .pipe(
        switchMap(() => this.usuarioService.findAll()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (records) => {
          const sorted = this.sortRecords(records);
          this.records.set(sorted);
          this.createBusy.set(false);
          this.createSuccess.set(true);
          const created = this.pickCreated(sorted, payload.email);
          window.clearTimeout(this.successTimer);
          this.successTimer = window.setTimeout(
            () => this.returnToManagement(created?.usuariosId ?? null),
            MOTION.duration.section,
          );
        },
        error: () => {
          this.createBusy.set(false);
          this.createError.set('No se pudo crear el usuario. Revisa el correo e inténtalo de nuevo.');
        },
      });
  }

  private returnToManagement(selectedId: number | null): void {
    if (this.mode() !== 'create') {
      return;
    }

    this.swapView('manage', () => {
      this.createSuccess.set(false);
      this.createError.set(null);
      this.resumeManagement(selectedId);
    });
  }

  private resumeManagement(selectedId: number | null): void {
    if (selectedId == null) {
      this.selectedId.set(null);
      this.mobileDetail.set(false);
      return;
    }

    const record = this.records().find((item) => item.usuariosId === selectedId) ?? null;
    if (!record) {
      return;
    }

    this.selectedId.set(selectedId);
    this.mobileDetail.set(true);
  }

  private swapView(next: 'manage' | 'create', afterIn?: () => void): void {
    const gen = ++this.viewGen;
    this.transitioning.set(true);
    const root = this.workspaceRoot();

    const enter = (): void => {
      this.zone.run(() => {
        if (gen !== this.viewGen) {
          return;
        }

        this.mode.set(next);
        afterIn?.();
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

        const incoming = this.workspaceRoot();
        const finish = (): void => {
          this.zone.run(() => {
            if (gen !== this.viewGen) {
              return;
            }

            this.revealWorkspace();
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

  private revealWorkspace(): void {
    const host = this.host.nativeElement;
    const root = this.workspaceRoot() ?? host;
    revealTargets([host, root, ...qsa(root, '.card, .qr-item, [data-qr-motion]')]);
  }

  private workspaceRoot(): HTMLElement | null {
    return qs<HTMLElement>(
      this.host.nativeElement,
      this.mode() === 'create' ? 'app-usuario-create' : '.qr-workspace',
    );
  }

  private pickCreated(records: UsuarioResponse[], email: string): UsuarioResponse | null {
    const key = email.trim().toLowerCase();
    const matches = records.filter((record) => record.email?.trim().toLowerCase() === key);
    return (matches.length ? matches : records)[0] ?? null;
  }

  protected load(): void {
    const request = ++this.loadRequest;
    this.loading.set(true);
    this.error.set(false);
    this.selectedId.set(null);
    this.mobileDetail.set(false);
    this.copied.set(false);
    this.query.set('');

    this.usuarioService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          if (request !== this.loadRequest) {
            return;
          }

          this.records.set(this.sortRecords(records));
          this.loading.set(false);
          this.queueListMotion();
        },
        error: () => {
          if (request !== this.loadRequest) {
            return;
          }

          this.records.set([]);
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  protected onQuery(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query.set(input?.value ?? '');
  }

  protected selectUser(record: UsuarioResponse): void {
    if (record.usuariosId == null) {
      return;
    }

    this.selectedId.set(record.usuariosId);
    this.mobileDetail.set(true);
    this.copied.set(false);
    this.queueDetailMotion();
  }

  protected backToList(): void {
    this.mobileDetail.set(false);
  }

  protected codeId(record: UsuarioResponse): string {
    return formatUsuarioId(record.usuariosId);
  }

  protected displayName(record: UsuarioResponse): string {
    return formatUsuarioNombre(record);
  }

  protected initials(record: UsuarioResponse): string {
    return formatUsuarioIniciales(record);
  }

  protected createdLabel(record: UsuarioResponse): string {
    return formatQrDay(record.fechaCreacion);
  }

  protected creatorLabel(record: UsuarioResponse): string {
    return formatUsuarioReferencia(this.records(), record.usuarioCreador);
  }

  protected editorLabel(record: UsuarioResponse): string {
    return formatUsuarioReferencia(this.records(), record.usuarioEditor);
  }

  protected createdAt(record: UsuarioResponse): string {
    return formatQrTimestamp(record.fechaCreacion);
  }

  protected editedAt(record: UsuarioResponse): string {
    return formatQrTimestamp(record.fechaEdicion);
  }

  protected hasStatus(record: UsuarioResponse): boolean {
    return typeof record.activo === 'boolean';
  }

  protected copyEmail(record: UsuarioResponse, trigger: EventTarget | null): void {
    const email = record.email?.trim();
    if (!email || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(email).then(() => {
      this.copied.set(true);
      pulseElement(trigger instanceof Element ? trigger : null);
      window.clearTimeout(this.copiedTimer);
      this.copiedTimer = window.setTimeout(() => this.copied.set(false), 1600);
    });
  }

  protected openEdit(): void {
    const record = this.selected();
    if (!record || this.actionBusy()) {
      return;
    }

    this.patchEditForm(record);
    this.actionError.set(null);
    this.showDialog('edit');
  }

  protected openDelete(): void {
    if (!this.selected() || this.actionBusy()) {
      return;
    }

    this.actionError.set(null);
    this.showDialog('delete');
  }

  protected closeDialog(): void {
    if (this.actionBusy()) {
      return;
    }

    this.playDialog(false);
    window.clearTimeout(this.dialogTimer);
    this.dialogTimer = window.setTimeout(() => this.dialog.set(null), MOTION.duration.component);
  }

  protected saveEdit(): void {
    const id = this.selectedId();
    if (id == null || this.actionBusy()) {
      return;
    }

    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      return;
    }

    const value = this.editForm.getRawValue();
    const email = value.email.trim();
    if (this.hasDuplicateEmail(email, id)) {
      this.actionError.set('Ya existe un usuario con ese correo electrónico.');
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set(null);

    this.usuarioService
      .update(id, {
        email,
        nombre: value.nombre.trim(),
        apellidoPaterno: value.apellidoPaterno.trim(),
        apellidoMaterno: value.apellidoMaterno.trim() || null,
      })
      .pipe(
        switchMap(() => this.usuarioService.findById(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.replaceRecord(updated);
          this.actionBusy.set(false);
          this.closeDialog();
        },
        error: () => {
          this.actionBusy.set(false);
          this.actionError.set('No se pudieron guardar los cambios.');
        },
      });
  }

  protected confirmDelete(): void {
    const id = this.selectedId();
    if (id == null || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set(null);

    this.usuarioService
      .toggleActivo(id)
      .pipe(
        switchMap(() => this.usuarioService.findById(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.replaceRecord(updated);
          this.actionBusy.set(false);
          this.closeDialog();
        },
        error: () => {
          this.actionBusy.set(false);
          this.actionError.set('No se pudo actualizar el usuario.');
        },
      });
  }

  private patchEditForm(record: UsuarioResponse): void {
    this.editForm.reset({
      email: record.email?.trim() || '',
      nombre: record.nombre?.trim() || '',
      apellidoPaterno: record.apellidoPaterno?.trim() || '',
      apellidoMaterno: record.apellidoMaterno?.trim() || '',
    });
  }

  private hasDuplicateEmail(email: string, ignoreId?: number | null): boolean {
    const key = email.trim().toLowerCase();
    if (!key) {
      return false;
    }

    return this.records().some(
      (record) => record.usuariosId !== ignoreId && record.email?.trim().toLowerCase() === key,
    );
  }

  private replaceRecord(updated: UsuarioResponse): void {
    this.records.update((records) =>
      this.sortRecords(
        records.map((record) => (record.usuariosId === updated.usuariosId ? updated : record)),
      ),
    );
  }

  private showDialog(kind: Exclude<UsuarioDialog, null>): void {
    window.clearTimeout(this.dialogTimer);
    this.dialog.set(kind);
    const play = (attempt = 0): void => {
      const overlay = qs<HTMLElement>(this.host.nativeElement, '.qr-dialog-overlay');
      const panel = qs<HTMLElement>(this.host.nativeElement, '.qr-dialog-panel');
      if (!overlay || !panel) {
        if (attempt < 10) {
          requestAnimationFrame(() => play(attempt + 1));
        }
        return;
      }

      this.playDialog(true);
    };

    requestAnimationFrame(() => play());
  }

  private playDialog(open: boolean): void {
    const overlay = qs<HTMLElement>(this.host.nativeElement, '.qr-dialog-overlay');
    const panel = qs<HTMLElement>(this.host.nativeElement, '.qr-dialog-panel');
    if (!overlay || !panel) {
      return;
    }

    animateModal(overlay, panel, open);
  }

  private sortRecords(records: UsuarioResponse[]): UsuarioResponse[] {
    return [...records].sort((left, right) => {
      const delta =
        (parseQrFecha(right.fechaCreacion)?.getTime() ?? 0) -
        (parseQrFecha(left.fechaCreacion)?.getTime() ?? 0);

      return delta || (right.usuariosId ?? 0) - (left.usuariosId ?? 0);
    });
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
    this.playEntrance();
    this.setupNav();
    this.navReady = true;
    this.syncIndicators(true);
    this.setupNavGlow();
  }

  private playEntrance(): void {
    const root = this.host.nativeElement as HTMLElement;
    const navbar = qs<HTMLElement>(root, '.navbar');
    const welcome = qs<HTMLElement>(root, '.welcome');
    const dock = qs<HTMLElement>(root, '.nav-dock');
    const host = qs<HTMLElement>(root, '.qr-host');

    animateSection([
      ...(navbar ? [{ targets: navbar, y: -8, duration: 480, at: 0 }] : []),
      ...(welcome ? [{ targets: welcome, y: 12, duration: 520, at: 70 }] : []),
      ...(host ? [{ targets: host, y: 16, duration: 560, at: 140 }] : []),
      ...(dock ? [{ targets: dock, y: 10, duration: 420, at: 220 }] : []),
    ]);
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
