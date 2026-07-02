import React from 'react';

const GooSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{display: 'none'}}>
    <defs>
      <filter id="goo">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" result="goo" />
        <feBlend in="SourceGraphic" in2="goo" />
      </filter>
    </defs>
  </svg>
);

const BlobLoader: React.FC<{ size?: number }> = ({ size = 140 }) => {
  const s = size;
  const dot = Math.round(s * 0.114);
  const radius = s / 2;
  return (
    <div className="blob-loader-wrap" style={{width: s, height: s}}>
      <GooSvg />
      <div className="blob-loader" style={{width: s, height: s, borderRadius: radius}}>
        <div className="blob-center" style={{width: dot, height: dot}} />
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="blob" style={{width: dot, height: dot}} />
        ))}
      </div>
    </div>
  );
};

export default BlobLoader;
