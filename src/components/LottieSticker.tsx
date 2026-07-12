import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

interface LottieStickerProps {
  src: string;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
}

const LottieSticker: React.FC<LottieStickerProps> = ({
  src,
  width = 120,
  height = 120,
  loop = true,
  autoplay = true,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay,
      path: src,
    });
    return () => { animRef.current?.destroy(); };
  }, [src, loop, autoplay]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, ...style }}
    />
  );
};

export default LottieSticker;
