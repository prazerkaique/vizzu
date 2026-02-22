import React, { useEffect, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface Props {
  name: string;
  onDone: () => void;
}

export const WelcomeScreen: React.FC<Props> = ({ name, onDone }) => {
  const stableOnDone = useCallback(onDone, []);

  // Auto-advance after the animation plays
  useEffect(() => {
    const timer = setTimeout(() => {
      stableOnDone();
    }, 6500);

    return () => clearTimeout(timer);
  }, [stableOnDone]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center bg-white">
      {/* Logo no topo */}
      <div className="mt-16 sm:mt-24">
        <img src="/Logo2Black.png" alt="Vizzu" className="h-8" />
      </div>

      {/* Lottie motion — mais próximo do logo */}
      <div className="mt-8 sm:mt-12">
        <div className="w-64 h-64 sm:w-80 sm:h-80">
          <DotLottieReact
            src="/Welcome.json"
            autoplay
            speed={1.5}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
