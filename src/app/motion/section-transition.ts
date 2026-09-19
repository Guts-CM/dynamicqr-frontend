import { Injectable, inject } from '@angular/core';
import { animate, createTimeline, type JSAnimation, type Timeline } from 'animejs';
import { MotionService, killMotion, prefersReducedMotion, qs, qsa, resetTransform } from './motion';
import { MOTION } from './motion-tokens';
import { animateSection, type SectionBeat } from './ui-motion';

export type SectionDirection = -1 | 0 | 1;

export type SectionEnterOptions = {
  direction?: SectionDirection;
  initial?: boolean;
};

const SECTION_ORDER = ['login', 'dashboard', 'qr', 'versiones', 'usuarios'] as const;
const SECTION_TIME_SCALE = 3;

@Injectable({ providedIn: 'root' })
export class SectionTransitionService {
  private readonly motion = inject(MotionService);
  private generation = 0;
  private running: Array<Timeline | JSAnimation | null> = [];

  nextGeneration(): number {
    this.stop();
    this.generation += 1;
    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  sectionKey(url: string | null | undefined): string {
    const path = (url ?? '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    const head = path.split('/')[0] || 'login';
    return head === 'login' ? 'login' : head;
  }

  sameSection(fromUrl: string | null | undefined, toUrl: string | null | undefined): boolean {
    return this.sectionKey(fromUrl) === this.sectionKey(toUrl);
  }

  direction(fromUrl: string | null | undefined, toUrl: string | null | undefined): SectionDirection {
    const from = SECTION_ORDER.indexOf(this.sectionKey(fromUrl) as (typeof SECTION_ORDER)[number]);
    const to = SECTION_ORDER.indexOf(this.sectionKey(toUrl) as (typeof SECTION_ORDER)[number]);
    if (from < 0 || to < 0 || from === to) {
      return 0;
    }

    return from < to ? 1 : -1;
  }

  animateSectionLeave(root: HTMLElement, direction: SectionDirection = 0): void {
    if (!this.motion.enabled() || prefersReducedMotion()) {
      return;
    }

    killMotion(root);
    this.track(
      animate(root, {
        opacity: 0.55,
        translateX: direction === 0 ? 0 : direction * -8,
        translateY: direction === 0 ? -4 : 0,
        scale: 0.996,
        duration: MOTION.duration.micro * SECTION_TIME_SCALE,
        ease: MOTION.ease.inOutQuart,
      }),
    );
  }

  animateSectionEnter(root: HTMLElement, options: SectionEnterOptions = {}): void {
    this.resetSectionState(root);

    if (!this.motion.enabled() || prefersReducedMotion()) {
      return;
    }

    const initial = options.initial === true;
    const direction = options.direction ?? 0;
    const x = initial ? 0 : direction * 12;
    const y = initial ? 6 : 5;

    killMotion(root);
    this.track(
      animate(root, {
        translateX: [x, 0],
        translateY: [y, 0],
        scale: [initial ? 1 : 0.995, 1],
        duration: (initial ? 400 : 360) * SECTION_TIME_SCALE,
        ease: MOTION.ease.outExpo,
      }),
    );
    this.animateContentStagger(root, { initial });
  }

  animateContentStagger(root: HTMLElement, options: { initial?: boolean } = {}): void {
    if (!this.motion.enabled() || prefersReducedMotion()) {
      this.resetSectionState(root);
      return;
    }

    this.track(animateSection(this.contentBeats(root, options.initial === true)));
  }

  resetSectionState(root: HTMLElement): void {
    killMotion(root);
    resetTransform(root);
    for (const layer of qsa<HTMLElement>(
      root,
      '.navbar, .welcome, .qr-host, .grid > *, .nav-dock, .login-visual, .glass-ornament, .login-card, .login-header, .field, .login-options, .btn-primary, .login-divider, .social-row, .login-footer, [data-motion-init]',
    )) {
      resetTransform(layer);
      layer.removeAttribute('data-motion-init');
    }
  }

  private contentBeats(root: HTMLElement, initial: boolean): SectionBeat[] {
    const pace = initial ? 1 : 0.84;
    const wait = (ms: number): number => Math.round(ms * SECTION_TIME_SCALE * (initial ? 1 : 0.72));
    const duration = (ms: number): number => Math.round(ms * SECTION_TIME_SCALE * pace);
    const gap = (ms: number): number => Math.round(ms * SECTION_TIME_SCALE);

    if (qs(root, '.login-page')) {
      const visual = qs<HTMLElement>(root, '.login-visual');
      const ornaments = qsa<HTMLElement>(root, '.glass-ornament');
      const card = qs<HTMLElement>(root, '.login-card');
      const header = qs<HTMLElement>(root, '.login-header');
      const fields = qsa<HTMLElement>(root, '.field');
      const rest = qsa<HTMLElement>(
        root,
        '.login-options, .btn-primary, .login-divider, .social-row, .login-footer',
      );

      return [
        ...(visual ? [{ targets: visual, y: 14, duration: duration(640), at: 0 }] : []),
        ...(ornaments.length
          ? [{ targets: ornaments, y: 0, scale: 0.96, duration: duration(620), stagger: gap(40), at: wait(40) }]
          : []),
        ...(card ? [{ targets: card, y: 16, duration: duration(700), at: 0 }] : []),
        ...(header ? [{ targets: header, y: 10, duration: duration(480), at: wait(160) }] : []),
        ...(fields.length
          ? [{ targets: fields, y: 10, duration: duration(460), stagger: gap(50), at: wait(210) }]
          : []),
        ...(rest.length ? [{ targets: rest, y: 8, duration: duration(420), stagger: gap(40), at: wait(320) }] : []),
      ];
    }

    const navbar = qs<HTMLElement>(root, '.navbar');
    const welcome = qs<HTMLElement>(root, '.welcome');
    const dock = qs<HTMLElement>(root, '.nav-dock');
    const host = qs<HTMLElement>(root, '.qr-host');
    const cells = qsa<HTMLElement>(root, '.grid > *');

    return [
      ...(navbar ? [{ targets: navbar, y: -8, duration: duration(480), at: 0 }] : []),
      ...(welcome ? [{ targets: welcome, y: 12, duration: duration(520), at: wait(70) }] : []),
      ...(cells.length
        ? [{ targets: cells, y: 16, duration: duration(560), stagger: gap(70), at: wait(140) }]
        : []),
      ...(host ? [{ targets: host, y: 16, duration: duration(560), at: wait(140) }] : []),
      ...(dock ? [{ targets: dock, y: 10, duration: duration(420), at: wait(220) }] : []),
    ];
  }

  private track(animation: Timeline | JSAnimation | null): void {
    if (animation) {
      this.running.push(animation);
    }
  }

  private stop(): void {
    for (const animation of this.running) {
      animation?.pause();
    }

    this.running = [];
  }
}
