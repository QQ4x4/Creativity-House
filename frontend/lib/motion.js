/**
 * Scroll animation performance presets.
 * Visual values (y/x/scale amounts, easing curves) are preserved from originals —
 * only duration, stagger, viewport trigger, and GPU hints are tuned.
 */

export const MOTION_EASE = [0.22, 1, 0.36, 1];

export const MOTION_EASE_ALT = [0.25, 0.46, 0.45, 0.94];

/** Primary scroll reveal duration (was 0.65–1s) */
export const SCROLL_DURATION = 1;

/** Per-item stagger (was 0.1–0.15) */
export const SCROLL_STAGGER = 0.06;

/** Container delay before children animate (was 0.1) */
export const SCROLL_DELAY_CHILDREN = 0.04;

/** Early trigger — animation starts before element hits viewport center */
export const motionViewport = { once: true, margin: '-50px' };

export const motionGpu =
  'transform-gpu will-change-[transform,opacity] [backface-visibility:hidden]';

export const fadeUp = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: SCROLL_DURATION,
      delay: i * SCROLL_STAGGER,
      ease: MOTION_EASE,
    },
  }),
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: SCROLL_STAGGER,
      delayChildren: SCROLL_DELAY_CHILDREN,
    },
  },
};

export const scaleUp = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 22,
      delay: i * SCROLL_STAGGER,
    },
  }),
};

export const scaleUpSoft = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 22 },
  },
};

export const scaleUpHero = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: SCROLL_DURATION, type: 'spring', stiffness: 180, damping: 20 },
  },
};

export function makeFadeLeft(isRTL) {
  const xVal = isRTL ? 80 : -80;
  return {
    hidden: { opacity: 0, x: xVal },
    visible: (i = 0) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: SCROLL_DURATION,
        delay: i * SCROLL_STAGGER,
        ease: MOTION_EASE,
      },
    }),
  };
}

export function makeFadeRight(isRTL) {
  const xVal = isRTL ? -80 : 80;
  return {
    hidden: { opacity: 0, x: xVal },
    visible: (i = 0) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: SCROLL_DURATION,
        delay: i * SCROLL_STAGGER,
        ease: MOTION_EASE,
      },
    }),
  };
}

export const fadeUpY30 = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: SCROLL_DURATION, ease: MOTION_EASE_ALT },
  },
};

export const fadeUpY35 = {
  hidden: { opacity: 0, y: 35 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: SCROLL_DURATION, ease: MOTION_EASE_ALT },
  },
};

export const fadeUpY40 = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: SCROLL_DURATION, ease: MOTION_EASE_ALT },
  },
};

export const staggerAlt = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: SCROLL_STAGGER,
      delayChildren: SCROLL_DELAY_CHILDREN,
    },
  },
};

export const fieldReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: SCROLL_DURATION,
      delay: i * SCROLL_STAGGER,
      ease: MOTION_EASE,
    },
  }),
};
