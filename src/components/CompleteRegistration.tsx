import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import Icon from './Icon';

interface CompleteRegistrationProps {
  email: string;
  googleId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  onComplete: (token: string) => void;
}

const CompleteRegistration: React.FC<CompleteRegistrationProps> = ({
  email,
  googleId,
  firstName,
  lastName,
  avatarUrl,
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [displayName, setDisplayName] = useState(firstName);
  const [displayLastName, setDisplayLastName] = useState(lastName);
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const delay = setTimeout(() => {
      if (username.length >= 3) {
        checkUsername();
      } else {
        setUsernameAvailable(null);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [username]);

  const checkUsername = async () => {
    setChecking(true);
    try {
      const res = await apiClient.get(`/auth/check-username?username=${username}`);
      setUsernameAvailable(!res.data.exists);
    } catch {
      setUsernameAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setAvatar(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const completeRegistration = async () => {
    if (!username || usernameAvailable !== true) {
      setError('Выберите доступное имя пользователя');
      return;
    }
    
    setLoading(true);
    const payload: any = {
      username,
      email,
      google_id: googleId,
      first_name: displayName,
      last_name: displayLastName,
      bio,
    };
    
    // Если есть новый аватар — загружаем отдельно
    if (avatarFile) {
      try {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const uploadRes = await apiClient.post('/users/avatar', fd);
        if (uploadRes.data?.url) {
          payload.avatar_url = uploadRes.data.url;
        }
      } catch {}
    } else if (avatarUrl && !avatarUrl.startsWith('data:')) {
      payload.avatar_url = avatarUrl;
    }
    
    try {
      const endpoint = googleId === 'yandex' ? '/auth/yandex/complete' : '/auth/google/complete';
      const res = await apiClient.post(endpoint, payload);
      onComplete(res.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка завершения регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-registration-container">
      <div className="complete-registration-card">
        <h2>Р—Р°РІРµСЂС€РµРЅРёРµ СЂРµРіРёСЃС‚СЂР°С†РёРё</h2>
        
        {step === 1 && (
          <div className="step-username">
            <div className="username-input-wrapper">
              <span className="at-symbol">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="username-input"
                autoFocus
              />
            </div>
            
            {username.length >= 3 && (
              <div className="username-status">
                {checking ? (
                  <span className="checking">РџСЂРѕРІРµСЂРєР°...</span>
                ) : usernameAvailable === true ? (
                  <span className="available">вњ“ Р”РѕСЃС‚СѓРїРЅРѕ</span>
                ) : usernameAvailable === false ? (
                  <span className="taken">вњ— Р—Р°РЅСЏС‚Рѕ</span>
                ) : null}
              </div>
            )}
            
            <button
              className="next-btn"
              onClick={() => setStep(2)}
              disabled={usernameAvailable !== true}
            >
              Р”Р°Р»РµРµ
            </button>
          </div>
        )}
        
        {step === 2 && (
          <div className="step-profile">
            <div className="avatar-section">
              <div className="avatar-preview" onClick={() => document.getElementById('avatar-input')?.click()}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    <Icon name="upload" size={32} />
                  </div>
                )}
              </div>
              <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} hidden />
              <p className="avatar-hint">РќР°Р¶РјРёС‚Рµ С‡С‚РѕР±С‹ РґРѕР±Р°РІРёС‚СЊ С„РѕС‚Рѕ</p>
            </div>
            
            <input
              type="text"
              placeholder="РРјСЏ"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="profile-input"
            />
            
            <input
              type="text"
              placeholder="Р¤Р°РјРёР»РёСЏ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)"
              value={displayLastName}
              onChange={(e) => setDisplayLastName(e.target.value)}
              className="profile-input"
            />
            
            <textarea
              placeholder="Рћ СЃРµР±Рµ"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="profile-textarea"
              rows={3}
            />
            
            {error && <div className="error-message">{error}</div>}
            
            <button
              className="complete-btn"
              onClick={completeRegistration}
              disabled={loading}
            >
              {loading ? 'Р—Р°РІРµСЂС€РµРЅРёРµ...' : 'Р—Р°РІРµСЂС€РёС‚СЊ СЂРµРіРёСЃС‚СЂР°С†РёСЋ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompleteRegistration;
