import React, { useState, useEffect, useRef } from 'react';
import { animate } from 'animejs';
import apiClient from '../services/api';
import { getSession } from '../services/cookies';

const QUARKPAY_DOMAIN = 'https://f1w6ggb2-5174.euw.devtunnels.ms';

interface ConnectPageProps {
  code: string;
  onConnected: () => void;
}

const ConnectPage: React.FC<ConnectPageProps> = ({ code, onConnected }) => {
  const [status, setStatus] = useState<'loading' | 'confirm' | 'linking' | 'success' | 'error' | 'login_required'>('loading');
  const [error, setError] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [myUserId, setMyUserId] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession().then(session => {
      if (session && session.user) {
        setMyUsername(session.user.username);
        setMyUserId(session.user.id);
        setStatus('confirm');
        if (cardRef.current) {
          animate(cardRef.current, {
            translate: ['40px 0', '0px 0'],
            opacity: [0, 1],
            duration: 400,
            ease: 'outCubic',
          });
        }
      } else {
        setStatus('login_required');
        if (cardRef.current) {
          animate(cardRef.current, {
            translate: ['40px 0', '0px 0'],
            opacity: [0, 1],
            duration: 400,
            ease: 'outCubic',
          });
        }
      }
    });
  }, [code]);

  const handleConfirm = async () => {
    setStatus('linking');
    try {
      const res = await apiClient.post('/payment/quarkpay-confirm-connect', {
        connect_code: code,
      });
      if (res.data?.status === 'connected') {
        try {
          await apiClient.post('/payment/quarkpay-auto-register', {
            connect_code: code,
            monogram_user_id: myUserId,
            monogram_username: myUsername,
          });
        } catch {}

        setStatus('success');
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#059669', '#34d399'] });
        } catch {}
        setTimeout(() => onConnected(), 2000);
      } else {
        setStatus('error');
        setError('Не удалось связать аккаунты');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.response?.data?.detail || 'Ошибка подключения');
    }
  };

  const handleLogin = () => {
    sessionStorage.setItem('pending_connect', code);
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div ref={cardRef} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 20, padding: '32px 28px', maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #00d4aa, #00b894)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: '1.3rem', fontWeight: 800, color: '#000',
        }}>Q</div>

        {status === 'loading' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid var(--border-color)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Загрузка...</p>
          </div>
        )}

        {status === 'login_required' && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600 }}>
              Войдите в Monogram
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.5 }}>
              Для подключения к QuarkPay необходимо войти в аккаунт Monogram
            </p>
            <button onClick={handleLogin} style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}>
              Войти
            </button>
          </>
        )}

        {status === 'confirm' && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600 }}>
              Связать с QuarkPay?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.5 }}>
              Аккаунт <strong style={{ color: 'var(--text-primary)' }}>@{myUsername}</strong> будет связан с <strong style={{ color: '#00d4aa' }}>QuarkPay</strong>
            </p>

            <div style={{
              background: 'var(--bg-primary)', borderRadius: 12, padding: '14px 16px',
              marginBottom: 16, textAlign: 'left',
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600 }}>
                QuarkPay получит доступ к:
              </p>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <li>Вашему профилю Monogram</li>
                <li>Имени пользователя и аватару</li>
                <li>Отправке переводов в чатах</li>
                <li>Просмотру контактов</li>
              </ul>
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}

            <button onClick={handleConfirm} style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}>
              Подтвердить
            </button>
          </>
        )}

        {status === 'linking' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid var(--border-color)',
              borderTopColor: '#10b981', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Связывание аккаунтов...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>Аккаунты связаны!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Перенаправление...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', fontSize: 24, color: 'white',
            }}>✕</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>Ошибка</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>
            <button onClick={onConnected} style={{
              padding: '10px 18px', background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)', borderRadius: 10,
              color: 'var(--text-primary)', cursor: 'pointer',
            }}>На главную</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ConnectPage;
