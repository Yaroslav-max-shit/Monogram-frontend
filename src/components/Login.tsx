import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import apiClient from '../services/api';
import { saveSession } from '../services/cookies';
import Icon from './Icon';
import ForgotPasswordModal from './ForgotPasswordModal';
import './Login.css';

type RegisterStep = 'data' | 'email_sent' | 'choose_username';

const Login: React.FC<{ onLogin?: () => void }> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('data');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REGISTRATION_SUCCESS') {
        setSuccessMessage('Регистрация подтверждена! Вход выполнен.');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      }
    };
    window.addEventListener('message', handleMessage);

    const verifiedEmail = sessionStorage.getItem('verification_email');
    const vToken = sessionStorage.getItem('verification_token');
    if (verifiedEmail && vToken) {
      setIsLogin(false);
      setRegisterStep('choose_username');
      setVerificationToken(vToken);
      sessionStorage.removeItem('verification_email');
      sessionStorage.removeItem('verification_token');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const translateError = (status: number, detail: string): string => {
    if (detail) return detail;
    const errorMap: Record<number, string> = {
      401: 'Неверный логин или пароль',
      404: 'Пользователь не найден',
      422: 'Проверьте правильность заполнения полей',
      429: 'Слишком много попыток. Подождите немного',
      500: 'Ошибка сервера. Попробуйте позже',
    };
    return errorMap[status] || 'Неизвестная ошибка';
  };

  const validateForm = (): string | null => {
    if (isLogin) {
      if (username.length < 3) return 'Имя пользователя должно содержать не менее 3 символов';
      if (password.length < 8) return 'Пароль должен содержать не менее 8 символов';
    } else {
      if (registerStep === 'data') {
        if (!email.includes('@')) return 'Введите корректный email';
        if (!firstName.trim()) return 'Введите имя';
        if (password.length < 8) return 'Пароль должен содержать не менее 8 символов';
        if (!/[a-zA-Z]/.test(password)) return 'Пароль должен содержать хотя бы одну латинскую букву';
        if (!/\d/.test(password)) return 'Пароль должен содержать хотя бы одну цифру';
      }
      if (registerStep === 'choose_username') {
        if (!newUsername || newUsername.length < 3) return 'Username должен быть не менее 3 символов';
        if (newUsername.length > 32) return 'Username не может быть длиннее 32 символов';
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) return 'Username может содержать только латиницу, цифры и _';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const response = await apiClient.post('/auth/login', { username, password });
        const token = response.data.access_token;
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        let userAvatar = '';
        let userFirstName = '';
        let userLastName = '';
        try {
          const meRes = await apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          userAvatar = meRes.data.avatar_url || '';
          userFirstName = meRes.data.first_name || '';
          userLastName = meRes.data.last_name || '';
        } catch {}
        
        await saveSession(token, {
          id: payload.user_id || payload.sub || 1,
          username: username,
          firstName: userFirstName || username,
          lastName: userLastName,
          avatar_url: userAvatar,
        });
        if (onLogin) onLogin();
      } else if (registerStep === 'data') {
        await apiClient.post('/auth/register/init', {
          email,
          password,
          first_name: firstName,
          last_name: lastName || '',
          avatar_url: avatar || '',
        });
        setSuccessMessage(`Письмо с подтверждением отправлено на ${email}`);
        setRegisterStep('email_sent');
        setResendCooldown(30);
      } else if (registerStep === 'choose_username') {
        const res = await apiClient.post('/auth/register/choose-username', {
          verification_token: verificationToken,
          username: newUsername,
        });
        const token = res.data.access_token;
        const payload = JSON.parse(atob(token.split('.')[1]));
        await saveSession(token, {
          id: payload.user_id || res.data.user?.id || 1,
          username: newUsername,
          firstName: firstName,
          lastName: lastName,
          avatar_url: avatar || '',
        });
        if (onLogin) onLogin();
      }
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '));
      } else if (detail) {
        setError(translateError(status, detail));
      } else if (!err.response) {
        setError('Сервер недоступен');
      } else {
        setError(translateError(status, ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiClient.post('/auth/register/init', {
        email,
        password,
        first_name: firstName,
        last_name: lastName || '',
        avatar_url: avatar || '',
      });
      setResendCooldown(30);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка отправки');
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await apiClient.post('/auth/google', { access_token: tokenResponse.access_token });
        const token = res.data.access_token;
        const payload = JSON.parse(atob(token.split('.')[1]));
        await saveSession(token, {
          id: payload.user_id || payload.sub || 1,
          username: payload.username || '',
          firstName: payload.first_name || '',
          lastName: payload.last_name || '',
          avatar_url: payload.avatar_url || '',
        });
        if (onLogin) onLogin();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ошибка входа через Google');
      }
    },
    onError: () => setError('Ошибка авторизации Google'),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    document.getElementById('reg-avatar-input')?.click();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/assets/images/icon-192.png" alt="Monogram" style={{width: 64, height: 64, borderRadius: 16}} />
        </div>
        <h2>{isLogin ? 'Вход в Monogram' : 'Регистрация'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Войдите в свой аккаунт' : 
           registerStep === 'data' ? 'Создайте новый аккаунт' :
           registerStep === 'email_sent' ? 'Подтвердите email' :
           'Выберите имя пользователя'}
        </p>

        {error && (
          <div className="error-message">
            <Icon name="note" size={14} /> {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message" style={{
            background: '#10b981',
            color: 'white',
            padding: '12px',
            borderRadius: '12px',
            marginTop: '16px',
            textAlign: 'center'
          }}>
            ✅ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin ? (
            registerStep === 'data' ? (
              <>
                <div className="register-avatar" onClick={handleAvatarClick}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="register-avatar-preview" />
                  ) : (
                    <div className="register-avatar-placeholder">
                      <Icon name="upload" size={32} />
                    </div>
                  )}
                  <input id="reg-avatar-input" type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                  <p className="register-avatar-hint">Фото профиля</p>
                </div>
                <input type="text" placeholder="Имя" value={firstName} onChange={e => setFirstName(e.target.value)} className="input-field" required />
                <input type="text" placeholder="Фамилия (необязательно)" value={lastName} onChange={e => setLastName(e.target.value)} className="input-field" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
                <input type="password" placeholder="Пароль (мин. 8 символов, буква + цифра)" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required minLength={8} />
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Отправка...' : 'Отправить код подтверждения'}
                </button>
              </>
            ) : registerStep === 'email_sent' ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
                <h3>Проверьте почту</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '1rem 0', fontSize: '0.9rem' }}>
                  Мы отправили письмо на <strong>{email}</strong>
                </p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                  Перейдите по ссылке в письме для подтверждения
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {resendCooldown > 0 ? (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                      Отправить повторно через {resendCooldown} сек
                    </span>
                  ) : (
                    <button type="button" onClick={handleResendEmail} style={{
                      background: 'none', border: 'none', color: 'var(--accent)',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                    }}>
                      Отправить письмо ещё раз
                    </button>
                  )}
                  <button type="button" onClick={() => { setRegisterStep('data'); setSuccessMessage(null); setError(null); }} style={{
                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontSize: '0.8rem',
                  }}>
                    Изменить данные
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem', fontSize: '0.9rem' }}>
                  Email подтверждён! Выберите имя пользователя
                </p>
                <input
                  type="text"
                  placeholder="Username (3-32 символа, латиница + _ + цифры)"
                  value={newUsername}
                  onChange={e => { setNewUsername(e.target.value); setError(null); }}
                  className="input-field"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9_]+"
                />
                <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
                  {loading ? 'Создание аккаунта...' : 'Завершить регистрацию'}
                </button>
              </div>
            )
          ) : (
            <>
              <input type="text" placeholder="Имя пользователя" value={username} onChange={e => setUsername(e.target.value)} className="input-field" required minLength={3} />
              <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required minLength={8} />
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </>
          )}
        </form>

        {isLogin && (
          <button onClick={() => setShowForgotPassword(true)} className="forgot-password-btn">
            Забыли пароль?
          </button>
        )}

        <div className="auth-divider"><span>или</span></div>

        <button onClick={() => handleGoogleLogin()} className="google-login-btn" disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Войти через Google
        </button>

        <button onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL || ''}/auth/yandex` }} className="yandex-login-btn" disabled={loading}>
          <img src="/assets/images/Yandex_icon.svg" alt="Я" style={{ width: 20, height: 20 }} />
          Войти через Яндекс
        </button>

        <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMessage(null); setRegisterStep('data'); setVerificationToken(''); setNewUsername(''); }} className="toggle-btn">
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
};

export default Login;
