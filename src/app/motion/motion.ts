import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { utils } from 'animejs';

export type MotionTeardown = () => void;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isFinePointer(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

export function killMotion(targets: Parameters<typeof utils.remove>[0]): void {
  utils.remove(targets);
}

export function qs<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector(selector) as T | null;
}

export function qsa<T extends Element>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll(selector)] as T[];
}

export function resetTransform(el: Element): void {
  utils.set(el, {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
  });
}

@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly document = inject(DOCUMENT);
  private readonly reducedState = signal(this.readReduced());

  readonly reduced = this.reducedState.asReadonly();

  constructor() {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }

    const query = view.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => this.reducedState.set(query.matches);
    query.addEventListener('change', onChange);
  }

  enabled(): boolean {
    return !this.reducedState();
  }

  private readReduced(): boolean {
    return this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
