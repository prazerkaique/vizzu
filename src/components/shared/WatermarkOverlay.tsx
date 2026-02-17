/**
 * Overlay visual de marca d'água Vizzu.
 * Renderiza o ícone Vizzu em padrão repetido diagonal semi-transparente.
 * Usar sobre imagens geradas quando plano = free.
 */
export function WatermarkOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-10"
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-50%] w-[200%] h-[200%]"
        style={{
          transform: 'rotate(-30deg)',
          backgroundImage: 'url(/vizzu-icon-white.png)',
          backgroundSize: '80px 80px',
          backgroundRepeat: 'repeat',
          opacity: 0.12,
        }}
      />
    </div>
  );
}
