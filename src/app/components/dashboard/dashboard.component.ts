import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MotionButtonDirective } from '../../motion/motion.directives';
import { MotionService, qs, qsa, type MotionTeardown } from '../../motion/motion';
import { MOTION } from '../../motion/motion-tokens';
import { animateNavGlow, animateNavIndicator, animateSection, pulseElement } from '../../motion/ui-motion';
import { AuthService } from '../service/auth.service';
import { DashboardChartCardComponent } from './dashboard-chart-card/dashboard-chart-card.component';
import { DashboardRecordsCardComponent } from './dashboard-records-card/dashboard-records-card.component';
import { DashboardReservedCardComponent } from './dashboard-reserved-card/dashboard-reserved-card.component';
import { DashboardUserCardComponent } from './dashboard-user-card/dashboard-user-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    NgTemplateOutlet,
    DashboardUserCardComponent,
    DashboardChartCardComponent,
    DashboardReservedCardComponent,
    DashboardRecordsCardComponent,
    MotionButtonDirective,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: {
    class: 'block min-h-dvh',
  },
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly motion = inject(MotionService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly desktopNav = viewChild<ElementRef<HTMLElement>>('desktopNav');
  private readonly dockNav = viewChild<ElementRef<HTMLElement>>('dockNav');

  private observers: ResizeObserver[] = [];
  private glowStops: MotionTeardown[] = [];
  private navReady = false;
  private navFrame = 0;
  private navMove = 0;
  private navMovedAt = 0;

  protected readonly displayName = 'Admin';
  protected readonly navItems = [
    { id: 'panel', label: 'Panel' },
    { id: 'qr', label: 'QR' },
    { id: 'escaneos', label: 'Escaneos' },
    { id: 'versiones', label: 'Versiones' },
    { id: 'usuarios', label: 'Usuarios' },
  ] as const;

  protected readonly activeSection = signal<(typeof this.navItems)[number]['id']>('panel');
  protected readonly settledSection = signal<(typeof this.navItems)[number]['id']>('panel');

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
    });
  }

  protected selectSection(id: (typeof this.navItems)[number]['id']): void {
    if (this.activeSection() === id) {
      return;
    }

    this.activeSection.set(id);
    this.pulseNavIcon(id);
    this.queueIndicatorSync();
  }

  protected signOut(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
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
    const cells = qsa<HTMLElement>(root, '.grid > *');
    const dock = qs<HTMLElement>(root, '.nav-dock');

    animateSection([
      ...(navbar ? [{ targets: navbar, y: -8, duration: 480, at: 0 }] : []),
      ...(welcome ? [{ targets: welcome, y: 12, duration: 520, at: 70 }] : []),
      ...(cells.length ? [{ targets: cells, y: 16, duration: 560, stagger: 70, at: 140 }] : []),
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

  private queueIndicatorSync(): void {
    const move = ++this.navMove;
    this.navMovedAt = performance.now();
    cancelAnimationFrame(this.navFrame);
    this.navFrame = requestAnimationFrame(() => this.syncIndicators(false, move));
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

  private pulseNavIcon(id: (typeof this.navItems)[number]['id']): void {
    for (const nav of this.navElements()) {
      const icon = qs<HTMLElement>(nav, `.nav-link[data-section="${id}"] .nav-icon`);
      pulseElement(icon);
    }
  }

  private navElements(): HTMLElement[] {
    return [this.desktopNav()?.nativeElement, this.dockNav()?.nativeElement].filter(
      (node): node is HTMLElement => Boolean(node),
    );
  }
}
