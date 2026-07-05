import React, { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { useDebounce } from '../hooks/useDebounce';
import { useAccounts } from '../hooks/useAccounts';
import { FocusMode, isFocusModeActive } from './FocusMode';
import './Sidebar.css';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
const getAvatarUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BACKEND_URL}${url}`) : '';

interface SidebarProps {
  chats: any[];
  activeChatId: number;
  onChatSelect: (id: number, name: string) => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onNotificationsClick: () => void;
  onLogout: () => void;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
  onAddChat: () => void;
  userData: any;
  isAdmin: boolean;
  isPremium: boolean;
  onAdminClick: () => void;
  onPremiumClick: () => void;
  onPinChat: (id: number, isPinned: boolean) => void;
  onArchiveChat: (id: number) => void;
  onMuteChat: (id: number, duration: number) => void;
  onDeleteChat: (id: number) => void;
  onBlockUser: (id: number) => void;
  onClearHistory: (id: number) => void;
  onAddToFolder: (id: number) => void;
  isOpen: boolean;
  onClose: () => void;
  isMobileLayout?: boolean;
  connectionStatus?: 'online' | 'offline';
}

const avatarColors = [
  'var(--accent)', 'var(--danger)', '#f093fb', '#f5576c', '#4facfe',
  '#43e97b', '#fa709a', '#a18cd1', '#fbc2eb', '#84fab0',
  '#fccb90', '#d57eeb', '#5ee7df', '#b7f8db', '#f093fb',
];

function getChatAvatar(chat: any): { letter: string; color: string } {
  const name = chat.name || chat.title || '?';
  const letter = name.charAt(0).toUpperCase();
  const colorIndex = (chat.id || name.length) % avatarColors.length;
  return { letter, color: avatarColors[colorIndex] };
}

const Sidebar: React.FC<SidebarProps> = ({
  chats, activeChatId, onChatSelect,
  onProfileClick, onSettingsClick, onNotificationsClick, onLogout,
  onCreateGroup, onCreateChannel, onAddChat,
  userData, isAdmin, isPremium,
  onAdminClick, onPremiumClick,
  onPinChat, onArchiveChat, onMuteChat,
  onDeleteChat, onBlockUser, onClearHistory, onAddToFolder,
  isOpen, onClose, isMobileLayout, connectionStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const { accounts, activeIndex, switchAccount, removeAccount } = useAccounts();
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const focusModeActive = isFocusModeActive();
  const [orderedChats, setOrderedChats] = useState<any[]>([]);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ chatId: number; x: number; y: number } | null>(null);

  const displayName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ''}`.trim()
    : userData?.username || 'Пользователь';

  useEffect(() => {
    if (debouncedSearch) {
      console.debug('[Sidebar] Search triggered:', debouncedSearch);
      import('../services/api').then(({ default: api }) => {
        api.get(`/users/search?q=${encodeURIComponent(debouncedSearch)}`).then(res => {
          setSearchUsers(res.data || []);
        }).catch(() => setSearchUsers([]));
      });
    } else {
      setSearchUsers([]);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const storageKey = `chat_order_${userData?.id || 'default'}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder) as number[];
        const ordered = [...chats].sort((a, b) => {
          const ai = order.indexOf(a.id);
          const bi = order.indexOf(b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        setOrderedChats(ordered);
        return;
      } catch {}
    }
    setOrderedChats(chats);
  }, [chats, userData?.id]);

  const handleDragStart = (e: React.DragEvent, chatId: number) => {
    e.dataTransfer.setData('text/plain', String(chatId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, chatId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(chatId);
  };

  const handleDrop = useCallback((e: React.DragEvent, targetChatId: number) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (draggedId === targetChatId) return;

    const storageKey = `chat_order_${userData?.id || 'default'}`;
    const savedOrder: number[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const allIds = orderedChats.map(c => c.id);
    const newOrder = allIds.filter(id => id !== draggedId);
    const insertIdx = newOrder.indexOf(targetChatId);
    newOrder.splice(insertIdx, 0, draggedId);
    
    localStorage.setItem(storageKey, JSON.stringify(newOrder));
    
    const reordered = [...orderedChats].sort((a, b) => {
      const ai = newOrder.indexOf(a.id);
      const bi = newOrder.indexOf(b.id);
      return ai - bi;
    });
    setOrderedChats(reordered);
  }, [orderedChats, userData?.id]);

  const filteredChats = orderedChats.filter(chat =>
    !debouncedSearch || chat.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleAddClick = () => {
    setShowAddMenu(!showAddMenu);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      {isMobileLayout && (
        <div className="sidebar-header-mobile">
          <div className="sidebar-logo">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gradient-avatar)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 14,
            }}>M</div>
            <div>
              <span>Monogram</span>
              {connectionStatus === 'offline' && (
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Соединение...
                </span>
              )}
            </div>
          </div>
          <div className="sidebar-header-actions">
            <button onClick={onSettingsClick} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: 8,
            }}>
              <Icon name="settings" size={20} />
            </button>
          </div>
        </div>
      )}
      <div className="sidebar-top">
        <div className="sidebar-search">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="add-chat-btn" onClick={handleAddClick} title="Добавить чат">
            <Icon name="plus" size={18} />
          </button>
          {showAddMenu && (
            <div className="add-chat-dropdown">
              <button onClick={() => { setShowAddMenu(false); onCreateGroup(); }}>Создать группу</button>
              <button onClick={() => { setShowAddMenu(false); onCreateChannel(); }}>Создать канал</button>
            </div>
          )}
        </div>
      </div>

      {/* Stories лента */}
      {isMobileLayout && userData && (
        <StoriesBar
          currentUserId={userData.id}
          onOpenStory={(stories, idx) => {
            setViewingStories(stories);
            setViewingStoryIndex(idx);
          }}
          onCreateStory={() => setShowStoryCreator(true)}
        />
      )}

      <div className="sidebar-chats">
        {debouncedSearch && searchUsers.length > 0 && (
          <div style={{padding: '4px 0'}}>
            <div style={{padding: '4px 12px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase'}}>Пользователи</div>
            {searchUsers.map((user: any) => (
              <div
                key={`user-${user.id}`}
                className="chat-item"
                onClick={() => {
                  setSearchQuery('');
                  onChatSelect(user.id, user.first_name || user.username || 'Чат');
                }}
                style={{cursor: 'pointer'}}
              >
                <div className="chat-avatar" style={{background: 'var(--accent)', overflow: 'hidden'}}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    (user.first_name || user.username || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{user.first_name} {user.last_name || ''}</div>
                  <div className="chat-last-message">@{user.username}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredChats.map((chat: any, idx: number) => {
          const { letter, color } = getChatAvatar(chat);
          return (
            <div
              key={chat.id || `chat-${idx}`}
              className={`chat-item ${chat.id === activeChatId ? 'active' : ''} ${dragOverId === chat.id ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, chat.id)}
              onDragOver={(e) => handleDragOver(e, chat.id)}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => handleDrop(e, chat.id)}
              onClick={() => onChatSelect(chat.id, chat.name || chat.title || 'Чат')}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ chatId: chat.id, x: e.clientX, y: e.clientY });
              }}
            >
              <div className="chat-avatar" style={{ background: color }}>
                {chat.avatar_url ? (
                  <img src={getAvatarUrl(chat.avatar_url)} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                ) : (
                  <span className="chat-avatar-letter">{letter}</span>
                )}
              </div>
              <div className="chat-info">
                <span className="chat-name">
                  {chat.name || chat.title || 'Чат'}
                  {chat.isPinned && <Icon name="pin" size={12} className="chat-pin-icon" />}
                </span>
                <span className="chat-last-message">
                  {chat.last_message?.content?.substring(0, 30) || chat.lastMessage?.substring(0, 30) || ''}
                </span>
              </div>
              {chat.unreadCount > 0 && (
                <span className="chat-unread">{chat.unreadCount}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onProfileClick}>
          <div className="sidebar-avatar">
            {userData?.avatar_url ? (
              <img src={getAvatarUrl(userData.avatar_url)} alt="" />
            ) : (
              <span style={{fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 16}}>
                {(userData?.first_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{displayName}</span>
          </div>
        </div>
        <button className="sidebar-action-btn" onClick={onSettingsClick}><Icon name="settings" size={16} /> Настройки</button>
        {isPremium && <button className="sidebar-action-btn premium" onClick={onPremiumClick}><Icon name="crown" size={16} /> Premium</button>}
        {isAdmin && <button className="sidebar-action-btn" onClick={onAdminClick}><Icon name="shield" size={16} /> Админка</button>}
      </div>

      {isMobileLayout && (
        <div className="sidebar-footer-mobile">
          <button className="sidebar-footer-btn active">
            <Icon name="logo" size={20} />
            <span>Чаты</span>
          </button>
          <button className="sidebar-footer-btn" onClick={onSettingsClick}>
            <Icon name="settings" size={20} />
            <span>Настройки</span>
          </button>
          <button className="sidebar-footer-btn" onClick={onProfileClick}>
            {userData?.avatar_url ? (
              <img src={getAvatarUrl(userData.avatar_url)} alt="" className="sidebar-footer-avatar" />
            ) : (
              <div className="sidebar-footer-avatar-placeholder">
                {userData?.first_name?.[0] || userData?.username?.[0] || '?'}
              </div>
            )}
            <span>Профиль</span>
          </button>
        </div>
      )}

      {showFocusMode && <FocusMode onClose={() => setShowFocusMode(false)} />}

      {/* Кастомное контекст-меню */}
      {contextMenu && (
        <div 
          className="context-menu-overlay" 
          onClick={() => setContextMenu(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
        >
          <div 
            className="context-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              padding: '8px 0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              minWidth: 180,
              zIndex: 10001,
            }}
          >
            <button className="context-menu-item" onClick={() => { onPinChat(contextMenu.chatId, false); setContextMenu(null); }}>
              <Icon name="pin" size={16} /> Закрепить
            </button>
            <button className="context-menu-item" onClick={() => { onMuteChat(contextMenu.chatId, 3600); setContextMenu(null); }}>
              <Icon name="bell-off" size={16} /> Замутить
            </button>
            <button className="context-menu-item" onClick={() => { onArchiveChat(contextMenu.chatId); setContextMenu(null); }}>
              <Icon name="archive" size={16} /> Архивировать
            </button>
            <button className="context-menu-item" onClick={() => { onAddToFolder(contextMenu.chatId); setContextMenu(null); }}>
              <Icon name="folder" size={16} /> Добавить в папку
            </button>
            <button className="context-menu-item" onClick={() => { onClearHistory(contextMenu.chatId); setContextMenu(null); }}>
              <Icon name="trash-2" size={16} /> Очистить историю
            </button>
            <button className="context-menu-item" onClick={() => { onBlockUser(contextMenu.chatId); setContextMenu(null); }}>
              <Icon name="ban" size={16} /> Заблокировать
            </button>
            <div className="context-menu-divider" />
            <button className="context-menu-item danger" onClick={() => { onDeleteChat(contextMenu.chatId); setContextMenu(null); }}>
              <Icon name="delete" size={16} /> Удалить чат
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
