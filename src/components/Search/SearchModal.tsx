import React, { useState, useEffect } from 'react';
import BlobLoader from '../BlobLoader';
import apiClient from '../../services/api';
import Icon from '../Icon';
import './SearchModal.css';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
const getAvatarUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BACKEND_URL}${url}`) : '';

interface SearchModalProps {
  onClose: () => void;
  onChatSelect: (chatId: number, chatName: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ onClose, onChatSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({ chats: [], messages: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'chats' | 'messages' | 'users'>('all');
  const [filterChatId, setFilterChatId] = useState<number | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Расширенные фильтры
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [senderId, setSenderId] = useState<number | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [hasMedia, setHasMedia] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    const res = await apiClient.get('/chats/');
    setChats(res.data);
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults({ chats: [], messages: [], users: [] });
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [query, filterChatId]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '50'
      });
      
      if (filterChatId) params.append('chat_id', String(filterChatId));
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (senderId) params.append('sender_id', String(senderId));
      if (contentType) params.append('content_type', contentType);
      if (hasMedia) params.append('has_media', 'true');
      
      const res = await apiClient.get(`/search/messages?${params.toString()}`);
      setResults({ chats: [], messages: res.data.messages || [], users: [] });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVisibleResults = () => {
    switch (activeTab) {
      case 'chats': return results.chats;
      case 'messages': return results.messages;
      case 'users': return results.users;
      default: return [...results.chats, ...results.messages, ...results.users];
    }
  };

  const handleMessageClick = (message: any) => {
    onChatSelect(message.chat_id, `Чат ${message.chat_id}`);
    onClose();
  };

  const handleUserClick = (user: any) => {
    // Создаём или открываем чат с пользователем
    const chatId = generateChatId(user.id);
    onChatSelect(chatId, user.username);
    onClose();
  };

  const generateChatId = (userId: number) => {
    return userId + 100000;
  };

  const highlightText = (text: string) => {
    if (!query) return text;
    const escapeHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safe = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return safe.replace(regex, '<mark>$1</mark>');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Поиск</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="search-input-wrapper">
          {loading ? (
            <div className="search-input-spinner" />
          ) : (
            <Icon name="search" size={18} />
          )}
          <input
            type="text"
            placeholder={loading ? "Поиск..." : "Поиск по чатам, сообщениям, пользователям..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        
        {filterChatId && (
          <div className="search-filter">
            <span>Фильтр: чат {chats.find(c => c.id === filterChatId)?.name}</span>
            <button onClick={() => setFilterChatId(null)}>✕</button>
          </div>
        )}
        
        {/* Кнопка расширенных фильтров */}
        <button 
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: showFilters ? 'var(--accent)' : 'var(--bg-tertiary)',
            border: 'none',
            borderRadius: 8,
            color: showFilters ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            margin: '8px 0',
          }}
        >
          <Icon name="filter" size={14} />
          Фильтры
        </button>
        
        {/* Расширенные фильтры */}
        {showFilters && (
          <div className="advanced-filters" style={{
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 12,
            marginBottom: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>От даты</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>До даты</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Тип контента</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="">Все</option>
                <option value="text">Текст</option>
                <option value="photo">Фото</option>
                <option value="video">Видео</option>
                <option value="file">Файлы</option>
                <option value="voice">Голосовые</option>
              </select>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasMedia}
                onChange={(e) => setHasMedia(e.target.checked)}
              />
              Только с медиа
            </label>
          </div>
        )}
        
        <div className="search-tabs">
          <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            Все ({results.chats.length + results.messages.length + results.users.length})
          </button>
          <button className={`tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
            Чаты ({results.chats.length})
          </button>
          <button className={`tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            Сообщения ({results.messages.length})
          </button>
          <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            Пользователи ({results.users.length})
          </button>
        </div>
        
        <div className="search-results">
          {loading ? (
            <div className="search-loading">
              <BlobLoader size={40} />
              <p>Поиск...</p>
            </div>
          ) : getVisibleResults().length === 0 ? (
            <div className="search-empty">
              <Icon name="search" size={48} />
              <p>Ничего не найдено</p>
            </div>
          ) : (
            <>
              {activeTab === 'all' && (
                <>
                  {results.chats.length > 0 && (
                    <div className="results-section">
                      <div className="section-title">Чаты</div>
                      {results.chats.map((chat: any) => (
                        <div key={chat.id} className="result-item chat" onClick={() => onChatSelect(chat.id, chat.name)}>
                          <div className="result-icon"><Icon name="logo" size={20} /></div>
                          <div className="result-info">
                            <div className="result-title">{chat.name}</div>
                            <div className="result-subtitle">{chat.type_label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {results.messages.length > 0 && (
                    <div className="results-section">
                      <div className="section-title">Сообщения</div>
                      {results.messages.map((msg: any) => (
                        <div key={msg.id} className="result-item message" onClick={() => handleMessageClick(msg)}>
                          <div className="result-icon"><Icon name="note" size={20} /></div>
                          <div className="result-info">
                            <div className="result-title" dangerouslySetInnerHTML={{ __html: highlightText(msg.content.substring(0, 100)) }} />
                            <div className="result-subtitle">Чат {msg.chat_id} • {new Date(msg.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {results.users.length > 0 && (
                    <div className="results-section">
                      <div className="section-title">Пользователи</div>
                      {results.users.map((user: any) => (
                        <div key={user.id} className="result-item user" onClick={() => handleUserClick(user)}>
                          <div className="result-avatar">
                            {user.avatar_url ? (
                              <img src={getAvatarUrl(user.avatar_url)} alt="" />
                            ) : (
                              <span>{user.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="result-info">
                            <div className="result-title">{user.first_name} {user.last_name}</div>
                            <div className="result-subtitle">@{user.username}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'chats' && results.chats.map((chat: any) => (
                <div key={chat.id} className="result-item chat" onClick={() => onChatSelect(chat.id, chat.name)}>
                  <div className="result-icon"><Icon name="logo" size={20} /></div>
                  <div className="result-info">
                    <div className="result-title">{chat.name}</div>
                    <div className="result-subtitle">{chat.type_label}</div>
                  </div>
                </div>
              ))}
              
              {activeTab === 'messages' && results.messages.map((msg: any) => (
                <div key={msg.id} className="result-item message" onClick={() => handleMessageClick(msg)}>
                  <div className="result-icon"><Icon name="note" size={20} /></div>
                  <div className="result-info">
                    <div className="result-title" dangerouslySetInnerHTML={{ __html: highlightText(msg.content.substring(0, 100)) }} />
                    <div className="result-subtitle">Чат {msg.chat_id} • {new Date(msg.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              
              {activeTab === 'users' && results.users.map((user: any) => (
                <div key={user.id} className="result-item user" onClick={() => handleUserClick(user)}>
                  <div className="result-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="result-info">
                    <div className="result-title">{user.first_name} {user.last_name}</div>
                    <div className="result-subtitle">@{user.username}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;