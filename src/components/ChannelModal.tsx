import React from 'react';
import Icon from './Icon';

interface ChannelModalProps {
  onClose: () => void;
  onChatSelect: (id: number, name: string) => void;
}

const ChannelModal: React.FC<ChannelModalProps> = ({ onClose, onChatSelect }) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { default: apiClient } = await import('../services/api');
    try {
      const res = await apiClient.post('/chats/create', { name, description, type: 'channel' });
      onChatSelect(res.data.id, res.data.name);
      onClose();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка создания канала');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, borderRadius: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent)))', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="volume" size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Новый канал</h2>
            <p style={{ margin: 0, opacity: 0.85, fontSize: '0.8rem' }}>Публичные.broadcast-сообщения</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Название канала *</label>
            <input
              placeholder="Введите название"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.95rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Описание</label>
            <textarea
              placeholder="О чём этот канал?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <Icon name="info" size={14} /> Канал — это способ массовой рассылки сообщений. Подписчики видят сообщения, но не могут писать.
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: name.trim() ? 'var(--gradient-primary)' : 'var(--bg-tertiary, #333)',
              color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Создание...' : 'Создать канал'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelModal;
