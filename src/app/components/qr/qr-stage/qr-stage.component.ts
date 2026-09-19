import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { createTimeline, stagger, utils, type Timeline } from 'animejs';
import {
  createQrModules,
  QR_CENTER,
  QR_PARTICLE_COUNT,
  QR_PARTICLES,
  QR_SIZE,
} from '../qr-pattern';

@Component({
  selector: 'app-qr-stage',
  templateUrl: './qr-stage.component.html',
  styleUrl: './qr-stage.component.css',
  host: {
    class: 'block h-full w-full',
    'aria-hidden': 'true',
  },
})
export class QrStageComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private timeline: Timeline | null = null;
  private motionQuery: MediaQueryList | null = null;
  private motionListener: (() => void) | null = null;

  protected readonly size = QR_SIZE;
  protected readonly center = QR_CENTER;
  protected readonly viewBox = `-1.2 -1.2 ${QR_SIZE + 2.4} ${QR_SIZE + 2.4}`;
  protected readonly modules = createQrModules();
  protected readonly particles = QR_PARTICLES;
  protected readonly reducedMotion = signal(false);

  constructor() {
    afterNextRender(() => this.boot());

    this.destroyRef.onDestroy(() => {
      this.stop();
      if (this.motionQuery && this.motionListener) {
        this.motionQuery.removeEventListener('change', this.motionListener);
      }
    });
  }

  private boot(): void {
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionListener = () => this.syncMotion(this.motionQuery!.matches);
    this.motionQuery.addEventListener('change', this.motionListener);
    this.syncMotion(this.motionQuery.matches);
  }

  private syncMotion(reduced: boolean): void {
    this.reducedMotion.set(reduced);
    this.stop();

    if (reduced) {
      this.showStaticQr();
      return;
    }

    this.play();
  }

  private showStaticQr(): void {
    const root = this.root();
    if (!root) {
      return;
    }

    utils.set(root.querySelectorAll('.qr-module'), {
      opacity: 1,
      scale: 1,
    });
    utils.set(root.querySelectorAll('.qr-scan, .qr-particle'), {
      opacity: 0,
    });
  }

  private play(): void {
    const root = this.root();
    if (!root || this.timeline) {
      return;
    }

    const finders = root.querySelectorAll('.qr-module[data-kind="finder"]');
    const timing = root.querySelectorAll('.qr-module[data-kind="timing"]');
    const data = root.querySelectorAll('.qr-module[data-kind="data"]');
    const modules = root.querySelectorAll('.qr-module');
    const scan = root.querySelector('.qr-scan');
    const particles = root.querySelectorAll('.qr-particle');

    if (!finders.length || !scan) {
      return;
    }

    utils.set(modules, { opacity: 0, scale: 0.2 });
    utils.set(scan, { opacity: 0, translateX: '-12%' });
    utils.set(particles, { opacity: 0, translateX: 0, translateY: 0 });

    this.timeline = createTimeline({
      loop: true,
      loopDelay: 720,
      defaults: { ease: 'out(3)' },
    });

    this.timeline.add(
      finders,
      {
        opacity: [0, 1],
        scale: [0.18, 1],
        delay: stagger(22, { from: 'center' }),
        duration: 480,
      },
      180,
    );

    this.timeline.add(
      timing,
      {
        opacity: [0, 1],
        scale: [0.35, 1],
        delay: stagger(16),
        duration: 360,
      },
      '-=220',
    );

    this.timeline.add(
      data,
      {
        opacity: [0, 1],
        scale: [0.12, 1],
        delay: (el?: unknown) => this.delayFromCenter(el as Element) * 0.9,
        duration: 520,
      },
      '-=260',
    );

    this.timeline.add(
      modules,
      {
        opacity: [1, 0.78, 1],
        delay: (el?: unknown) => this.delayFromCenter(el as Element) * 0.55,
        duration: 980,
        ease: 'inOut(2)',
      },
      '+=160',
    );

    this.timeline.add(
      scan,
      {
        opacity: [0, 1, 1, 0],
        translateX: ['-12%', '112%'],
        duration: 1500,
        ease: 'inOut(3)',
      },
      '-=280',
    );

    this.timeline.add(
      modules,
      {
        opacity: [1, 0.42, 1],
        delay: (_el?: unknown, i = 0) => {
          const node = modules.item(i) as SVGElement | null;
          const col = Number(node?.dataset['col'] ?? 0);
          return col * (1500 / QR_SIZE);
        },
        duration: 280,
        ease: 'inOut(2)',
      },
      '<<',
    );

    this.timeline.add(
      particles,
      {
        opacity: [0, 0.9, 0],
        translateX: (_el?: unknown, i = 0) => Math.cos((i / QR_PARTICLE_COUNT) * Math.PI * 2) * (7.5 + (i % 4)),
        translateY: (_el?: unknown, i = 0) => Math.sin((i / QR_PARTICLE_COUNT) * Math.PI * 2) * (7.5 + (i % 3)),
        scale: [0.4, 1, 0.2],
        duration: 980,
        delay: stagger(18),
        ease: 'out(2)',
      },
      '+=40',
    );

    this.timeline.add(
      modules,
      {
        opacity: 0,
        scale: 0.35,
        delay: (el?: unknown) => {
          const max = Math.hypot(QR_CENTER, QR_CENTER) * 28;
          return Math.max(0, max - this.delayFromCenter(el as Element));
        },
        duration: 460,
        ease: 'in(2)',
      },
      '+=180',
    );

    this.timeline.add(
      scan,
      {
        opacity: 0,
        translateX: '-12%',
        duration: 1,
      },
      '<<',
    );

    this.timeline.add(
      particles,
      {
        opacity: 0,
        translateX: 0,
        translateY: 0,
        duration: 1,
      },
      '<<',
    );
  }

  private delayFromCenter(el: Element): number {
    const node = el as HTMLElement;
    const x = Number(node.dataset['col'] ?? 0);
    const y = Number(node.dataset['row'] ?? 0);
    return Math.hypot(x - QR_CENTER, y - QR_CENTER) * 28;
  }

  private stop(): void {
    this.timeline?.revert();
    this.timeline = null;
  }

  private root(): HTMLElement | null {
    return this.host.nativeElement as HTMLElement;
  }
}
