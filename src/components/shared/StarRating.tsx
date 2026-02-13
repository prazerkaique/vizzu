import { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// StarRating — 5 estrelas com hover preview + fill animation
// Gradiente coral→laranja na seleção, FontAwesome icons
// ═══════════════════════════════════════════════════════════════

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'default' | 'compact';
}

export function StarRating({ value, onChange, size = 'default' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const [animating, setAnimating] = useState(0);

  const handleClick = useCallback((star: number) => {
    onChange(star);
    setAnimating(star);
    setTimeout(() => setAnimating(0), 250);
  }, [onChange]);

  const sizeClass = size === 'compact' ? 'text-xl' : 'text-2xl';

  return (
    <div
      className="inline-flex gap-2"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || value);
        const isAnimating = star <= animating;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHovered(star)}
            className={
              'transition-all duration-200 cursor-pointer select-none ' +
              sizeClass + ' ' +
              (isAnimating ? 'scale-[1.2] ' : 'scale-100 ') +
              (isFilled
                ? hovered && !value ? 'text-[#FF9F43]/70' : 'text-[#FF9F43]'
                : 'text-neutral-500/40 hover:text-neutral-400/60')
            }
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
          >
            <i className={isFilled ? 'fas fa-star' : 'far fa-star'} />
          </button>
        );
      })}
    </div>
  );
}
