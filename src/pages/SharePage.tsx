import React, { useEffect, useState } from 'react';
import apiClient from '../services/api';

const SharePage: React.FC = () => {
  const [sharedText, setSharedText] = useState('');
  const [sharedTitle, setSharedTitle] = useState('');
  const [sharedUrl, setSharedUrl] = useState('');
  const [targetChatId, setTargetChatId] = useState<number | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'sent' | 'error'>('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get('text') || '';
    const title = params.get('title') || '';
    const url = params.get('url') || '';
    setSharedText(text);
    setSharedTitle(title);
    setSharedUrl(url);
    
    apiClient.get('/chats/').then(res => {
      if (Array.isArray(res.data)) setChats(res.data);
    }).catch(() => {});
    
    setStatus('ready');
  }, []);

  const handleSend = async () => {
    if (!targetChatId) return;
    setStatus('loading');
    const content = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join('\n');
    try {
      await apiClient.post('/messages/', { content, chat_id: targetChatId });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="share-page">
      <h2>Поделиться в Monogram</h2>
      {status === 'ready' && (
        <div className="share-content">
          <div className="share-preview">
            {sharedTitle && <div className="share-title">{sharedTitle}</div>}
            {sharedText && <div className="share-text">{sharedText}</div>}
            {sharedUrl && <div className="share-url">{sharedUrl}</div>}
          </div>
          <select value={targetChatId || ''} onChange={e => setTargetChatId(Number(e.target.value))}>
            <option value="">Выберите чат</option>
            {chats.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="share-send-btn" onClick={handleSend} disabled={!targetChatId}>Отправить</button>
        </div>
      )}
      {status === 'sent' && <div className="share-success">Отправлено!</div>}
      {status === 'error' && <div className="share-error">Ошибка отправки</div>}
    </div>
  );
};

export default SharePage;
