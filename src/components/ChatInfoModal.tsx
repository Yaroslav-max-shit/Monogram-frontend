import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import apiClient from '../services/api';
import './ChatInfoModal.css';

interface ChatInfoModalProps {
  onClose: () => void;
  chat: { id: number; name: string; type?: string; isBot?: boolean; botId?: number };
  currentUserId?: number;
}

const ChatInfoModal: React.FC<ChatInfoModalProps> = ({ onClose, chat, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'files' | 'links'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const isPrivate = chat.type === 'private' || chat.type === 'personal';
  const isGroup = chat.type === 'group';
  const isChannel = chat.type === 'channel';
  const isBot = (chat as any).isBot || false;

  useEffect(() => {
    loadData();
  }, [chat.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Загружаем участников
      try {
        const membersRes = await apiClient.get(`/chats/${chat.id}/members`);
        setMembers(membersRes.data || []);
      } catch {
        setMembers([]);
      }

      // Для ботов — загружаем инфо о боте
      if (isBot && (chat as any).botId) {
        try {
          const botRes = await apiClient.get(`/bots/myBots`);
          const bot = botRes.data?.find((b: any) => b.id === (chat as any).botId);
          if (bot) setBotInfo(bot);
        } catch {}
      }
      
      // Загружаем сообщения для вкладок
      try {
        const msgsRes = await apiClient.get(`/messages/chat/${chat.id}`);
        const msgs = msgsRes.data || [];
        setAllMessages(msgs);
        
        const media = msgs.filter((m: any) => {
          try {
            const parsed = JSON.parse(m.content);
            return parsed.type === 'photo' || parsed.type === 'video' || parsed.type === 'file';
          } catch { return false; }
        });
        setMediaFiles(media);
      } catch {}
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Для личного чата — показываем профиль собеседника
  const otherMember = isPrivate ? members.find(m => m.user_id !== currentUserId) : null;

  const exportChat = async (format: 'json' | 'html' | 'txt') => {
    setExporting(true);
    try {
      if (allMessages.length === 0) {
        const msgsRes = await apiClient.get(`/messages/chat/${chat.id}`);
        setAllMessages(msgsRes.data || []);
      }
      const msgs = allMessages.length > 0 ? allMessages : [];
      let content = '';
      let filename = `chat_${chat.name}_${new Date().toISOString().slice(0,10)}`;
      let mimeType = 'text/plain';

      if (format === 'json') {
        content = JSON.stringify({ chat: { id: chat.id, name: chat.name, type: chat.type }, messages: msgs.map((m: any) => ({ id: m.id, sender_id: m.sender_id, content: m.content, timestamp: m.timestamp })) }, null, 2);
        filename += '.json';
        mimeType = 'application/json';
      } else if (format === 'html') {
        const rows = msgs.map((m: any) => `<tr><td>${new Date(m.timestamp).toLocaleString()}</td><td>User ${m.sender_id}</td><td>${m.content}</td></tr>`).join('\n');
        content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chat: ${chat.name}</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Chat: ${chat.name}</h1><table><tr><th>Дата</th><th>Отправитель</th><th>Сообщение</th></tr>${rows}</table></body></html>`;
        filename += '.html';
        mimeType = 'text/html';
      } else {
        content = msgs.map((m: any) => `[${new Date(m.timestamp).toLocaleString()}] User ${m.sender_id}: ${m.content}`).join('\n');
        filename += '.txt';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chat-info-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        {isBot ? (
          // ПРОФИЛЬ БОТА
          <div className="profile-full">
            <div className="profile-avatar-large">
              <span>{chat.name?.charAt(0)?.toUpperCase() || 'B'}</span>
            </div>
            <h2>{chat.name}</h2>
            <p className="profile-username">Бот</p>
            {botInfo?.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 16px' }}>
                {botInfo.description}
              </p>
            )}
            <div className="profile-section">
              <div className="profile-row">
                <span className="profile-label">Имя</span>
                <span className="profile-value">{chat.name}</span>
              </div>
              {botInfo?.username && (
                <div className="profile-row">
                  <span className="profile-label">Username</span>
                  <span className="profile-value">@{botInfo.username}</span>
                </div>
              )}
              <div className="profile-row">
                <span className="profile-label">Тип</span>
                <span className="profile-value">Бот</span>
              </div>
            </div>
          </div>
        ) : isPrivate && otherMember ? (
          // ПРОФИЛЬ ЛИЧНОГО ЧАТА
          <div className="profile-full">
            <div className="profile-avatar-large">
              {otherMember.avatar_url ? (
                <img src={otherMember.avatar_url} alt="" />
              ) : (
                <span>{otherMember.first_name?.charAt(0)?.toUpperCase() || otherMember.username?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
            </div>
            <h2>{otherMember.first_name} {otherMember.last_name}</h2>
            <p className="profile-username">@{otherMember.username}</p>
            
            <div className="profile-section">
              <div className="profile-row">
                <span className="profile-label">Имя</span>
                <span className="profile-value">{otherMember.first_name || 'Не указано'}</span>
              </div>
              {otherMember.last_name && (
                <div className="profile-row">
                  <span className="profile-label">Фамилия</span>
                  <span className="profile-value">{otherMember.last_name}</span>
                </div>
              )}
              <div className="profile-row">
                <span className="profile-label">Username</span>
                <span className="profile-value">@{otherMember.username}</span>
              </div>
              {otherMember.birth_date && (
                <div className="profile-row">
                  <span className="profile-label">Дата рождения</span>
                  <span className="profile-value">{otherMember.birth_date}</span>
                </div>
              )}
            </div>

            <div className="profile-section" style={{ marginTop: 12 }}>
              <div className="profile-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="profile-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="lock" size={14} /> E2EE шифрование
                </span>
                <button
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                  onClick={() => {
                    alert('E2EE настройки доступны в меню настроек чата (Оформление → E2EE шифрование)');
                  }}
                >
                  Управление ключами
                </button>
              </div>
            </div>

            <div className="profile-section" style={{ marginTop: 12 }}>
              {isBlocked ? (
                <button
                  className="settings-action-btn"
                  style={{ width: '100%', color: '#4CAF50', border: '1px solid #4CAF50', background: 'transparent', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
                  onClick={async () => {
                    try {
                      await apiClient.delete(`/users/block/${otherMember.user_id || otherMember.id}`);
                      setIsBlocked(false);
                    } catch {}
                  }}
                >
                  <Icon name="checkmark" size={16} /> Разблокировать
                </button>
              ) : (
                <button
                  className="settings-action-btn"
                  style={{ width: '100%', color: '#ef4444', border: '1px solid #ef4444', background: 'transparent', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
                  disabled={blockLoading}
                  onClick={async () => {
                    setBlockLoading(true);
                    try {
                      await apiClient.get(`/users/block/${otherMember.user_id || otherMember.id}`);
                      setIsBlocked(true);
                    } catch {
                      alert('Не удалось заблокировать пользователя');
                    } finally {
                      setBlockLoading(false);
                    }
                  }}
                >
                  <Icon name="delete" size={16} /> Заблокировать
                </button>
              )}
            </div>
          </div>
        ) : (
          // ПРОФИЛЬ ГРУППЫ/КАНАЛА
          <>
            <div className="chat-info-avatar">
              {chat.name.charAt(0).toUpperCase()}
            </div>
            <h2>{chat.name}</h2>
            <p className="chat-info-username">
              {isGroup ? 'Группа' : isChannel ? 'Канал' : 'Чат'} • {members.length} {isGroup ? 'участников' : isChannel ? 'подписчиков' : 'участник'}
            </p>
          </>
        )}

        {/* Вкладки — скрыты для личных чатов и ботов */}
        {!isPrivate && !isBot && (
          <div className="chat-info-tabs">
            <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
              <Icon name="profile" size={14} /> Участники ({members.length})
            </button>
            <button className={`tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
              <Icon name="picture" size={14} /> Фото
            </button>
            <button className={`tab ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
              <Icon name="folder" size={14} /> Файлы
            </button>
            <button className={`tab ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}>
              <Icon name="link" size={14} /> Ссылки
            </button>
          </div>
        )}

        <div className="chat-info-body">
          {activeTab === 'members' && !isPrivate && !isBot && (
            loading ? (
              <div className="loading-members">Загрузка...</div>
            ) : (
              <div className="members-list">
                {isGroup && (
                  <div
                    className="member-item"
                    style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}
                    onClick={async () => {
                      const username = prompt('Введите @username пользователя для добавления:');
                      if (!username) return;
                      try {
                        const clean = username.replace('@', '').trim();
                        const userRes = await apiClient.get(`/auth/check-username?username=${clean}`);
                        if (!userRes.data.exists) {
                          alert('Пользователь не найден');
                          return;
                        }
                        await apiClient.post(`/chats/${chat.id}/add-member`, { username: clean });
                        alert(`${username} добавлен(а) в группу`);
                        loadData();
                      } catch (err: any) {
                        alert(err.response?.data?.detail || 'Не удалось добавить участника');
                      }
                    }}
                  >
                    <div className="member-avatar" style={{ background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>
                      +
                    </div>
                    <div className="member-info">
                      <div className="member-name" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                        Добавить участника
                      </div>
                    </div>
                  </div>
                )}
                {members.map(member => (
                  <div key={member.user_id} className="member-item">
                    <div className="member-avatar">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" />
                      ) : (
                        <span>{member.username?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="member-info">
                      <div className="member-name">
                        {member.first_name} {member.last_name}
                        {member.user_id === currentUserId && <span className="member-badge">Вы</span>}
                      </div>
                      <div className="member-username">@{member.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'media' && (
            <div className="media-grid">
              {mediaFiles.length > 0 ? (
                mediaFiles.map((msg: any) => {
                  try {
                    const parsed = JSON.parse(msg.content);
                    return (
                      <div key={msg.id} className="media-item" onClick={() => {/* открыть в чате */}}>
                        {parsed.type === 'photo' && <img src={parsed.url} alt="" />}
                        {parsed.type === 'video' && <div className="media-video">Видео</div>}
                      </div>
                    );
                  } catch { return null; }
                })
              ) : (
                <div className="media-empty">
                  <Icon name="picture" size={48} />
                  <p>Нет медиафайлов</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="media-empty">
              <Icon name="folder" size={48} />
              <p>Нет файлов</p>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="media-empty">
              <Icon name="link" size={48} />
              <p>Нет ссылок</p>
            </div>
          )}
        </div>

        <div style={{padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8}}>

          <button disabled={exporting} onClick={() => exportChat('json')} style={{flex: 1, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem'}}>

            {exporting ? '...' : '📄 JSON'}

          </button>

          <button disabled={exporting} onClick={() => exportChat('html')} style={{flex: 1, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem'}}>

            {exporting ? '...' : '🌐 HTML'}

          </button>

          <button disabled={exporting} onClick={() => exportChat('txt')} style={{flex: 1, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem'}}>

            {exporting ? '...' : '📝 TXT'}

          </button>

        </div>

      </div>

    </div>

  );

};

export default ChatInfoModal;
