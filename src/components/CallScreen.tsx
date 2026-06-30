import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface Participant {
  id: number;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isCameraOff: boolean;
}

interface CallScreenProps {
  peerName: string;
  peerAvatar?: string;
  isVideo: boolean;
  onEnd: () => void;
  onMinimize: () => void;
  participants?: Participant[];
}

const CallScreen: React.FC<CallScreenProps> = ({ peerName, peerAvatar, isVideo, onEnd, onMinimize, participants = [] }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const allParticipants = [
    { id: 0, name: 'Вы', isMuted, isCameraOff },
    ...participants,
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      display: 'flex', flexDirection: 'column', color: 'white',
    }}>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20}}>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center'}}>
          {allParticipants.map((p) => (
            <div key={p.id} style={{
              width: allParticipants.length > 2 ? 120 : 160,
              height: allParticipants.length > 2 ? 120 : 160,
              borderRadius: 20, background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              position: 'relative',
            }}>
              <div style={{width: allParticipants.length > 2 ? 50 : 70, height: allParticipants.length > 2 ? 50 : 70, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {p.avatar ? <img src={p.avatar} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : <span style={{fontSize: allParticipants.length > 2 ? '1.2rem' : '1.5rem', fontWeight: 700}}>{p.name.charAt(0)}</span>}
              </div>
              <span style={{fontSize: '0.75rem', opacity: 0.8}}>{p.name}</span>
              {p.isMuted && <div style={{position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="volume-off" size={10} /></div>}
            </div>
          ))}
        </div>
        <h2 style={{margin: 0, fontSize: '1.1rem'}}>{formatTime(duration)}</h2>
      </div>

      <div style={{display: 'flex', justifyContent: 'center', gap: 12, padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', flexWrap: 'wrap'}}>
        <button onClick={() => setIsMuted(!isMuted)} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={isMuted ? 'volume-off' : 'mic'} size={20} />
        </button>

        {isVideo && (
          <button onClick={() => setIsCameraOff(!isCameraOff)} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: isCameraOff ? '#ef4444' : 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name={isCameraOff ? 'video' : 'camera'} size={20} />
          </button>
        )}

        <button onClick={() => setIsScreenSharing(!isScreenSharing)} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: isScreenSharing ? '#3b82f6' : 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name="maximize" size={20} />
        </button>

        <button onClick={() => setIsRecording(!isRecording)} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={isRecording ? 'square' : 'circle'} size={20} />
        </button>

        <button onClick={() => setShowInvite(!showInvite)} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name="userplus" size={20} />
        </button>

        <button onClick={onEnd} style={{width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.4)'}}>
          <Icon name="phone-down" size={24} />
        </button>

        <button onClick={onMinimize} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name="minimize" size={20} />
        </button>
      </div>
    </div>
  );
};

export default CallScreen;
