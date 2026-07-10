import React, { useEffect, useState, useRef, useCallback } from 'react';
import Icon from '../Icon';
import './SessionManager.css';

interface SessionManagerProps {
  onOpenScanner: () => void;
  isMobile?: boolean;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  created_at: string;
  is_current: boolean;
  is_new: boolean;
}

const SessionManager: React.FC<SessionManagerProps> = ({ onOpenScanner, isMobile = false }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState(0);
  const [showTerminateAll, setShowTerminateAll] = useState(false);
  const [showQRUpload, setShowQRUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const { default: api } = await import('../../services/api');
      const [sessRes, daysRes] = await Promise.all([
        api.get('/auth/sessions'),
        api.get('/auth/user-active-days').catch(() => ({ data: { days: 0 } })),
      ]);
      setSessions(sessRes.data || []);
      setActiveDays(daysRes.data?.days || 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleTerminate = async (sessionId: string) => {
    try {
      const { default: api } = await import('../../services/api');
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {}
  };

  const handleTerminateAll = async () => {
    try {
      const { default: api } = await import('../../services/api');
      await api.delete('/auth/sessions/all');
      setSessions(prev => prev.filter(s => s.is_current));
      setShowTerminateAll(false);
    } catch {}
  };

  const handleQRFile = async (file: File) => {
    try {
      const jsQR = (await import('jsqr')).default;
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        window.location.href = code.data;
      } else {
        alert('QR-код не распознан');
      }
    } catch {
      alert('Ошибка чтения QR-кода');
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleQRFile(file);
      }
    }
  }, []);

  useEffect(() => {
    if (showQRUpload) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [showQRUpload, handlePaste]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleQRFile(file);
      setShowQRUpload(false);
    }
  }, []);

  const canTerminate = activeDays >= 1;

  const formatTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'только что';
      if (diffMin < 60) return `${diffMin} мин. назад`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `${diffH} ч. назад`;
      const diffD = Math.floor(diffH / 24);
      return `${diffD} дн. назад`;
    } catch {
      return iso;
    }
  };

  const getDeviceIcon = (device: string, browser: string) => {
    const d = (device + browser).toLowerCase();
    if (d.includes('android') || d.includes('mobile') || d.includes('phone')) return 'phone';
    if (d.includes('iphone') || d.includes('ipad') || d.includes('ios')) return 'phone';
    if (d.includes('windows') || d.includes('linux') || d.includes('mac')) return 'settings';
    return 'globe';
  };

  if (loading) {
    return <div className="session-loading">Загрузка...</div>;
  }

  return (
    <div className="session-manager">
      <div className="session-header">
        <h3>Активные сессии</h3>
        <span className="session-count">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="session-empty">
          <Icon name="settings" size={40} />
          <p>Нет активных сессий</p>
        </div>
      ) : (
        <div className="session-list">
          {sessions.map((s) => (
            <div key={s.id} className={`session-item ${s.is_current ? 'current' : ''}`}>
              <div className="session-item-icon">
                <Icon name={getDeviceIcon(s.device, s.browser)} size={24} />
              </div>
              <div className="session-item-info">
                <div className="session-item-device">
                  {s.device || 'Неизвестное устройство'}
                  {s.is_current && <span className="session-current-badge">Текущая</span>}
                </div>
                <div className="session-item-details">
                  {s.browser && <span>{s.browser}</span>}
                  {s.os && <span>{s.os}</span>}
                  {s.ip && s.ip !== '0.0.0.0' && <span>IP: {s.ip}</span>}
                  {s.location && s.location !== 'Unknown' && <span>{s.location}</span>}
                </div>
                <div className="session-item-time">
                  <Icon name="clock" size={12} />
                  <span>{formatTime(s.lastActive || s.created_at)}</span>
                </div>
              </div>
              {canTerminate && !s.is_current && (
                <button
                  className="session-terminate-btn"
                  onClick={() => handleTerminate(s.id)}
                  title="Завершить сессию"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="session-actions">
        {!isMobile && (
          <button className="session-action-btn" onClick={() => setShowQRUpload(true)}>
            <Icon name="qr" size={16} /> Загрузить QR
          </button>
        )}
        {isMobile && (
          <button className="session-action-btn" onClick={onOpenScanner}>
            <Icon name="camera" size={16} /> Сканировать QR
          </button>
        )}
        {canTerminate && sessions.length > 1 && (
          <button className="session-action-btn danger" onClick={() => setShowTerminateAll(true)}>
            <Icon name="trash-2" size={16} /> Завершить все
          </button>
        )}
      </div>

      {!canTerminate && sessions.length > 1 && (
        <div className="session-hint">
          Завершать сессии можно через сутки после регистрации
        </div>
      )}

      {showQRUpload && (
        <div className="session-qr-upload-overlay" onClick={() => setShowQRUpload(false)}>
          <div className="session-qr-upload-modal" onClick={e => e.stopPropagation()}>
            <h3>Загрузка QR-кода</h3>
            <div
              ref={dropZoneRef}
              className="session-qr-dropzone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Icon name="upload" size={48} />
              <p>Перетащите QR-код сюда</p>
              <p className="session-qr-dropzone-hint">или нажмите Ctrl+V для вставки</p>
              <button
                className="session-qr-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Выбрать файл
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleQRFile(file);
                  setShowQRUpload(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {showTerminateAll && (
        <div className="session-terminate-overlay" onClick={() => setShowTerminateAll(false)}>
          <div className="session-terminate-modal" onClick={e => e.stopPropagation()}>
            <Icon name="danger" size={40} />
            <h3>Завершить все сессии?</h3>
            <p>Вы будете разлогинены на всех устройствах, кроме текущего</p>
            <div className="session-terminate-actions">
              <button className="session-terminate-cancel" onClick={() => setShowTerminateAll(false)}>
                Отмена
              </button>
              <button className="session-terminate-confirm" onClick={handleTerminateAll}>
                Завершить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;
