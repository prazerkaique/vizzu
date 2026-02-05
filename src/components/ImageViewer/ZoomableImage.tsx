import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { useSpringAnimation, SPRING } from '../../utils/springAnimation';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** Called when user swipes down at 1x scale (dismiss gesture) */
  onDismiss?: () => void;
  /** Callback with current scale (for dimming background, etc.) */
  onScaleChange?: (scale: number) => void;
  /** Callback with Y translation during dismiss drag */
  onDismissDrag?: (translateY: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 10;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 500;

export function ZoomableImage({
  src,
  alt = '',
  className = '',
  onDismiss,
  onScaleChange,
  onDismissDrag,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  // Refs for gesture calculations (avoid stale closures)
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });
  const isDismissingRef = useRef(false);

  const springScale = useSpringAnimation();
  const springX = useSpringAnimation();
  const springY = useSpringAnimation();

  // Sync refs with state
  const updateTransform = useCallback(
    (s: number, tx: number, ty: number, ox?: number, oy?: number) => {
      scaleRef.current = s;
      translateRef.current = { x: tx, y: ty };
      setScale(s);
      setTranslate({ x: tx, y: ty });
      if (ox !== undefined && oy !== undefined) {
        originRef.current = { x: ox, y: oy };
        setOrigin({ x: ox, y: oy });
      }
      onScaleChange?.(s);
    },
    [onScaleChange],
  );

  const resetZoom = useCallback(() => {
    springScale.cancel();
    springX.cancel();
    springY.cancel();
    updateTransform(1, 0, 0, 0, 0);
  }, [springScale, springX, springY, updateTransform]);

  // Clamp translate so the image doesn't go past edges
  const clampTranslate = useCallback(
    (tx: number, ty: number, s: number) => {
      if (s <= 1) return { x: 0, y: 0 };
      const container = containerRef.current;
      if (!container) return { x: tx, y: ty };

      const rect = container.getBoundingClientRect();
      const imgW = rect.width * s;
      const imgH = rect.height * s;
      const maxX = Math.max(0, (imgW - rect.width) / 2);
      const maxY = Math.max(0, (imgH - rect.height) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, tx)),
        y: Math.max(-maxY, Math.min(maxY, ty)),
      };
    },
    [],
  );

  // Animate to target with spring
  const animateTo = useCallback(
    (targetScale: number, targetX: number, targetY: number, config = SPRING.snappy) => {
      const s0 = scaleRef.current;
      const x0 = translateRef.current.x;
      const y0 = translateRef.current.y;

      const clamped = clampTranslate(targetX, targetY, targetScale);

      springScale.animate(s0, targetScale, config, (s) => {
        const progress = s0 === targetScale ? 1 : (s - s0) / (targetScale - s0);
        const tx = x0 + (clamped.x - x0) * progress;
        const ty = y0 + (clamped.y - y0) * progress;
        updateTransform(s, tx, ty);
      });
    },
    [springScale, clampTranslate, updateTransform],
  );

  // Double-tap handler
  const handleDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      if (scaleRef.current > 1.05) {
        // Zoom out to 1x
        animateTo(1, 0, 0);
      } else {
        // Zoom in to 2.5x centered on tap
        const ox = clientX - rect.left;
        const oy = clientY - rect.top;
        // Center the tapped point in the viewport
        const tx = (rect.width / 2 - ox) * (DOUBLE_TAP_SCALE - 1);
        const ty = (rect.height / 2 - oy) * (DOUBLE_TAP_SCALE - 1);
        originRef.current = { x: rect.width / 2, y: rect.height / 2 };
        setOrigin({ x: rect.width / 2, y: rect.height / 2 });
        animateTo(DOUBLE_TAP_SCALE, tx, ty);
      }
    },
    [animateTo],
  );

  // Reset when src changes
  useEffect(() => {
    resetZoom();
  }, [src, resetZoom]);

  useGesture(
    {
      onPinch: ({ offset: [s], origin: [ox, oy], first, memo }) => {
        if (first) {
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const localOx = ox - rect.left;
            const localOy = oy - rect.top;
            originRef.current = { x: localOx, y: localOy };
            setOrigin({ x: localOx, y: localOy });
            memo = { startTx: translateRef.current.x, startTy: translateRef.current.y };
          }
        }

        const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
        updateTransform(clampedScale, translateRef.current.x, translateRef.current.y);
        return memo;
      },
      onPinchEnd: () => {
        const s = scaleRef.current;
        if (s < MIN_SCALE) {
          animateTo(MIN_SCALE, 0, 0, SPRING.bounce);
        } else if (s > MAX_SCALE) {
          const clamped = clampTranslate(translateRef.current.x, translateRef.current.y, MAX_SCALE);
          animateTo(MAX_SCALE, clamped.x, clamped.y, SPRING.bounce);
        } else {
          // Clamp translate within bounds
          const clamped = clampTranslate(translateRef.current.x, translateRef.current.y, s);
          if (
            clamped.x !== translateRef.current.x ||
            clamped.y !== translateRef.current.y
          ) {
            animateTo(s, clamped.x, clamped.y, SPRING.bounce);
          }
        }
      },

      onDrag: ({ movement: [mx, my], velocity: [, vy], direction: [, dy], first, memo, cancel, tap, event }) => {
        if (tap) {
          // Double-tap detection
          const now = Date.now();
          const pos = 'clientX' in event ? event as PointerEvent : null;
          const cx = pos?.clientX ?? 0;
          const cy = pos?.clientY ?? 0;

          if (
            now - lastTapRef.current < DOUBLE_TAP_MS &&
            Math.abs(cx - lastTapPosRef.current.x) < 30 &&
            Math.abs(cy - lastTapPosRef.current.y) < 30
          ) {
            handleDoubleTap(cx, cy);
            lastTapRef.current = 0;
          } else {
            lastTapRef.current = now;
            lastTapPosRef.current = { x: cx, y: cy };
          }
          return;
        }

        const currentScale = scaleRef.current;

        if (first) {
          isDismissingRef.current = currentScale <= 1.05;
          memo = {
            startTx: translateRef.current.x,
            startTy: translateRef.current.y,
          };
        }

        if (isDismissingRef.current && onDismiss) {
          // Dismiss mode: swipe down to close
          const dismissY = my;
          updateTransform(currentScale, 0, dismissY);
          onDismissDrag?.(dismissY);
          return memo;
        }

        // Pan mode (when zoomed in)
        if (currentScale > 1.05) {
          const tx = (memo?.startTx ?? 0) + mx;
          const ty = (memo?.startTy ?? 0) + my;
          updateTransform(currentScale, tx, ty);
        }

        return memo;
      },
      onDragEnd: ({ movement: [, my], velocity: [, vy] }) => {
        if (isDismissingRef.current && onDismiss) {
          isDismissingRef.current = false;
          if (Math.abs(my) > DISMISS_THRESHOLD || Math.abs(vy) > DISMISS_VELOCITY / 1000) {
            onDismiss();
          } else {
            // Spring back
            onDismissDrag?.(0);
            animateTo(scaleRef.current, 0, 0, SPRING.bounce);
          }
          return;
        }

        // Clamp pan within bounds
        const s = scaleRef.current;
        const clamped = clampTranslate(translateRef.current.x, translateRef.current.y, s);
        if (
          clamped.x !== translateRef.current.x ||
          clamped.y !== translateRef.current.y
        ) {
          animateTo(s, clamped.x, clamped.y, SPRING.bounce);
        }
      },

      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const factor = dy > 0 ? 0.95 : 1.05;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * factor));

        if (newScale <= 1) {
          updateTransform(1, 0, 0);
        } else {
          const clamped = clampTranslate(translateRef.current.x, translateRef.current.y, newScale);
          updateTransform(newScale, clamped.x, clamped.y);
        }
      },
    },
    {
      target: containerRef,
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: { scaleBounds: { min: 0.5, max: MAX_SCALE + 2 }, rubberband: true },
      wheel: { eventOptions: { passive: false } },
    },
  );

  return (
    <div
      ref={containerRef}
      className={'relative overflow-hidden ' + className}
      style={{ touchAction: 'none' }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className="w-full h-full object-contain select-none"
        style={{
          transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
          transformOrigin: `${origin.x}px ${origin.y}px`,
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
        }}
      />
    </div>
  );
}
