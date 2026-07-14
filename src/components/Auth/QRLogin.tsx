import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/api';
import { saveSession } from '../../services/cookies';
import Icon from '../Icon';

interface QRLoginProps {
  onClose: () => void;
}

const QRLogin: React.FC<QRLoginProps> = ({ onClose }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string>('');
  const [status, setStatus] = useState<'waiting' | 'scanning' | 'confirmed' | 'expired'>('waiting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    createSession();
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const createSession = async () => {
    if (!mountedRef.current) return;
    try {
      const res = await apiClient.post('/auth/qr/create');
      if (!mountedRef.current) return;
      setSessionId(res.data.session_id);
      setQrLink(res.data.qr_link);
      setStatus('waiting');
      setLoading(false);
      checkStatus(res.data.session_id);
    } catch (err) {
      if (!mountedRef.current) return;
      setError('Не удалось создать QR-сессию');
      setLoading(false);
    }
  };

  const checkStatus = async (sid: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!mountedRef.current) {
        clearInterval(intervalRef.current!);
        return;
      }
      try {
        const res = await apiClient.get(`/auth/qr/status/${sid}`);
        if (!mountedRef.current) return;
        setStatus(res.data.status);
        
        if (res.data.status === 'confirmed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          try {
            const tokenRes = await apiClient.post('/auth/qr/confirm', { 
              session_id: sid, 
              device_name: navigator.userAgent || 'Mobile' 
            });
            if (!mountedRef.current) return;
            if (tokenRes.data.access_token) {
              await saveSession(tokenRes.data.access_token, tokenRes.data.user || {}, tokenRes.data.refresh_token);
              onClose();
              setTimeout(() => { window.location.href = '/'; }, 100);
            } else if (tokenRes.data.token) {
              await saveSession(tokenRes.data.token, tokenRes.data.user || {}, tokenRes.data.refresh_token);
              onClose();
              setTimeout(() => { window.location.href = '/'; }, 100);
            }
          } catch (e) {
            console.error('QR confirm error:', e);
          }
        } else if (res.data.status === 'expired') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (mountedRef.current) setError('Сессия истекла');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="qr-login-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>QR вход</h2>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="qr-login-body">
            <BlobLoader size={40} />
            <p>Создание QR-кода...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="qr-login-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>QR вход</h2>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="qr-login-body">
            <div className="error-icon">⚠️</div>
            <p className="error-text">{error}</p>
            <button className="retry-btn" onClick={() => { setError(null); setLoading(true); createSession(); }}>Попробовать снова</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-login-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>QR вход</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="qr-login-body">
          <div className="qr-code-container">
            <div className="qr-code-wrapper">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrLink)}`} 
                alt="QR Code" 
              />
            </div>
            <p className="qr-hint">
              Отсканируйте QR-код в разделе<br />
              <strong>Настройки → Устройства → Сканировать QR</strong>
            </p>
            <div className="qr-status">
              Статус: {status === 'waiting' && 'Ожидание сканирования...'}
              {status === 'scanning' && 'Сканирование...'}
              {status === 'confirmed' && '✅ Подтверждено!'}
              {status === 'expired' && '❌ Истекло'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import BlobLoader from '../BlobLoader';

export default QRLogin;
