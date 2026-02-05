import React, { useRef, useCallback, useEffect } from 'react';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  onDismiss?: () => void;
  onDismissDrag?: (y: number) => void;
  onScaleChange?: (scale: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DBL_TAP_MS = 300;
const DBL_TAP_ZOOM = 2.5;
const DISMISS_PX = 100;

function touchDist(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function ZoomableImage({
  src,
  alt = '',
  className = '',
  onDismiss,
  onDismissDrag,
  onScaleChange,
}: ZoomableImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // All mutable state in refs — callbacks in refs so native listeners see latest
  const callbacksRef = useRef({ onDismiss, onDismissDrag, onScaleChange });
  callbacksRef.current = { onDismiss, onDismissDrag, onScaleChange };

  const tf = useRef({ s: 1, x: 0, y: 0 });
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 });
  const dragRef = useRef({ active: false, sx: 0, sy: 0, tfx: 0, tfy: 0 });
  const tapRef = useRef({ ts: 0, x: 0, y: 0 });
  const dismissRef = useRef(false);

  const apply = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const { s, x, y } = tf.current;
    el.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
  }, []);

  const setTf = useCallback((s: number, x: number, y: number) => {
    tf.current = { s, x, y };
    apply();
    callbacksRef.current.onScaleChange?.(s);
  }, [apply]);

  const clampPan = useCallback((x: number, y: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return { x, y };
    const mx = Math.max(0, (r.width * s - r.width) / 2);
    const my = Math.max(0, (r.height * s - r.height) / 2);
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }, []);

  const animTo = useCallback((ts: number, tx: number, ty: number, dur = 250) => {
    const { s: s0, x: x0, y: y0 } = tf.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setTf(s0 + (ts - s0) * ease, x0 + (tx - x0) * ease, y0 + (ty - y0) * ease);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [setTf]);

  // Reset on src change
  useEffect(() => { setTf(1, 0, 0); }, [src, setTf]);

  // ─── All touch + wheel via native listeners (non-passive) ───
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches;
      if (t.length === 2) {
        pinchRef.current = { active: true, startDist: touchDist(t[0], t[1]), startScale: tf.current.s };
        dragRef.current.active = false;
        dismissRef.current = false;
      } else if (t.length === 1) {
        dragRef.current = { active: true, sx: t[0].clientX, sy: t[0].clientY, tfx: tf.current.x, tfy: tf.current.y };
        dismissRef.current = tf.current.s <= 1.05 && !!callbacksRef.current.onDismiss;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // THIS works because listener is { passive: false }
      const t = e.touches;

      if (pinchRef.current.active && t.length >= 2) {
        const d = touchDist(t[0], t[1]);
        const ratio = pinchRef.current.startDist > 0 ? d / pinchRef.current.startDist : 1;
        const ns = Math.max(0.8, Math.min(MAX_SCALE * 1.1, pinchRef.current.startScale * ratio));
        setTf(ns, tf.current.x, tf.current.y);
        return;
      }

      if (dragRef.current.active && t.length === 1) {
        const dx = t[0].clientX - dragRef.current.sx;
        const dy = t[0].clientY - dragRef.current.sy;

        if (dismissRef.current) {
          setTf(tf.current.s, 0, dy);
          callbacksRef.current.onDismissDrag?.(dy);
          return;
        }

        if (tf.current.s > 1.05) {
          setTf(tf.current.s, dragRef.current.tfx + dx, dragRef.current.tfy + dy);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Pinch end
      if (pinchRef.current.active) {
        pinchRef.current.active = false;
        const { s, x, y } = tf.current;
        if (s < MIN_SCALE) { animTo(MIN_SCALE, 0, 0); }
        else if (s > MAX_SCALE) { const c = clampPan(x, y, MAX_SCALE); animTo(MAX_SCALE, c.x, c.y); }
        else { const c = clampPan(x, y, s); if (c.x !== x || c.y !== y) animTo(s, c.x, c.y, 200); }
        return;
      }

      // Dismiss end
      if (dismissRef.current) {
        dismissRef.current = false;
        dragRef.current.active = false;
        if (Math.abs(tf.current.y) > DISMISS_PX) {
          callbacksRef.current.onDismiss?.();
        } else {
          callbacksRef.current.onDismissDrag?.(0);
          animTo(tf.current.s, 0, 0, 200);
        }
        return;
      }

      // Pan end
      if (dragRef.current.active) {
        dragRef.current.active = false;
        const { s, x, y } = tf.current;
        const c = clampPan(x, y, s);
        if (c.x !== x || c.y !== y) animTo(s, c.x, c.y, 200);
      }

      // Double-tap
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const ct = e.changedTouches[0];
        const now = Date.now();
        const moved = Math.hypot(ct.clientX - dragRef.current.sx, ct.clientY - dragRef.current.sy);
        if (moved > 15) { tapRef.current = { ts: 0, x: 0, y: 0 }; return; }

        const prev = tapRef.current;
        if (now - prev.ts < DBL_TAP_MS && Math.hypot(ct.clientX - prev.x, ct.clientY - prev.y) < 30) {
          tapRef.current = { ts: 0, x: 0, y: 0 };
          if (tf.current.s > 1.1) {
            animTo(1, 0, 0, 280);
          } else {
            const r = el.getBoundingClientRect();
            const ox = ct.clientX - r.left;
            const oy = ct.clientY - r.top;
            animTo(DBL_TAP_ZOOM, (r.width / 2 - ox) * (DBL_TAP_ZOOM - 1), (r.height / 2 - oy) * (DBL_TAP_ZOOM - 1), 280);
          }
        } else {
          tapRef.current = { ts: now, x: ct.clientX, y: ct.clientY };
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { s, x, y } = tf.current;
      const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * (e.deltaY > 0 ? 0.95 : 1.05)));
      if (ns <= 1) setTf(1, 0, 0);
      else { const c = clampPan(x, y, ns); setTf(ns, c.x, c.y); }
    };

    // { passive: false } is CRITICAL for preventDefault to work on iOS
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [setTf, clampPan, animTo]);

  return (
    <div
      ref={wrapRef}
      className={'relative overflow-hidden ' + className}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none select-none"
        style={{ transformOrigin: 'center center', willChange: 'transform' }}
      />
    </div>
  );
}
