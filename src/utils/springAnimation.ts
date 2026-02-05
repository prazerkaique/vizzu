import { useRef, useCallback } from 'react';

interface SpringConfig {
  stiffness: number;
  damping: number;
  precision: number;
}

export const SPRING = {
  gentle:  { stiffness: 0.08, damping: 0.82, precision: 0.5 },
  snappy:  { stiffness: 0.22, damping: 0.88, precision: 0.5 },
  bounce:  { stiffness: 0.28, damping: 0.68, precision: 0.5 },
} satisfies Record<string, SpringConfig>;

/**
 * Hook that animates a value toward a target using spring physics.
 * Returns [animate(target, config?, onUpdate), cancel].
 */
export function useSpringAnimation() {
  const rafId = useRef(0);
  const velocity = useRef(0);

  const cancel = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
  }, []);

  const animate = useCallback(
    (
      from: number,
      to: number,
      config: SpringConfig,
      onUpdate: (value: number) => void,
      onComplete?: () => void,
      initialVelocity = 0,
    ) => {
      cancel();
      let current = from;
      velocity.current = initialVelocity;

      const step = () => {
        const force = (to - current) * config.stiffness;
        velocity.current = (velocity.current + force) * config.damping;
        current += velocity.current;

        if (
          Math.abs(to - current) < config.precision &&
          Math.abs(velocity.current) < config.precision
        ) {
          onUpdate(to);
          onComplete?.();
          rafId.current = 0;
          return;
        }

        onUpdate(current);
        rafId.current = requestAnimationFrame(step);
      };

      rafId.current = requestAnimationFrame(step);
    },
    [cancel],
  );

  return { animate, cancel } as const;
}
