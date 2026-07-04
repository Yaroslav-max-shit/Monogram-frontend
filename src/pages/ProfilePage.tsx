import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import AvatarUploader from '../components/AvatarUploader';
import apiClient from '../services/api';
import './ProfilePage.css';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
const getAvatarUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BACKEND_URL}${url}`) : '';

interface ProfilePageProps {
  onBack: () => void;
  onSettings: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, onSettings }) => {
  const [userData, setUserData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/users/profile');
      setUserData(res.data);
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
      setBio(res.data.bio || '');
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/users/profile', {
        first_name: firstName,
        last_name: lastName,
        bio: bio,
      });
      setEditing(false);
      loadProfile();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-page-header">
        <button className="profile-page-back" onClick={onBack}>
          <Icon name="arrow-left" size={20} />
        </button>
        <h2>Профиль</h2>
        <button className="profile-page-settings" onClick={onSettings}>
          <Icon name="settings" size={20} />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="profile-page-hero" onClick={() => setShowAvatarUploader(true)}>
        <div className="profile-page-avatar">
          {userData?.avatar_url ? (
            <img src={getAvatarUrl(userData.avatar_url)} alt="" />
          ) : (
            <div className="profile-page-avatar-placeholder">
              {userData?.first_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="profile-page-avatar-edit">
            <Icon name="camera" size={16} />
          </div>
        </div>
        <h1 className="profile-page-name">
          {userData?.first_name} {userData?.last_name}
        </h1>
        <p className="profile-page-username">@{userData?.username}</p>
        {userData?.bio && (
          <p className="profile-page-bio">{userData.bio}</p>
        )}
      </div>

      {/* Info cards */}
      <div className="profile-page-cards">
        <div className="profile-page-card" onClick={() => setEditing(true)}>
          <Icon name="edit" size={18} />
          <div>
            <div className="card-label">Имя</div>
            <div className="card-value">{userData?.first_name} {userData?.last_name}</div>
          </div>
          <Icon name="chevron-right" size={16} />
        </div>

        <div className="profile-page-card" onClick={() => setEditing(true)}>
          <Icon name="info" size={18} />
          <div>
            <div className="card-label">О себе</div>
            <div className="card-value">{userData?.bio || 'Не указано'}</div>
          </div>
          <Icon name="chevron-right" size={16} />
        </div>

        <div className="profile-page-card">
          <Icon name="phone" size={18} />
          <div>
            <div className="card-label">Телефон</div>
            <div className="card-value">{userData?.phone || 'Не указан'}</div>
          </div>
        </div>

        <div className="profile-page-card">
          <Icon name="mail" size={18} />
          <div>
            <div className="card-label">Email</div>
            <div className="card-value">{userData?.email || 'Не указан'}</div>
          </div>
        </div>

        <div className="profile-page-card">
          <Icon name="calendar" size={18} />
          <div>
            <div className="card-label">Дата регистрации</div>
            <div className="card-value">
              {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('ru-RU') : ''}
            </div>
          </div>
        </div>

        {userData?.is_premium && (
          <div className="profile-page-card premium">
            <Icon name="crown" size={18} />
            <div>
              <div className="card-label">Premium</div>
              <div className="card-value">Активен</div>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="profile-edit-overlay" onClick={() => setEditing(false)}>
          <div className="profile-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-edit-header">
              <button onClick={() => setEditing(false)}>Отмена</button>
              <h3>Редактировать</h3>
              <button onClick={handleSave} disabled={saving}>
                {saving ? '...' : 'Сохранить'}
              </button>
            </div>
            <div className="profile-edit-body">
              <label>
                <span>Имя</span>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} />
              </label>
              <label>
                <span>Фамилия</span>
                <input value={lastName} onChange={e => setLastName(e.target.value)} />
              </label>
              <label>
                <span>О себе</span>
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} />
              </label>
            </div>
          </div>
        </div>
      )}

      {showAvatarUploader && (
        <AvatarUploader
          currentAvatar={userData?.avatar_url}
          onAvatarSaved={(url) => {
            setUserData((prev: any) => ({ ...prev, avatar_url: url }));
            setShowAvatarUploader(false);
          }}
          onClose={() => setShowAvatarUploader(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
