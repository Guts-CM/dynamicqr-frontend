import { animate, createTimeline, stagger, utils, type JSAnimation, type Timeline } from 'animejs';
import {
  MOTION,
  MOTION_ICON_SHIFT,
  type MotionIconHint,
} from './motion-tokens';
import {
  isFinePointer,
  killMotion,
  prefersReducedMotion,
  qs,
  qsa,
  resetTransform,
  type MotionTeardown,
} from './motion';

export type SectionBeat = {
  targets: Element | Element[] | NodeListOf<Element>;
  y?: number;
  x?: number;
  scale?: number;
  duration?: number;
  stagger?: number;
  at?: number | string;
};

const asTargets = (targets: SectionBeat['targets']): Element[] => {
  if (targets instanceof Element) {
    return [targets];
  }

  return [...targets].filter((node): node is Element => node instanceof Element);
};

export function animateButton(
  el: HTMLElement,
  options: {
    icon?: MotionIconHint;
    hoverScale?: number;
    enabled?: () => boolean;
  } = {},
): MotionTeardown {
  const enabled = options.enabled ?? (() => !prefersReducedMotion());
  const hoverScale = options.hoverScale ?? MOTION.scale.buttonHover;
  const hint = options.icon ?? 'none';
  const shift = MOTION_ICON_SHIFT[hint];
  const icon =
    qs<HTMLElement>(el, '[data-motion-icon], svg, span[aria-hidden="true"]') ?? null;

  let hover = false;
  let press = false;

  const apply = (): void => {
    if (!enabled() || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
      killMotion(el);
      utils.set(el, { scale: 1, translateY: 0 });
      if (icon) {
        killMotion(icon);
        utils.set(icon, { translateX: 0, translateY: 0, rotate: 0, scale: 1 });
      }
      return;
    }

    const activeHover = hover && isFinePointer() && !el.classList.contains('is-active');
    const scale = press ? MOTION.scale.buttonPress : activeHover ? hoverScale : 1;
    const y = press ? 0 : activeHover ? MOTION.shift.button : 0;
    const duration = press ? 140 : MOTION.duration.micro;
    const ease = press ? MOTION.ease.outCubic : MOTION.ease.outQuart;

    killMotion(el);
    animate(el, { scale, translateY: y, duration, ease });

    if (!icon) {
      return;
    }

    killMotion(icon);
    animate(icon, {
      translateX: activeHover ? (shift.x ?? 0) : 0,
      translateY: activeHover ? (shift.y ?? 0) : 0,
      rotate: activeHover ? (shift.rotate ?? 0) : 0,
      scale: press ? 0.96 : activeHover ? (shift.scale ?? 1) : 1,
      duration,
      ease,
    });
  };

  const onEnter = (): void => {
    hover = true;
    apply();
  };
  const onLeave = (): void => {
    hover = false;
    press = false;
    apply();
  };
  const onDown = (): void => {
    press = true;
    apply();
  };
  const onUp = (): void => {
    press = false;
    apply();
  };
  const onFocus = (): void => {
    if (el.matches(':focus-visible')) {
      hover = true;
      apply();
    }
  };
  const onBlur = (): void => {
    hover = false;
    press = false;
    apply();
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('focus', onFocus);
  el.addEventListener('blur', onBlur);

  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointerleave', onLeave);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    el.removeEventListener('focus', onFocus);
    el.removeEventListener('blur', onBlur);
    killMotion(el);
    if (icon) {
      killMotion(icon);
    }
    utils.set(el, { scale: 1, translateY: 0 });
    if (icon) {
      utils.set(icon, { translateX: 0, translateY: 0, rotate: 0, scale: 1 });
    }
  };
}

export function animateCard(
  el: HTMLElement,
  options: {
    interactive?: boolean;
    enabled?: () => boolean;
  } = {},
): MotionTeardown {
  const enabled = options.enabled ?? (() => !prefersReducedMotion());
  const interactive = options.interactive ?? false;
  const glass = {
    edge: MOTION.glass.edge,
    shine: MOTION.glass.shine,
  };

  let hover = false;
  let glassTween: JSAnimation | null = null;

  const apply = (): void => {
    if (!enabled() || !isFinePointer()) {
      return;
    }

    const duration = MOTION.duration.component;
    const ease = MOTION.ease.outQuart;
    const nextEdge = hover
      ? interactive
        ? MOTION.glass.edgeInteractive
        : MOTION.glass.edgeHover
      : MOTION.glass.edge;
    const nextShine = hover
      ? interactive
        ? MOTION.glass.shineInteractive
        : MOTION.glass.shineHover
      : MOTION.glass.shine;

    killMotion(el);
    animate(el, {
      scale: hover && interactive ? MOTION.scale.cardHover : 1,
      translateY: hover && interactive ? MOTION.shift.card : 0,
      duration,
      ease,
    });

    glassTween?.pause();
    glassTween = animate(glass, {
      edge: nextEdge,
      shine: nextShine,
      duration,
      ease,
      onRender: () => {
        el.style.setProperty('--glass-edge', glass.edge.toFixed(2));
        el.style.setProperty('--glass-shine', glass.shine.toFixed(2));
      },
    });
  };

  const onEnter = (): void => {
    hover = true;
    apply();
  };
  const onLeave = (): void => {
    hover = false;
    apply();
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);

  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointerleave', onLeave);
    glassTween?.pause();
    killMotion(el);
    utils.set(el, { scale: 1, translateY: 0 });
    el.style.removeProperty('--glass-edge');
    el.style.removeProperty('--glass-shine');
  };
}

export function animateSection(beats: SectionBeat[]): Timeline | null {
  const usable = beats.filter((beat) => asTargets(beat.targets).length);
  if (!usable.length) {
    return null;
  }

  if (prefersReducedMotion()) {
    for (const beat of usable) {
      utils.set(asTargets(beat.targets), { opacity: 1, translateX: 0, translateY: 0, scale: 1 });
    }
    return null;
  }

  const timeline = createTimeline({
    defaults: { ease: MOTION.ease.outExpo },
    onComplete: () => {
      for (const beat of usable) {
        for (const el of asTargets(beat.targets)) {
          el.removeAttribute('data-motion-init');
        }
      }
    },
  });

  for (const beat of usable) {
    const targets = asTargets(beat.targets);
    utils.set(targets, {
      opacity: 0,
      translateX: beat.x ?? 0,
      translateY: beat.y ?? MOTION.shift.section,
      scale: beat.scale ?? 1,
    });

    timeline.add(
      targets,
      {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        duration: beat.duration ?? MOTION.duration.section,
        delay: beat.stagger ? stagger(beat.stagger) : 0,
      },
      beat.at ?? 0,
    );
  }

  return timeline;
}

export function animateModal(
  overlay: HTMLElement,
  panel: HTMLElement,
  open: boolean,
): Timeline | null {
  if (prefersReducedMotion()) {
    utils.set(overlay, { opacity: open ? 1 : 0 });
    utils.set(panel, { opacity: open ? 1 : 0, scale: 1, translateY: 0 });
    return null;
  }

  killMotion(overlay);
  killMotion(panel);

  if (open) {
    utils.set(overlay, { opacity: 0 });
    utils.set(panel, { opacity: 0, scale: MOTION.scale.modalFrom, translateY: MOTION.shift.modal });
    const timeline = createTimeline({ defaults: { ease: MOTION.ease.outQuart } });
    timeline.add(overlay, { opacity: 1, duration: MOTION.duration.component });
    timeline.add(
      panel,
      { opacity: 1, scale: 1, translateY: 0, duration: MOTION.duration.section },
      40,
    );
    return timeline;
  }

  const timeline = createTimeline({ defaults: { ease: MOTION.ease.inOutQuart } });
  timeline.add(panel, {
    opacity: 0,
    scale: MOTION.scale.modalFrom,
    translateY: 8,
    duration: MOTION.duration.component,
  });
  timeline.add(overlay, { opacity: 0, duration: MOTION.duration.micro }, 0);
  return timeline;
}

export function animateDropdown(el: HTMLElement, open: boolean): JSAnimation | null {
  if (prefersReducedMotion()) {
    utils.set(el, { opacity: open ? 1 : 0, translateY: 0, scale: 1 });
    return null;
  }

  killMotion(el);

  if (open) {
    utils.set(el, { opacity: 0, translateY: MOTION.shift.dropdown, scale: MOTION.scale.dropdownFrom });
    return animate(el, {
      opacity: 1,
      translateY: 0,
      scale: 1,
      duration: MOTION.duration.component,
      ease: MOTION.ease.outQuart,
    });
  }

  return animate(el, {
    opacity: 0,
    translateY: -6,
    scale: MOTION.scale.dropdownFrom,
    duration: MOTION.duration.micro,
    ease: MOTION.ease.inOutQuart,
  });
}

export function animateList(
  items: Element[],
  options: { y?: number; stagger?: number; duration?: number } = {},
): JSAnimation | null {
  if (!items.length) {
    return null;
  }

  if (prefersReducedMotion()) {
    utils.set(items, { opacity: 1, translateY: 0, translateX: 0 });
    return null;
  }

  utils.set(items, { opacity: 0, translateY: options.y ?? MOTION.shift.list });
  return animate(items, {
    opacity: 1,
    translateY: 0,
    delay: stagger(options.stagger ?? 48),
    duration: options.duration ?? MOTION.duration.component,
    ease: MOTION.ease.outQuart,
  });
}

export function animateListRow(item: HTMLElement, hovering: boolean, enabled = true): void {
  if (!enabled || prefersReducedMotion() || !isFinePointer()) {
    return;
  }

  killMotion(item);
  animate(item, {
    translateX: hovering ? MOTION.shift.row : 0,
    duration: MOTION.duration.micro,
    ease: MOTION.ease.outQuart,
  });
}

export function animateInput(
  field: HTMLElement,
  mode: 'focus' | 'blur' | 'invalid' | 'valid',
): JSAnimation | null {
  const icon = qs<HTMLElement>(field, '.field-icon, svg');

  if (prefersReducedMotion()) {
    if (icon) {
      utils.set(icon, { scale: 1 });
    }
    utils.set(field, { translateX: 0 });
    return null;
  }

  if (mode === 'invalid') {
    killMotion(field);
    return animate(field, {
      translateX: [0, -5, 4, -2, 0],
      duration: 360,
      ease: MOTION.ease.inOutQuart,
    });
  }

  if (mode === 'valid' && icon) {
    killMotion(icon);
    return animate(icon, {
      scale: [1, 1.1, 1],
      duration: MOTION.duration.component,
      ease: MOTION.ease.outQuart,
    });
  }

  if (icon && (mode === 'focus' || mode === 'blur')) {
    killMotion(icon);
    return animate(icon, {
      scale: mode === 'focus' ? 1.08 : 1,
      duration: MOTION.duration.micro,
      ease: MOTION.ease.outQuart,
    });
  }

  return null;
}

type NavPose = {
  translateX: number;
  translateY: number;
  width: number;
  height: number;
};

type NavIndicatorState = {
  pose: NavPose;
  gen: number;
  tween: JSAnimation | null;
};

const navStates = new WeakMap<HTMLElement, NavIndicatorState>();

function poseFromTarget(active: HTMLElement): NavPose {
  return {
    translateX: active.offsetLeft,
    translateY: active.offsetTop,
    width: active.offsetWidth,
    height: active.offsetHeight,
  };
}

function writeNavPose(indicator: HTMLElement, pose: NavPose): void {
  indicator.style.transform = `translate(${pose.translateX}px, ${pose.translateY}px)`;
  indicator.style.width = `${pose.width}px`;
  indicator.style.height = `${pose.height}px`;
}

function getNavState(indicator: HTMLElement, fallback: NavPose): NavIndicatorState {
  const current = navStates.get(indicator);
  if (current) {
    return current;
  }

  const state: NavIndicatorState = { pose: fallback, gen: 0, tween: null };
  navStates.set(indicator, state);
  writeNavPose(indicator, fallback);
  return state;
}

export function animateNavIndicator(
  indicator: HTMLElement,
  active: HTMLElement,
  _nav: HTMLElement,
  instant = false,
  onComplete?: () => void,
): JSAnimation | null {
  const to = poseFromTarget(active);
  const state = getNavState(indicator, to);
  const gen = ++state.gen;

  state.tween?.pause();
  state.tween = null;

  const settle = (): void => {
    if (state.gen !== gen) {
      return;
    }

    state.pose = to;
    writeNavPose(indicator, to);
    onComplete?.();
  };

  if (instant || prefersReducedMotion()) {
    settle();
    return null;
  }

  const from = { ...state.pose, t: 0 };
  let handedOff = false;
  const tween = animate(from, {
    translateX: to.translateX,
    translateY: to.translateY,
    width: to.width,
    height: to.height,
    t: 1,
    duration: MOTION.duration.nav,
    ease: MOTION.ease.inOutCubic,
    onRender: () => {
      if (state.gen !== gen) {
        return;
      }

      state.pose = {
        translateX: from.translateX,
        translateY: from.translateY,
        width: from.width,
        height: from.height,
      };
      writeNavPose(indicator, state.pose);

      if (!handedOff && from.t >= 0.58) {
        handedOff = true;
        onComplete?.();
      }
    },
    onComplete: settle,
  });

  state.tween = tween;
  return tween;
}

export function animateNavGlow(
  indicator: HTMLElement,
  options: { enabled?: () => boolean } = {},
): MotionTeardown {
  const enabled = options.enabled ?? (() => !prefersReducedMotion());
  const state = { glow: 0.22 };
  const apply = (): void => {
    indicator.style.setProperty('--nav-glow', state.glow.toFixed(3));
  };

  if (!enabled()) {
    state.glow = 0.24;
    apply();
    return () => indicator.style.removeProperty('--nav-glow');
  }

  apply();
  const tween = animate(state, {
    glow: 0.42,
    duration: 2600,
    ease: MOTION.ease.inOutQuart,
    loop: true,
    alternate: true,
    onRender: apply,
  });

  return () => {
    tween.pause();
    tween.revert();
    indicator.style.removeProperty('--nav-glow');
  };
}

export function animateChartBars(bars: HTMLElement[]): JSAnimation | null {
  if (!bars.length) {
    return null;
  }

  if (prefersReducedMotion()) {
    utils.set(bars, { scaleY: 1 });
    return null;
  }

  utils.set(bars, { scaleY: 0 });
  return animate(bars, {
    scaleY: 1,
    delay: stagger(60),
    duration: MOTION.duration.large,
    ease: MOTION.ease.outExpo,
  });
}

export function pulseElement(el: Element | null): JSAnimation | null {
  if (!el || prefersReducedMotion()) {
    return null;
  }

  killMotion(el);
  return animate(el, {
    scale: [1, 1.1, 1],
    duration: MOTION.duration.component,
    ease: MOTION.ease.outQuart,
  });
}

function settleOnce(callback?: () => void): () => void {
  let settled = false;
  return () => {
    if (settled) {
      return;
    }

    settled = true;
    callback?.();
  };
}

export function animateWorkspaceOut(root: HTMLElement, onComplete?: () => void): Timeline | JSAnimation | null {
  const finish = settleOnce(onComplete);

  if (prefersReducedMotion()) {
    finish();
    return null;
  }

  killMotion(root);
  const animation = animate(root, {
    opacity: 0,
    translateY: 10,
    scale: 0.985,
    duration: MOTION.duration.component,
    ease: MOTION.ease.inOutQuart,
    onComplete: finish,
  });
  window.setTimeout(finish, MOTION.duration.component + 160);
  return animation;
}

export function animateWorkspaceIn(root: HTMLElement, onComplete?: () => void): Timeline | JSAnimation | null {
  const finish = settleOnce(() => {
    revealTargets([root, ...qsa(root, '.card, .qr-item, [data-qr-motion]')]);
    onComplete?.();
  });

  if (prefersReducedMotion()) {
    finish();
    return null;
  }

  killMotion(root);
  utils.set(root, {
    opacity: 0,
    translateY: MOTION.shift.section,
    scale: MOTION.scale.modalFrom,
  });

  const animation = animate(root, {
    opacity: 1,
    translateY: 0,
    scale: 1,
    duration: MOTION.duration.section,
    ease: MOTION.ease.outQuart,
    onComplete: finish,
  });
  window.setTimeout(finish, MOTION.duration.section + 160);
  return animation;
}

export function revealTargets(targets: Element[]): void {
  if (!targets.length) {
    return;
  }

  utils.set(targets, { opacity: 1, translateX: 0, translateY: 0, scale: 1 });
}

export { resetTransform };
