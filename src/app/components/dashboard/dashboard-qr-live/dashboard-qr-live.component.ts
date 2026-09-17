import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { createTimeline, stagger, utils, type Timeline } from 'animejs';
import { createQrModules, QR_CENTER, QR_SIZE } from '../../qr-stage/qr-pattern';

const PARTICLE_COUNT = 8;
const MAX_TILT_FINE = 6.5;
const MAX_TILT_COARSE = 3.4;

@Component({
  selector: 'app-dashboard-qr-live',
  templateUrl: './dashboard-qr-live.component.html',
  styleUrl: './dashboard-qr-live.component.css',
})
export class DashboardQrLiveComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private idleTimeline: Timeline | null = null;
  private burstTimeline: Timeline | null = null;
  private frame = 0;
  private hovering = false;
  private reduced = false;
  private coarse = false;
  private lastPointer = { x: 0, y: 0, t: 0 };
  private burstAt = 0;
  private motionQuery: MediaQueryList | null = null;
  private motionListener: (() => void) | null = null;
  private moduleNodes: SVGElement[] = [];
  private lastEnergy = new Map<SVGElement, number>();

  private readonly tilt = { x: 0, y: 0, scale: 1, tx: 0, ty: 0, tScale: 1 };
  private readonly beam = { y: QR_CENTER, ty: QR_CENTER };
  private readonly pointerQr = { x: QR_CENTER, y: QR_CENTER };

  protected readonly size = QR_SIZE;
  protected readonly center = QR_CENTER;
  protected readonly viewBox = `-1.15 -1.15 ${QR_SIZE + 2.3} ${QR_SIZE + 2.3}`;
  protected readonly modules = createQrModules();
  protected readonly particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => index);
  protected readonly uid = `qr${Math.floor(Math.random() * 1e7)}`;
  protected readonly reducedMotion = signal(false);

  constructor() {
    afterNextRender(() => this.boot());
    this.destroyRef.onDestroy(() => this.teardown());
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (this.reduced) {
      return;
    }

    this.hovering = true;
    this.stopIdle();
    this.tilt.tScale = this.coarse ? 1.03 : 1.055;
    this.updatePointer(event);
    this.beam.y = this.beam.ty;
    this.setScanOpacity(0.72);
    this.setAura(0.42);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.reduced || !this.hovering) {
      return;
    }

    this.updatePointer(event);
  }

  protected onPointerLeave(): void {
    if (this.reduced) {
      return;
    }

    this.hovering = false;
    this.tilt.tx = 0;
    this.tilt.ty = 0;
    this.tilt.tScale = 1;
    this.beam.ty = QR_CENTER;
    this.setScanOpacity(0.22);
    this.setAura(0.16);
    this.resetModuleProximity();
    this.playIdle();
  }

  private boot(): void {
    this.coarse = window.matchMedia('(pointer: coarse)').matches;
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionListener = () => this.syncMotion(this.motionQuery!.matches);
    this.motionQuery.addEventListener('change', this.motionListener);
    this.syncMotion(this.motionQuery.matches);
    this.frame = requestAnimationFrame(() => this.tick());
  }

  private syncMotion(reduced: boolean): void {
    this.reduced = reduced;
    this.reducedMotion.set(reduced);
    this.stopIdle();
    this.burstTimeline?.revert();
    this.burstTimeline = null;

    this.moduleNodes = [...this.root().querySelectorAll<SVGElement>('.qr-mod')];
    this.lastEnergy.clear();
    utils.set(this.moduleNodes, { opacity: 1, scale: 1 });
    utils.set(this.particlesEls(), { opacity: 0, translateX: 0, translateY: 0 });

    const scan = this.scan();
    if (scan) {
      utils.set(scan, { opacity: reduced ? 0 : 0.22, translateY: 0 });
    }

    this.setAura(reduced ? 0 : 0.16);

    const rig = this.rig();
    if (rig) {
      utils.set(rig, { rotateX: 0, rotateY: 0, scale: 1 });
    }

    if (!reduced) {
      this.playIdle();
    }
  }

  private playIdle(): void {
    const scan = this.scan();
    const pulse = this.moduleNodes
      .filter((node) => node.dataset['kind'] === 'data')
      .filter((_, index) => index % 9 === 3);

    if (!scan || this.reduced) {
      return;
    }

    this.stopIdle();

    const unit = this.svgUnit();
    const travel = (QR_CENTER + 0.45) * unit;

    this.idleTimeline = createTimeline({
      loop: true,
      loopDelay: 2200,
      defaults: { ease: 'inOut(3)' },
    });

    this.idleTimeline.add(scan, {
      opacity: [0.1, 0.34, 0.34, 0.1],
      translateY: [-travel, travel],
      duration: 5200,
    });

    if (pulse.length) {
      this.idleTimeline.add(
        pulse,
        {
          opacity: [1, 0.58, 1],
          scale: [1, 0.82, 1],
          delay: stagger(160, { from: 'first' }),
          duration: 2600,
        },
        480,
      );
    }
  }

  private tick(): void {
    this.frame = requestAnimationFrame(() => this.tick());

    if (this.reduced) {
      return;
    }

    if (this.coarse && !this.hovering) {
      const t = performance.now() * 0.00038;
      this.tilt.tx = Math.sin(t) * 2.2;
      this.tilt.ty = Math.cos(t * 0.82) * 2.2;
    }

    const maxTilt = this.coarse ? MAX_TILT_COARSE : MAX_TILT_FINE;
    const ease = this.hovering ? 0.14 : 0.1;

    this.tilt.x += (this.tilt.tx - this.tilt.x) * ease;
    this.tilt.y += (this.tilt.ty - this.tilt.y) * ease;
    this.tilt.scale += (this.tilt.tScale - this.tilt.scale) * ease;
    this.beam.y += (this.beam.ty - this.beam.y) * (this.hovering ? 0.16 : 0.08);

    const rig = this.rig();
    if (rig) {
      utils.set(rig, {
        rotateX: this.clamp(this.tilt.x, -maxTilt, maxTilt),
        rotateY: this.clamp(this.tilt.y, -maxTilt, maxTilt),
        scale: this.tilt.scale,
      });
    }

    if (!this.hovering) {
      return;
    }

    const scan = this.scan();
    if (scan) {
      utils.set(scan, { translateY: (this.beam.y - QR_CENTER) * this.svgUnit() });
    }

    this.applyProximity();
  }

  private updatePointer(event: PointerEvent): void {
    const rig = this.rig();
    if (!rig) {
      return;
    }

    const rect = rig.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const nx = this.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const ny = this.clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const maxTilt = this.coarse ? MAX_TILT_COARSE : MAX_TILT_FINE;

    this.tilt.ty = (nx - 0.5) * 2 * maxTilt;
    this.tilt.tx = (0.5 - ny) * 2 * maxTilt;
    this.pointerQr.x = nx * QR_SIZE;
    this.pointerQr.y = ny * QR_SIZE;
    this.beam.ty = this.pointerQr.y;

    const now = performance.now();
    const dt = now - this.lastPointer.t;
    if (!this.coarse && this.lastPointer.t && dt < 80) {
      const distance = Math.hypot(
        event.clientX - this.lastPointer.x,
        event.clientY - this.lastPointer.y,
      );
      const speed = dt > 0 ? distance / dt : distance > 24 ? 2 : 0;
      if (speed > 1.15) {
        this.burst();
      }
    }

    this.lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }

  private applyProximity(): void {
    const px = this.pointerQr.x;
    const py = this.pointerQr.y;
    const beamY = this.beam.y;

    for (const node of this.moduleNodes) {
      const col = Number(node.dataset['col'] ?? 0);
      const row = Number(node.dataset['row'] ?? 0);
      const near = Math.max(0, 1 - Math.hypot(col - px, row - py) / 3.4);
      const alongBeam = Math.max(0, 1 - Math.abs(row - beamY) / 1.8);
      const energy = Math.max(near, alongBeam * 0.85);
      const previous = this.lastEnergy.get(node) ?? 0;

      if (energy < 0.03 && previous < 0.03) {
        continue;
      }

      this.lastEnergy.set(node, energy);
      const finder = node.dataset['kind'] === 'finder';
      utils.set(node, {
        opacity: 0.94 + energy * 0.06,
        scale: 1 + energy * (finder ? 0.07 : 0.18),
      });
    }
  }

  private resetModuleProximity(): void {
    this.lastEnergy.clear();
    if (this.moduleNodes.length) {
      utils.set(this.moduleNodes, { opacity: 1, scale: 1 });
    }
  }

  private burst(): void {
    const now = performance.now();
    if (now - this.burstAt < 920) {
      return;
    }

    this.burstAt = now;
    this.burstTimeline?.revert();

    const particles = [...this.particlesEls()];
    const unit = this.svgUnit();
    const originX = (this.pointerQr.x - QR_CENTER) * unit;
    const originY = (this.pointerQr.y - QR_CENTER) * unit;
    const timeline = createTimeline({
      defaults: { ease: 'out(3)' },
      onComplete: () => {
        timeline.revert();
        if (this.burstTimeline === timeline) {
          this.burstTimeline = null;
        }
      },
    });

    this.burstTimeline = timeline;

    particles.forEach((particle, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      const distance = (2.6 + (index % 3) * 0.55) * unit;

      utils.set(particle, {
        opacity: 0.9,
        translateX: originX,
        translateY: originY,
        scale: 0.85,
      });

      timeline.add(
        particle,
        {
          translateX: originX + Math.cos(angle) * distance,
          translateY: originY + Math.sin(angle) * distance,
          opacity: 0,
          scale: 0.15,
          duration: 560,
        },
        index * 12,
      );
    });
  }

  private setScanOpacity(value: number): void {
    const scan = this.scan();
    if (scan) {
      utils.set(scan, { opacity: value });
    }
  }

  private setAura(value: number): void {
    const aura = this.root().querySelector('.qr-aura');
    if (aura) {
      utils.set(aura, { opacity: value });
    }
  }

  private stopIdle(): void {
    this.idleTimeline?.revert();
    this.idleTimeline = null;
  }

  private teardown(): void {
    cancelAnimationFrame(this.frame);
    this.stopIdle();
    this.burstTimeline?.revert();
    this.burstTimeline = null;
    if (this.motionQuery && this.motionListener) {
      this.motionQuery.removeEventListener('change', this.motionListener);
    }
  }

  private root(): HTMLElement {
    return this.host.nativeElement;
  }

  private rig(): HTMLElement | null {
    return this.root().querySelector('.qr-rig');
  }

  private scan(): Element | null {
    return this.root().querySelector('.qr-beam');
  }

  private particlesEls(): NodeListOf<Element> {
    return this.root().querySelectorAll('.qr-spark');
  }

  private svgUnit(): number {
    const svg = this.root().querySelector('.qr-svg');
    const height = svg?.getBoundingClientRect().height ?? 0;
    return height > 0 ? height / (QR_SIZE + 2.3) : 8;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
