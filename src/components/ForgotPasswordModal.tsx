import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import apiClient from '../services/api';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendReset = async () => {
    if (!email.includes('@')) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/reset-password', null, {
        params: { email }
      });
      setEmailSent(true);
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiClient.post('/auth/reset-password', null, {
        params: { email }
      });
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка отправки');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="forgot-password-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Восстановление доступа</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {!emailSent ? (
            <>
              <p className="forgot-description">
                Введите email, привязанный к вашему аккаунту. Мы отправим ссылку для восстановления пароля.
              </p>
              
              <div style={{ marginBottom: 16 }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'var(--bg-primary)',
                    border: `1px solid ${error ? '#ef4444' : 'var(--border-color)'}`,
                    borderRadius: 12, color: 'var(--text-primary)',
                    outline: 'none', fontSize: '0.95rem',
                    boxSizing: 'border-box',
                  }}
                />
                {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 6 }}>{error}</div>}
              </div>

              <button
                onClick={handleSendReset}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Отправка...' : 'Отправить ссылку для восстановления'}
              </button>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={() => window.open('https://max.ru/u/f9LHodD0cOIybhReCuMbqxFHSmpdalT1pamBmrMnbLUoZNwTioMtW0v-QDI', '_blank')} style={{
                  width: '100%', padding: '12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 12,
                  color: 'var(--text-primary)', cursor: 'pointer',
                  fontWeight: 500, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Icon name="logo" size={18} />
                  Написать в поддержку
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h3 style={{ margin: '0 0 8px' }}>Письмо отправлено!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>
                Проверьте почту <strong>{email}</strong>
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: 20 }}>
                Перейдите по ссылке в письме, чтобы сменить пароль
              </p>

              {resendCooldown > 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: 16 }}>
                  Отправить повторно через {resendCooldown} сек
                </p>
              ) : (
                <button onClick={handleResend} style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, marginBottom: 16,
                }}>
                  Отправить ещё раз
                </button>
              )}

              <button onClick={onClose} style={{
                width: '100%', padding: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 12,
                color: 'var(--text-primary)', cursor: 'pointer',
                fontWeight: 500,
              }}>
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
