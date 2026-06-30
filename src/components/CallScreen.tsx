import React, { useState, useEffect, useRef } from 'react';
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
  isIncoming?: boolean;
  onAccept?: () => void;
}

const CallScreen: React.FC<CallScreenProps> = ({ peerName, peerAvatar, isVideo, onEnd, onMinimize, participants = [], isIncoming, onAccept }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [isRinging, setIsRinging] = useState(!!isIncoming);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRinging) return;
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isRinging]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `call-recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        stream.getVideoTracks()[0].onended = () => {
          recorder.stop();
          setIsRecording(false);
        };
      } catch (e) {
        console.error('Screen recording error:', e);
      }
    }
  };

  const allParticipants = [
    { id: 0, name: 'Вы', isMuted, isCameraOff },
    ...participants,
  ];

  const getCardSize = () => {
    if (allParticipants.length <= 2) return { w: 160, h: 160, avatar: 70, fontSize: '1.5rem' };
    if (allParticipants.length <= 4) return { w: 130, h: 130, avatar: 55, fontSize: '1.2rem' };
    return { w: 110, h: 110, avatar: 45, fontSize: '1rem' };
  };

  const cardSize = getCardSize();

  if (isRinging) {
    return (
      <div style={{position: 'fixed', inset: 0, zIndex: 5000, background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: 24}}>
        <div style={{width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(245,158,11,0.4)', animation: 'pulse 1.5s infinite'}}>
          {peerAvatar ? <img src={peerAvatar} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : <span style={{fontSize: '2.5rem', fontWeight: 700}}>{peerName.charAt(0)}</span>}
        </div>
        <h2 style={{margin: 0}}>{peerName}</h2>
        <p style={{opacity: 0.6}}>Входящий звонок...</p>
        <div style={{display: 'flex', gap: 20}}>
          <button onClick={onEnd} style={{width: 64, height: 64, borderRadius: '50%', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.4)'}}>
            <Icon name="phone-down" size={28} />
          </button>
          <button onClick={() => { setIsRinging(false); onAccept?.(); }} style={{width: 64, height: 64, borderRadius: '50%', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(16,185,129,0.4)'}}>
            <Icon name="phone" size={28} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{position: 'fixed', inset: 0, zIndex: 5000, background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', flexDirection: 'column', color: 'white'}}>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20}}>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center'}}>
          {allParticipants.map((p) => (
            <div key={p.id} style={{width: cardSize.w, height: cardSize.h, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative'}}>
              <div style={{width: cardSize.avatar, height: cardSize.avatar, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {p.avatar ? <img src={p.avatar} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : <span style={{fontSize: cardSize.fontSize, fontWeight: 700}}>{p.name.charAt(0)}</span>}
              </div>
              <span style={{fontSize: '0.75rem', opacity: 0.8}}>{p.name}</span>
              {p.isMuted && <div style={{position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="volume-off" size={10} /></div>}
            </div>
          ))}
        </div>
        <h2 style={{margin: 0, fontSize: '1.1rem'}}>{formatTime(duration)}</h2>
        {isRecording && <p style={{color: '#ef4444', fontSize: '0.8rem', margin: 0}}>● Запись</p>}
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

        <button onClick={toggleRecording} style={{width: 48, height: 48, borderRadius: '50%', border: 'none', background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
