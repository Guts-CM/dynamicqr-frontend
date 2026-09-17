export const MOTION = {
  duration: {
    micro: 180,
    component: 320,
    nav: 520,
    section: 520,
    large: 720,
  },
  ease: {
    outExpo: 'outExpo',
    outQuart: 'outQuart',
    inOutQuart: 'inOutQuart',
    inOutCubic: 'inOutCubic',
    outCubic: 'outCubic',
  },
  scale: {
    buttonHover: 1.02,
    buttonPress: 0.985,
    cardHover: 1.01,
    modalFrom: 0.97,
    dropdownFrom: 0.98,
  },
  shift: {
    icon: 3,
    card: -2,
    button: -1.5,
    section: 12,
    dropdown: -8,
    modal: 12,
    list: 10,
    row: 3,
  },
  glass: {
    edge: 16,
    edgeHover: 20,
    edgeInteractive: 24,
    shine: 12,
    shineHover: 14,
    shineInteractive: 16,
  },
} as const;

export type MotionIconHint =
  | 'arrow'
  | 'back'
  | 'download'
  | 'plus'
  | 'menu'
  | 'search'
  | 'logout'
  | 'copy'
  | 'none';

export const MOTION_ICON_SHIFT: Record<
  MotionIconHint,
  { x?: number; y?: number; rotate?: number; scale?: number }
> = {
  arrow: { x: MOTION.shift.icon },
  back: { x: -MOTION.shift.icon },
  download: { y: MOTION.shift.icon },
  plus: { rotate: 14, scale: 1.08 },
  menu: { y: 2 },
  search: { scale: 1.08 },
  logout: { x: MOTION.shift.icon },
  copy: { scale: 1.08 },
  none: {},
};
