import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  onDismiss?: () => void;
  onScaleChange?: (scale: number) => void;
  onDismissDrag?: (translateY: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const DISMISS_THRESHOLD = 100;

export function ZoomableImage({
  src,
  alt = '',
  className = '',
  onDismiss,
  onScaleChange,
  onDismissDrag,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for transform to avoid stale closures in gesture handlers
  const stateRef = useRef({ scale: 1, x: 0, y: 0 });
  const [, forceRender] = useState(0);

  const lastTapRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });
  const isDismissingRef = useRef(false);
  const pinchOriginRef = useRef({ x: 0, y: 0 });
  const initialPinchScaleRef = useRef(1);

  const applyTransform = useCallback(() => {
    const el = containerRef.current?.querySelector('img') as HTMLImageElement | null;
    if (!el) return;
    const { scale, x, y } = stateRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  const setTransform = useCallback((scale: number, x: number, y: number) => {
    stateRef.current = { scale, x, y };
    applyTransform();
    onScaleChange?.(scale);
  }, [applyTransform, onScaleChange]);

  const animateTo = useCallback((targetScale: number, targetX: number, targetY: number, duration = 250) => {
    const start = { ...stateRef.current };
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const t = 1 - Math.pow(1 - progress, 3);

      const s = start.scale + (targetScale - start.scale) * t;
      const x = start.x + (targetX - start.x) * t;
      const y = start.y + (targetY - start.y) * t;
      setTransform(s, x, y);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        forceRender(n => n + 1);
      }
    };
    requestAnimationFrame(step);
  }, [setTransform]);

  const clampPan = useCallback((x: number, y: number, scale: number) => {
    if (scale <= 1) return { x: 0, y: 0 };
    const el = containerRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * scale - rect.width) / 2);
    const maxY = Math.max(0, (rect.height * scale - rect.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Reset when src changes
  useEffect(() => {
    stateRef.current = { scale: 1, x: 0, y: 0 };
    applyTransform();
    forceRender(n => n + 1);
  }, [src, applyTransform]);

  const bind = useGesture(
    {
      onPinch: ({ first, da: [d], origin: [ox, oy], memo }) => {
        if (first) {
          initialPinchScaleRef.current = stateRef.current.scale;
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            pinchOriginRef.current = { x: ox - rect.left, y: oy - rect.top };
          }
          memo = { startX: stateRef.current.x, startY: stateRef.current.y, startD: d };
        }

        const startD = memo?.startD || d;
        const ratio = startD > 0 ? d / startD : 1;
        const newScale = Math.max(0.5, Math.min(MAX_SCALE * 1.2, initialPinchScaleRef.current * ratio));

        setTransform(newScale, stateRef.current.x, stateRef.current.y);
        return memo;
      },

      onPinchEnd: () => {
        const { scale, x, y } = stateRef.current;
        if (scale < MIN_SCALE) {
          animateTo(MIN_SCALE, 0, 0);
        } else if (scale > MAX_SCALE) {
          const clamped = clampPan(x, y, MAX_SCALE);
          animateTo(MAX_SCALE, clamped.x, clamped.y);
        } else {
          const clamped = clampPan(x, y, scale);
          if (clamped.x !== x || clamped.y !== y) {
            animateTo(scale, clamped.x, clamped.y, 200);
          }
        }
      },

      onDrag: ({ first, movement: [mx, my], tap, event, memo }) => {
        if (tap) {
          const now = Date.now();
          const pe = event as PointerEvent;
          const cx = pe.clientX ?? 0;
          const cy = pe.clientY ?? 0;

          if (
            now - lastTapRef.current < DOUBLE_TAP_MS &&
            Math.abs(cx - lastTapPosRef.current.x) < 30 &&
            Math.abs(cy - lastTapPosRef.current.y) < 30
          ) {
            // Double-tap
            lastTapRef.current = 0;
            const { scale } = stateRef.current;
            if (scale > 1.1) {
              animateTo(1, 0, 0, 300);
            } else {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                const ox = cx - rect.left;
                const oy = cy - rect.top;
                const tx = (rect.width / 2 - ox) * (DOUBLE_TAP_SCALE - 1);
                const ty = (rect.height / 2 - oy) * (DOUBLE_TAP_SCALE - 1);
                animateTo(DOUBLE_TAP_SCALE, tx, ty, 300);
              }
            }
          } else {
            lastTapRef.current = now;
            lastTapPosRef.current = { x: cx, y: cy };
          }
          return;
        }

        const { scale } = stateRef.current;

        if (first) {
          isDismissingRef.current = scale <= 1.05 && !!onDismiss;
          memo = { startX: stateRef.current.x, startY: stateRef.current.y };
        }

        if (isDismissingRef.current) {
          setTransform(scale, 0, my);
          onDismissDrag?.(my);
          return memo;
        }

        if (scale > 1.05) {
          const tx = (memo?.startX ?? 0) + mx;
          const ty = (memo?.startY ?? 0) + my;
          setTransform(scale, tx, ty);
        }

        return memo;
      },

      onDragEnd: ({ movement: [, my], velocity: [, vy] }) => {
        if (isDismissingRef.current) {
          isDismissingRef.current = false;
          if (Math.abs(my) > DISMISS_THRESHOLD || vy > 0.5) {
            onDismiss?.();
          } else {
            onDismissDrag?.(0);
            animateTo(stateRef.current.scale, 0, 0, 200);
          }
          return;
        }

        const { scale, x, y } = stateRef.current;
        const clamped = clampPan(x, y, scale);
        if (clamped.x !== x || clamped.y !== y) {
          animateTo(scale, clamped.x, clamped.y, 200);
        }
      },

      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const { scale, x, y } = stateRef.current;
        const factor = dy > 0 ? 0.95 : 1.05;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
        if (newScale <= 1) {
          setTransform(1, 0, 0);
        } else {
          const clamped = clampPan(x, y, newScale);
          setTransform(newScale, clamped.x, clamped.y);
        }
        forceRender(n => n + 1);
      },
    },
    {
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: { pointer: { touch: true } },
      wheel: { eventOptions: { passive: false } },
    },
  );

  return (
    <div
      {...bind()}
      ref={containerRef}
      className={'relative overflow-hidden ' + className}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none"
        style={{
          transform: `translate3d(${stateRef.current.x}px, ${stateRef.current.y}px, 0) scale(${stateRef.current.scale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
