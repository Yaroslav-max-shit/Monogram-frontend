import React, { useState, useEffect } from 'react';
import BlobLoader from './BlobLoader';
import apiClient from '../services/api';
import Icon from './Icon';

interface GamificationData {
  xp: number;
  daily_xp: number;
  level: number;
  rank_title: string;
  next_level_xp: number;
  stats: {
    messages_sent: number;
    photos_shared: number;
    videos_shared: number;
    calls_made: number;
    chats_joined: number;
  };
  achievements_count: number;
}

interface Props {
  onClose: () => void;
}

const GamificationModal: React.FC<Props> = ({ onClose }) => {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/gamification/profile')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '2rem' }}>
          <BlobLoader size={40} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const xpProgress = data.next_level_xp > 0 ? (data.xp / data.next_level_xp) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Геймификация</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Уровень и стрик */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)' }}>
            Ур. {data.level}
          </div>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {data.rank_title}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            {data.xp} / {data.next_level_xp} XP
          </div>
          <div style={{ 
            height: 6, 
            background: 'var(--bg-tertiary)', 
            borderRadius: 3, 
            marginTop: 8,
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${xpProgress}%`, 
              background: 'var(--accent)',
              borderRadius: 3,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Статистика */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard icon="message" label="Сообщений" value={data.stats.messages_sent} />
          <StatCard icon="image" label="Фото" value={data.stats.photos_shared} />
          <StatCard icon="video" label="Видео" value={data.stats.videos_shared} />
          <StatCard icon="phone" label="Звонков" value={data.stats.calls_made} />
          <StatCard icon="users" label="Чатов" value={data.stats.chats_joined} />
          <StatCard icon="award" label="Достижений" value={data.achievements_count} />
        </div>

        {/* Дневной лимит XP */}
        <div style={{ 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Сегодня получено XP: {data.daily_xp}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; label: string; value: number }> = ({ icon, label, value }) => (
  <div style={{ 
    padding: 12, 
    background: 'var(--bg-tertiary)', 
    borderRadius: 12,
    textAlign: 'center'
  }}>
    <Icon name={icon} size={20} style={{ marginBottom: 4 }} />
    <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
  </div>
);

export default GamificationModal;
