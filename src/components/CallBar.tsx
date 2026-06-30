import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface CallBarProps {
  peerName: string;
  onExpand: () => void;
  onEnd: () => void;
}

const CallBar: React.FC<CallBarProps> = ({ peerName, onExpand, onEnd }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div onClick={onExpand} style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 48, background: 'linear-gradient(135deg, #10b981, #059669)',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      zIndex: 4000, cursor: 'pointer', gap: 12,
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{flex: 1}}>
        <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{peerName}</div>
        <div style={{fontSize: '0.75rem', opacity: 0.85}}>{formatTime(duration)}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onEnd(); }} style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none',
        background: '#ef4444', color: 'white', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name="phone-down" size={18} />
      </button>
    </div>
  );
};

export default CallBar;
