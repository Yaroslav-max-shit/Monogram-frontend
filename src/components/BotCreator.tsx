import React, { useState } from 'react';
import Icon from './Icon';
import apiClient from '../services/api';

const BotCreator: React.FC<{ onClose: () => void; onCreated: (bot: any) => void }> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('BotCreator');
  const [username, setUsername] = useState('creator_bot');
  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdBot, setCreatedBot] = useState<any>(null);

  const handleCreate = async () => {
    if (!username.endsWith('Bot') && !username.endsWith('_bot')) {
      setError('Юзернейм должен заканчиваться на Bot или _bot');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/bots/create', null, {
        params: { name, username, description }
      });
      setCreatedBot(res.data);
      setApiKey(res.data.api_key);
      setStep(4);
      onCreated(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Ошибка создания бота');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создание бота</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div>
              <div className="input-group">
                <label>Имя бота</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Мой бот" />
              </div>
              <button className="modal-btn-primary" onClick={() => setStep(2)} disabled={!name}>
                Далее
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="input-group">
                <label>Юзернейм бота</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="my_bot" />
                <span className="input-hint">Должен заканчиваться на Bot или _bot</span>
              </div>
              <div className="input-group">
                <label>Описание</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Что делает бот" />
              </div>
              {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
              <button className="modal-btn-primary" onClick={() => setStep(3)} disabled={!username}>
                Далее
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <h3>Всё готово!</h3>
              <p>Нажмите создать чтобы получить API ключ</p>
              <button className="modal-btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Создание...' : 'Создать бота'}
              </button>
            </div>
          )}

          {step === 4 && createdBot && (
            <div style={{ textAlign: 'center' }}>
              <h3>Бот создан!</h3>
              <p><strong>{createdBot.name}</strong> @{createdBot.username}</p>
              <div className="input-group">
                <label>API Ключ (сохраните его!)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={apiKey} readOnly onClick={e => e.currentTarget.select()} style={{ flex: 1 }} />
                  <button
                    className="modal-btn-primary"
                    onClick={() => { navigator.clipboard.writeText(apiKey); }}
                    style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                  >
                    Копировать
                  </button>
                </div>
              </div>
              <button className="modal-btn-primary" onClick={onClose}>Готово</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotCreator;
