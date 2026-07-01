import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';

const ResetPassword: React.FC = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
      setStatus('form');
    } else {
      setStatus('error');
      setError('Токен не найден');
    }
  }, []);

  const handleReset = async () => {
    if (newPassword.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      setError('Пароль должен содержать хотя бы одну латинскую букву');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError('Пароль должен содержать хотя бы одну цифру');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      await apiClient.post('/auth/reset-password/confirm', null, {
        params: { token, new_password: newPassword }
      });
      setStatus('success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка сброса пароля');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 20, padding: '32px 28px', maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: '1.5rem', color: '#fff',
        }}>🔐</div>

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

        {status === 'form' && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600 }}>
              Смена пароля
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.5 }}>
              Введите новый пароль для вашего аккаунта
            </p>

            <div style={{ marginBottom: 12 }}>
              <input
                type="password"
                placeholder="Новый пароль (мин. 8 символов)"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}

            <button onClick={handleReset} style={{
              width: '100%', padding: '12px',
              background: 'var(--gradient-primary)',
              color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}>
              Сменить пароль
            </button>
          </>
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
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>Пароль изменён!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Теперь вы можете войти с новым паролем
            </p>
            <button onClick={() => window.location.href = '/'} style={{
              width: '100%', padding: '12px',
              background: 'var(--gradient-primary)',
              color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
            }}>
              Войти
            </button>
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
            <button onClick={() => window.location.href = '/'} style={{
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

export default ResetPassword;
