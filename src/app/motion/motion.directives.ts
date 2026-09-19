import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { MotionService, qs, qsa, type MotionTeardown } from './motion';
import type { MotionIconHint } from './motion-tokens';
import { animateButton, animateCard, animateInput, animateList, animateListRow } from './ui-motion';

@Directive({
  selector: '[appMotionButton]',
})
export class MotionButtonDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motion = inject(MotionService);

  readonly appMotionButton = input<MotionIconHint | ''>('none');

  constructor() {
    afterNextRender(() => {
      const raw = this.appMotionButton();
      const stop = animateButton(this.host.nativeElement, {
        icon: raw || 'none',
        enabled: () => this.motion.enabled(),
      });
      this.destroyRef.onDestroy(stop);
    });
  }
}

@Directive({
  selector: '[appMotionCard]',
})
export class MotionCardDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motion = inject(MotionService);

  readonly appMotionCard = input<'subtle' | 'interactive' | ''>('subtle');

  constructor() {
    afterNextRender(() => {
      const stop = animateCard(this.host.nativeElement, {
        interactive: this.appMotionCard() === 'interactive',
        enabled: () => this.motion.enabled(),
      });
      this.destroyRef.onDestroy(stop);
    });
  }
}

@Directive({
  selector: '[appMotionInput]',
})
export class MotionInputDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motion = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      const field = this.host.nativeElement;
      const inputEl = field.matches('input, textarea')
        ? field
        : qs<HTMLElement>(field, 'input, textarea');

      if (!inputEl) {
        return;
      }

      const onFocus = (): void => {
        if (this.motion.enabled()) {
          animateInput(field, 'focus');
        }
      };
      const onBlur = (): void => {
        if (this.motion.enabled()) {
          animateInput(field, 'blur');
        }
      };

      inputEl.addEventListener('focus', onFocus);
      inputEl.addEventListener('blur', onBlur);
      this.destroyRef.onDestroy(() => {
        inputEl.removeEventListener('focus', onFocus);
        inputEl.removeEventListener('blur', onBlur);
      });
    });
  }
}

@Directive({
  selector: '[appMotionList]',
})
export class MotionListDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motion = inject(MotionService);
  private readonly rowStops: MotionTeardown[] = [];

  constructor() {
    afterNextRender(() => {
      const root = this.host.nativeElement;
      const items = qsa<HTMLElement>(root, ':scope > *');
      animateList(items);

      for (const item of items) {
        const onEnter = (): void => animateListRow(item, true, this.motion.enabled());
        const onLeave = (): void => animateListRow(item, false, this.motion.enabled());
        item.addEventListener('pointerenter', onEnter);
        item.addEventListener('pointerleave', onLeave);
        this.rowStops.push(() => {
          item.removeEventListener('pointerenter', onEnter);
          item.removeEventListener('pointerleave', onLeave);
        });
      }

      this.destroyRef.onDestroy(() => {
        this.rowStops.forEach((stop) => stop());
      });
    });
  }
}
