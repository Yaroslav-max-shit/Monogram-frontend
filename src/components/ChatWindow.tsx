import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './Icon';
import EmojiPicker from './EmojiPicker';
import MessageContextMenu from './MessageContextMenu';
import MessageReactions from './MessageReactions';
import FileMessage from './FileMessage';
import MediaViewer from './MediaViewer';
import VoiceRecorder from './VoiceRecorder';
import TransferCard from './TransferCard';
import TransferModal from './TransferModal';
import { LinkPreview } from './Messages/LinkPreview';
import { formatMessageText } from '../utils/formatMessage';

const VoiceMessagePlayer: React.FC<{ url: string; duration: number }> = ({ url, duration }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bars] = useState(() => Array.from({ length: 30 }, () => Math.random() * 0.7 + 0.3));

  const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
  const audioUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-message-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress(audioRef.current.currentTime / audioRef.current.duration);
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />
      <button className="voice-play-btn" onClick={togglePlay}>
        <Icon name={isPlaying ? 'pause' : 'play'} size={16} />
      </button>
      <div className="voice-waveform-container">
        <div className="voice-waveform">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`voice-bar ${i / bars.length < progress ? 'active' : ''}`}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      </div>
      <span className="voice-duration">{formatTime(duration)}</span>
    </div>
  );
};
import PollView from './PollView';
import apiClient from '../services/api';
import { getCachedMessages, cacheMessages, isOnline, addToOutbox, OutboxMessage, syncOutbox, onOnlineStatusChange } from '../services/cache';
import { decryptMessage, encryptMessage, isEncrypted } from '../services/encryption';
import { realtime } from '../services/realtime';
import MentionDropdown from './MentionDropdown';
import StickerPicker from './StickerPicker';
import SchedulePicker from './SchedulePicker';
import { useSlashCommands } from '../hooks/useSlashCommands';
import MediaGallery from './Media/MediaGallery';
import MessageStatus from './MessageStatus';
import MessageSelector from './MessageSelector';
import PinnedBar from './PinnedBar';
import VideoPlayer from './VideoPlayer';
import AutoDeleteTimer from './AutoDeleteTimer';
import TranslatorModal from './TranslatorModal';
import './ChatWindow.css';
import './TransferCard.css';

interface Message {
  id: number;
  content: string;
  sender_id: number;
  chat_id: number;
  timestamp: string;
  edited: boolean;
  reactions?: any[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  is_deleted?: boolean;
  is_forwarded?: boolean;
  forwarded_from_message_id?: number;
  original_chat_id?: number;
  read_at?: string;
  delivered_at?: string;
  auto_delete_at?: string;
  reply_to_id?: number;
}

interface DraftData {
  content: string;
  fileIds: string[];
  replyTo?: number;
}

interface ChatWindowProps {
  chatId: number;
  chatName: string;
  chatType?: string;
  currentUserId: number;
  onChatHeaderClick: () => void;
  e2eeEnabled: boolean;
  onForwardMessage?: (messageId: number) => void;
  onSaveDraft?: (chatId: number, text: string) => void;
  onStartCall?: (peerId: number, peerName: string) => void;
  onStartGroupCall?: () => void;
  onMessageSent?: () => void;
  isBot?: boolean;
  description?: string;
}

const MAX_MESSAGES = 500;

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chatId, 
  chatName, 
  chatType = 'private',
  currentUserId, 
  onChatHeaderClick,
  e2eeEnabled,
  onForwardMessage,
  onSaveDraft,
  onStartCall,
  onMessageSent,
  isBot = false,
  description,
  onStartGroupCall,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const inputTextRef = useRef('');
  const updateInputText = (val: string) => { inputTextRef.current = val; setInputText(val); };
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showChatHeaderMenu, setShowChatHeaderMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [quoteText, setQuoteText] = useState('');
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerUrl, setMediaViewerUrl] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [translateText, setTranslateText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [forwardMode, setForwardMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [showForwardSelector, setShowForwardSelector] = useState(false);
  const [chatsForForward, setChatsForForward] = useState<any[]>([]);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingDurationRef = useRef(0);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<{ msgId: number; x: number; y: number } | null>(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState<number[]>([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(0);
  const [isBlocked, setIsBlocked] = useState<'none' | 'by_me' | 'by_them'>('none');

  // Scroll animations
  const visibleMessages = useRef(new Set<number>());
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // @Mentions
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [chatMembers, setChatMembers] = useState<Array<{ id: number; username: string; first_name: string; last_name: string }>>([]);
  const mentionTriggerIndex = useRef(-1);
  
  // Slash Commands
  const [botCommandsData, setBotCommandsData] = useState<any[]>([]);

  // Загружаем команды бота при открытии бот-чата
  useEffect(() => {
    if (isBot && messages.length === 0) {
      // Получаем команды из последнего сообщения с bot_id или из API
      apiClient.get(`/chats/`).then(res => {
        const chat = res.data?.find((c: any) => c.id === chatId);
        if (chat?.bot_commands) {
          setBotCommandsData(chat.bot_commands);
        }
      }).catch(() => {});
    }
  }, [isBot, chatId]);

  const slashCommands = useSlashCommands(chatType, chatMembers, isBot, botCommandsData);
  const [showCommandList, setShowCommandList] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [commandSelected, setCommandSelected] = useState(false);
  
  // Stickers
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  
  // Schedule
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Voice recording
  const [voiceLocked, setVoiceLocked] = useState(false);
  const voiceLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const typingIndicatorTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const touchStartRef = useRef<{ x: number; y: number; messageId: number | null }>({ x: 0, y: 0, messageId: null });
  const [swipeOffset, setSwipeOffset] = useState<{ messageId: number; offset: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [delayedRead, setDelayedRead] = useState(() => localStorage.getItem('delayed_read') === 'true');
  const readTimeoutRef = useRef<number>();
  const chatIdRef = useRef(chatId);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const scrollPositionRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const [showPinnedBar, setShowPinnedBar] = useState(false);
  const [autoDeleteTimer, setAutoDeleteTimer] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    scrollPositionRef.current = container.scrollTop;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollButton(!atBottom);
  };

  const handleDoubleClick = (messageId: number, e?: React.MouseEvent) => {
    if (e) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setShowReactionPicker({ msgId: messageId, x: rect.left, y: rect.top - 40 });
    } else {
      handleReact(messageId, '👍');
    }
  };

  const startLongPress = (messageId: number) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedIds(prev => new Set(prev).add(messageId));
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  };

  const toggleMessageSelection = (messageId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
        if (next.size === 0) setIsSelectionMode(false);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleForwardSelected = () => {
    if (selectedIds.size > 0 && onForwardMessage) {
      onForwardMessage(Array.from(selectedIds)[0]);
    }
    clearSelection();
  };

  const handleDeleteSelected = async () => {
    for (const id of Array.from(selectedIds)) {
      await handleDeleteMessage(id);
    }
    clearSelection();
  };

  const handleCopySelected = () => {
    const texts = messages
      .filter(m => selectedIds.has(m.id))
      .map(m => m.content)
      .join('\n---\n');
    navigator.clipboard.writeText(texts);
    clearSelection();
  };

  const handleNavigateToPinned = (messageId: number) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const loadWallpaper = () => {
    const saved = localStorage.getItem(`wallpaper_${chatId}`);
    if (saved) setWallpaperUrl(saved);
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!showAttachMenu) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-input-container')) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showAttachMenu]);

  useEffect(() => {
    loadWallpaper();
  }, [chatId]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingIndicatorTimeoutsRef.current.forEach(t => clearTimeout(t));
      typingIndicatorTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const requestIdRef = useRef(0);

  const loadMessages = useCallback(async () => {
    const thisRequestId = ++requestIdRef.current;
    // Сначала загружаем из кэша (мгновенно)
    const cached = await getCachedMessages(chatId);
    if (cached.length > 0) {
      setMessages(cached);
      setIsLoading(false);
    }
    
    // Потом синхронизируем с сервером
    try {
      const response = await apiClient.get(`/messages/chat/${chatId}?limit=20`);
      if (thisRequestId !== requestIdRef.current) return;
      let msgs = response.data;
      
      // Always try to decrypt if content looks encrypted
      msgs = await Promise.all(msgs.map(async (msg: Message) => {
        if (!msg.is_deleted && isEncrypted(msg.content)) {
          try {
            const decrypted = await decryptMessage(msg.content, msg.sender_id, currentUserId, chatId);
            try {
              const parsed = JSON.parse(decrypted);
              if (parsed.text) {
                return { ...msg, content: parsed.text };
              }
            } catch {}
            return { ...msg, content: decrypted };
          } catch {
            return msg;
          }
        }
        return msg;
      }));
      
      msgs = msgs.map((msg: Message) => {
        if (msg.sender_id !== currentUserId) return { ...msg, status: 'delivered' as const };
        if (msg.read_at) return { ...msg, status: 'read' as const };
        if (msg.delivered_at) return { ...msg, status: 'delivered' as const };
        return { ...msg, status: 'sent' as const };
      });
      
      if (msgs.length > MAX_MESSAGES) {
        msgs = msgs.slice(msgs.length - MAX_MESSAGES);
      }
      setMessages(msgs);
      setHasMoreMessages(msgs.length >= 20);
      // Кэшируем сообщения
      cacheMessages(chatId, msgs);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, currentUserId]);

  // Загрузка старых сообщений при скролле вверх
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return;
    
    setLoadingMore(true);
    try {
      const oldestId = messages[0]?.id;
      if (!oldestId) return;
      
      const response = await apiClient.get(`/messages/chat/${chatId}?before_id=${oldestId}&limit=20`);
      let olderMsgs = response.data;
      
      if (olderMsgs.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      
      // Decrypt older messages
      olderMsgs = await Promise.all(olderMsgs.map(async (msg: Message) => {
        if (!msg.is_deleted && isEncrypted(msg.content)) {
          try {
            const decrypted = await decryptMessage(msg.content, msg.sender_id, currentUserId, chatId);
            try {
              const parsed = JSON.parse(decrypted);
              if (parsed.text) {
                return { ...msg, content: parsed.text };
              }
            } catch {}
            return { ...msg, content: decrypted };
          } catch {
            return msg;
          }
        }
        return msg;
      }));
      
      olderMsgs = olderMsgs.map((msg: Message) => ({
        ...msg,
        status: msg.sender_id === currentUserId ? 'read' : 'delivered'
      }));
      
      setMessages(prev => {
        const combined = [...olderMsgs, ...prev];
        if (combined.length > MAX_MESSAGES) {
          return combined.slice(combined.length - MAX_MESSAGES);
        }
        return combined;
      });
      setHasMoreMessages(olderMsgs.length >= 20);
    } catch (error) {
      console.error('Ошибка загрузки старых сообщений:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, currentUserId, messages, loadingMore, hasMoreMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Sync outbox when coming back online
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(async (online) => {
      if (online) {
        await syncOutbox(async (msg) => {
          try {
            await apiClient.post('/messages/', {
              content: msg.content,
              chat_id: msg.chatId,
              recipient_id: msg.recipientId,
            });
            return true;
          } catch { return false; }
        });
        loadMessages();
      }
    });
    return unsubscribe;
  }, [loadMessages]);


  // Подписка на typing индикаторы через WebSocket
  useEffect(() => {
    if (!chatId || !currentUserId) return () => {};
    
    const unsubscribe = realtime.on('typing', (data: any) => {
      if (data.chat_id === chatId && data.user_id !== currentUserId) {
        setTypingUsers(prev => new Set([...prev, data.user_id]));
        // Убираем через 3 секунды
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.user_id);
            return next;
          });
        }, 3000);
        typingIndicatorTimeoutsRef.current.push(timeout);
      }
    });
    
    return () => {
      typingIndicatorTimeoutsRef.current.forEach(t => clearTimeout(t));
      typingIndicatorTimeoutsRef.current = [];
      unsubscribe();
    };
  }, [chatId, currentUserId]);

  // Infinite scroll — загрузка старых сообщений при скролле вверх
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMoreMessages) return;

    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    container.prepend(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadMoreMessages();
          }
        });
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, [loadingMore, hasMoreMessages, loadMoreMessages]);

  // IntersectionObserver for message scroll animations
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (isLoading) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = Number(entry.target.getAttribute('data-message-id'));
          if (!id) return;
          if (entry.isIntersecting) {
            if (!visibleMessages.current.has(id)) {
              visibleMessages.current.add(id);
              const el = messageRefs.current.get(id);
              if (el) {
                const msg = messagesRef.current.find(m => m.id === id);
                const isOwn = msg?.sender_id === currentUserId;
                el.classList.remove('msg-exit-right', 'msg-exit-left');
                el.classList.add(isOwn ? 'msg-enter-right' : 'msg-enter-left');
              }
            }
          } else {
            if (visibleMessages.current.has(id)) {
              visibleMessages.current.delete(id);
              const el = messageRefs.current.get(id);
              if (el) {
                const msg = messagesRef.current.find(m => m.id === id);
                const isOwn = msg?.sender_id === currentUserId;
                el.classList.remove('msg-enter-right', 'msg-enter-left');
                el.classList.add(isOwn ? 'msg-exit-right' : 'msg-exit-left');
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0,
      }
    );

    const msgElements = container.querySelectorAll('[data-message-id]');
    msgElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [isLoading, currentUserId, chatId]);
  const loadChatMembers = useCallback(async () => {
    try {
      const res = await apiClient.get(`/chats/${chatId}/members`);
      const members = (res.data || []).map((m: any) => ({
        id: m.user_id,
        username: m.username,
        first_name: m.first_name || '',
        last_name: m.last_name || '',
      }));
      setChatMembers(members);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, [chatId]);

  useEffect(() => {
    let cancelled = false;
    // Объединённая загрузка: members + block check + draft за один проход
    const loadData = async () => {
      try {
        const blockId = (chatType === 'private') && !isBot ? (chatMembers.find(m => m.id !== currentUserId)?.id || 0) : 0;
        const requests: Promise<any>[] = [
          apiClient.get(`/chats/${chatId}/members`),
        ];
        if (blockId > 0) requests.push(apiClient.get(`/users/is-blocked/${blockId}`).catch(() => null));
        if (onSaveDraft) requests.push(apiClient.get(`/drafts/${chatId}`).catch(() => null));

        const results = await Promise.all(requests);
        if (cancelled) return;

        const membersRes = results[0];
        const blockRes = blockId > 0 ? results[1] : null;
        const draftRes = onSaveDraft ? results[blockId > 0 ? 2 : 1] : null;

        const members = (membersRes.data || []).map((m: any) => ({
          id: m.user_id,
          username: m.username,
          first_name: m.first_name || '',
          last_name: m.last_name || '',
        }));
        setChatMembers(members);

        if (blockRes?.data) {
          if (blockRes.data.blocked_by_them) setIsBlocked('by_them');
          else if (blockRes.data.blocked_by_me) setIsBlocked('by_me');
        }

        if (draftRes?.data?.content) {
          setInputText(draftRes.data.content);
          inputTextRef.current = draftRes.data.content;
        }
      } catch (err) {
        console.error('Failed to load chat data:', err);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [chatId]);

  const updateMessageStatus = (messageId: number, status: Message['status']) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // F23 - Delayed read receipt
  const markAsRead = useCallback(() => {
    const unreadIds = messages.filter(m => m.sender_id !== currentUserId && !m.read_at).map(m => m.id);
    if (unreadIds.length > 0) {
      apiClient.post('/messages/read', { message_ids: unreadIds }).catch(() => {});
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    if (delayedRead) {
      readTimeoutRef.current = window.setTimeout(() => { markAsRead(); }, 2000);
      return () => { if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current); };
    } else {
      markAsRead();
    }
  }, [chatId, delayedRead, markAsRead]);

  // F24 - Draft with media
  const saveDraftWithMedia = useCallback((content: string, fileIds: string[], replyTo?: number) => {
    const draftData = JSON.stringify({ content, fileIds, replyTo });
    localStorage.setItem(`draft_${chatId}`, draftData);
  }, [chatId]);

  const loadDraftWithMedia = useCallback((): { content: string; fileIds: string[]; replyTo?: number } | null => {
    try {
      const raw = localStorage.getItem(`draft_${chatId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [chatId]);

  const handleSendMessage = async () => {
    const text = inputTextRef.current;
    if (!text.trim()) return;
    
    let content = text;
    
    if (replyTo) {
      content = JSON.stringify({
        text: content,
        reply_to: replyTo.id,
        reply_text: replyTo.content
      });
    }
    
    if (quoteText) {
      content = JSON.stringify({
        text: content,
        quote: quoteText,
        quote_author: selectedMessage?.sender_id
      });
    }
    
    // Определяем получателя для шифрования
    // Для приватных чатов — другой участник, для групп — первый участник (кроме себя)
    let recipientUserId = currentUserId;
    if (chatMembers.length > 0) {
      const otherMember = chatMembers.find(m => m.id !== currentUserId);
      if (otherMember) {
        recipientUserId = otherMember.id;
      }
    }
    
    // Шифруем сообщение
    content = await encryptMessage(content, recipientUserId, currentUserId, chatId);
    
    const tempId = Date.now();
    const tempMessage: Message = {
      id: tempId,
      content: text,
      sender_id: currentUserId,
      chat_id: chatId,
      timestamp: new Date().toISOString(),
      edited: false,
      status: 'sending'
    };
    setMessages(prev => {
      const updated = [...prev, tempMessage];
      if (updated.length > MAX_MESSAGES) return updated.slice(updated.length - MAX_MESSAGES);
      return updated;
    });
    setInputText('');
    inputTextRef.current = '';
    setSelectedSticker(null);
    if (onSaveDraft) {
      onSaveDraft(chatId, '');
    }
    setReplyTo(null);
    setQuoteText('');
    scrollToBottom();
    
    // If offline — queue in outbox for later sync
    if (!isOnline()) {
      const recipientMember = chatMembers.find(m => m.id !== currentUserId);
      const recipientId = recipientMember?.id || undefined;
      await addToOutbox({
        tempId,
        chatId,
        content,
        recipientId,
        timestamp: new Date().toISOString(),
        retries: 0,
      });
      updateMessageStatus(tempId, 'sent');
      return;
    }
    
    try {
      // Определяем recipient_id для нового чата
      const recipientMember = chatMembers.find(m => m.id !== currentUserId);
      const recipientId = recipientMember?.id || undefined;
      
      const response = await apiClient.post('/messages/', {
        content: content,
        chat_id: chatId,
        recipient_id: recipientId,
      });
      
      // Notify @mentions
      if (text.includes('@')) {
        apiClient.post('/messages/mention', {
          content: text,
          chat_id: chatId
        }).catch(() => {});
      }
      
      const newMessage = response.data;
      if (e2eeEnabled && newMessage.sender_id === currentUserId) {
        newMessage.content = text;
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...newMessage, status: 'sent' } : msg
      ));
      
      // Отправляем через WebSocket для реалтайм-доставки
      realtime.send({
        type: 'new_message',
        chat_id: chatId,
        content: text,
        sender_id: currentUserId
      });
      if (onMessageSent) onMessageSent();
    } catch (error) {
      console.error('Ошибка отправки:', error);
      updateMessageStatus(tempId, 'error');
    }
  };

  const handleDeleteForEveryone = async (messageId: number) => {
    try {
      await apiClient.delete(`/messages/${messageId}`);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, content: "🗑 Сообщение удалено", is_deleted: true } : msg
      ));
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const handleForwardMessages = async () => {
    setShowForwardSelector(true);
    const res = await apiClient.get('/chats/');
    setChatsForForward(res.data);
  };

  const handleConfirmForward = async (targetChatId: number) => {
    try {
      await apiClient.post('/messages/forward', {
        message_ids: selectedMessages,
        target_chat_id: targetChatId
      });
      setForwardMode(false);
      setSelectedMessages([]);
      setShowForwardSelector(false);
    } catch (error) {
      console.error('Ошибка пересылки:', error);
    }
  };

  const handleEditMessage = async (messageId: number, newText: string) => {
    try {
      await apiClient.put(`/messages/${messageId}`, { content: newText });
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: newText, edited: true } : msg
      ));
    } catch (error) {
      console.error('Ошибка редактирования:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await apiClient.delete(`/messages/${messageId}`);
    } catch {
      // Even if backend rejects (not owner), remove locally
    }
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleAutoDelete = async (messageId: number, seconds: number) => {
    try {
      await apiClient.post(`/messages/${messageId}/auto-delete`, { seconds });
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          if (seconds === 0) {
            return { ...msg, auto_delete_at: null } as any;
          }
          const autoDeleteAt = new Date(Date.now() + seconds * 1000).toISOString();
          return { ...msg, auto_delete_at: autoDeleteAt } as any;
        }
        return msg;
      }));
      setShowContextMenu(false);
    } catch (error) {
      console.error('Ошибка установки автоудаления:', error);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowContextMenu(false);
  };

  const handleMediaClick = (url: string) => {
    setMediaViewerUrl(url);
    setShowMediaViewer(true);
  };

  const handleReact = async (messageId: number, emoji: string) => {
    try {
      await apiClient.post('/messages/react', { message_id: messageId, emoji });
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])];
        const existing = reactions.findIndex((r: any) => r.user_id === currentUserId);
        if (existing >= 0) {
          if (reactions[existing].emoji === emoji) {
            reactions.splice(existing, 1);
          } else {
            reactions[existing] = { ...reactions[existing], emoji };
          }
        } else {
          reactions.push({ user_id: currentUserId, emoji });
        }
        return { ...msg, reactions };
      }));
    } catch {}
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // Отправляем typing event через WebSocket
    realtime.send({ type: 'typing', chat_id: chatId, user_id: currentUserId });
    typingTimeoutRef.current = setTimeout(() => {}, 1000);
  };

  // Save draft only when leaving chat (unmount or chat change)
  useEffect(() => {
    return () => {
      if (onSaveDraft && inputText.trim()) {
        onSaveDraft(chatId, inputText);
      }
    };
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    handleTyping();

    // @Mentions detection
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex >= 0 && (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ')) {
      const afterAt = value.slice(lastAtIndex + 1);
      // Only trigger if there's no space after @
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(afterAt);
        mentionTriggerIndex.current = lastAtIndex;
        // Position the dropdown near the textarea
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setMentionPosition({ top: rect.top - 200, left: rect.left });
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    // Slash commands detection (group chats AND bot chats)
    if (value.startsWith('/') && (chatType !== 'private' || isBot)) {
      const cmdResult = slashCommands.handleInput(value);
      setShowCommandList(cmdResult.showCommands);
      setFilteredCommands(cmdResult.filteredCommands);
    } else {
      setShowCommandList(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    if (!username) { setShowMentions(false); return; }
    const before = inputText.slice(0, mentionTriggerIndex.current);
    const after = inputText.slice(mentionTriggerIndex.current + mentionFilter.length + 1);
    setInputText(`${before}@${username} ${after}`);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleCommandSelect = (cmd: string) => {
    setInputText(cmd + ' ');
    setShowCommandList(false);
    setCommandSelected(true);
    inputRef.current?.focus();
  };

  const handleCommandMemberSelect = (username: string) => {
    const newText = slashCommands.selectMember(username);
    setInputText(newText);
    slashCommands.reset();
    inputRef.current?.focus();
  };

  const handleStickerSelect = (stickerUrl: string) => {
    setSelectedSticker(stickerUrl);
    setShowStickerPicker(false);
    inputRef.current?.focus();
  };

  const handleScheduleMessage = async (scheduledFor: string) => {
    if (!inputText.trim()) return;
    
    let recipientUserId = currentUserId;
    if (chatMembers.length > 0) {
      const otherMember = chatMembers.find(m => m.id !== currentUserId);
      if (otherMember) recipientUserId = otherMember.id;
    }
    
    const encryptedContent = await encryptMessage(inputText, recipientUserId, currentUserId, chatId);
    
    apiClient.post('/messages/schedule', {
      content: encryptedContent,
      chat_id: chatId,
      scheduled_for: scheduledFor,
    }).then(() => {
      setShowSchedulePicker(false);
      setInputText('');
    }).catch(err => console.error('Schedule error:', err));
  };

  const startVoiceRecording = () => {
    setIsVoiceRecording(true);
    setRecordingDuration(0);
    recordingDurationRef.current = 0;
    
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => {
        recordingDurationRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const tempId = Date.now();
        const duration = recordingDurationRef.current;
        const voiceContent = JSON.stringify({ type: 'voice', duration });
        
        const tempMessage: Message = {
          id: tempId,
          content: voiceContent,
          sender_id: currentUserId,
          chat_id: chatId,
          timestamp: new Date().toISOString(),
          edited: false,
          status: 'sending'
        };
        setMessages(prev => {
          const updated = [...prev, tempMessage];
          if (updated.length > MAX_MESSAGES) return updated.slice(updated.length - MAX_MESSAGES);
          return updated;
        });
        scrollToBottom();
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('chat_id', String(chatId));
        formData.append('duration', String(duration));
        
        try {
          await apiClient.post('/messages/upload-audio', formData);
          loadMessages();
        } catch (error) {
          console.error('Ошибка отправки голосового:', error);
          updateMessageStatus(tempId, 'error');
        }
        
        stream.getTracks().forEach(track => track.stop());
        setIsVoiceRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      
      mediaRecorder.start();
    }).catch(err => {
      console.error('Microphone error:', err);
      setIsVoiceRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    });
  };

  const stopVoiceRecording = () => {
    if (voiceLongPressRef.current) {
      clearTimeout(voiceLongPressRef.current);
      voiceLongPressRef.current = null;
    }
    if (mediaRecorderRef.current && isVoiceRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceTouchMove = (e: React.TouchEvent) => {
    if (!isVoiceRecording) return;
    const touch = e.touches[0];
    const startX = (e.target as HTMLElement).getBoundingClientRect().left;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - (e.target as HTMLElement).getBoundingClientRect().top;
    
    if (deltaX < -50) {
      // Swipe left = delete
      stopVoiceRecording();
      setIsVoiceRecording(false);
      setVoiceLocked(false);
    } else if (deltaY < -50) {
      // Swipe up = lock
      setVoiceLocked(true);
    }
  };

  const handleSendButton = () => {
    if (inputText.trim() || selectedSticker) {
      if (selectedSticker && !inputText.trim()) {
        const stickerContent = JSON.stringify({ type: 'sticker', url: selectedSticker });
        apiClient.post('/messages/', { content: stickerContent, chat_id: chatId }).then(() => {
          loadMessages();
          setSelectedSticker(null);
        }).catch(err => console.error('Sticker send error:', err));
        return;
      }
      if (selectedSticker && inputText.trim()) {
        const stickerContent = JSON.stringify({ type: 'sticker', url: selectedSticker });
        apiClient.post('/messages/', { content: stickerContent, chat_id: chatId }).catch(() => {});
        setSelectedSticker(null);
      }
      handleSendMessage();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('chat_id', String(chatId));
    
    try {
      await apiClient.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadMessages();
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const autoResize = () => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isSelectionMode) {
      clearSelection();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showMentions && chatMembers.length > 0) {
        const filtered = chatMembers.filter(m =>
          m.username.toLowerCase().includes(mentionFilter.toLowerCase()) ||
          (m.first_name || '').toLowerCase().includes(mentionFilter.toLowerCase()) ||
          (m.last_name || '').toLowerCase().includes(mentionFilter.toLowerCase())
        );
        if (filtered.length > 0) {
          handleMentionSelect(filtered[0].username);
          return;
        }
      }
      if (slashCommands.showMemberList && slashCommands.filteredMembers.length > 0) {
        handleCommandMemberSelect(slashCommands.filteredMembers[0].username);
        return;
      }
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setSelectedMessage(message);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      messageId: message.id
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current.messageId) return;
    
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    
    if (deltaX > 10 && Math.abs(deltaY) < 40) {
      setSwipeOffset({ messageId: touchStartRef.current.messageId!, offset: Math.min(deltaX, 120) });
    }
    
    if (deltaX > 80 && Math.abs(deltaY) < 40) {
      const msg = messages.find(m => m.id === touchStartRef.current.messageId);
      if (msg) handleReply(msg);
      touchStartRef.current = { x: 0, y: 0, messageId: null };
      setSwipeOffset(null);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setShowContextMenu(false);
    inputRef.current?.focus();
  };

  const handleQuote = (message: Message, selectedText: string) => {
    if (selectedText && selectedText !== message.content) {
      setQuoteText(selectedText);
      setSelectedMessage(message);
      setShowContextMenu(false);
      inputRef.current?.focus();
    } else {
      handleReply(message);
    }
  };

  const handleWhoForwarded = async (message: Message) => {
    try {
      const res = await apiClient.get(`/messages/${message.id}/forwarded-by`);
      const users = Array.isArray(res.data) ? res.data : (res.data.users || []);
      if (users.length === 0) {
        alert('Нет информации о пересылке');
      } else {
        alert(`Переслали: ${users.map((u: any) => u.username || u.full_name || u.id).join(', ')}`);
      }
    } catch {
      alert('Не удалось получить информацию');
    }
    setShowContextMenu(false);
  };

  const handleSelectForForward = (messageId: number) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMessageStatusIcon = (status?: Message['status']) => {
    if (status === 'error') {
      return <span className="status-error" style={{ color: '#ef4444', fontSize: 12 }}>!</span>;
    }
    if (!status) return null;
    return <MessageStatus status={status} />;
  };

  const renderMessage = (msg: Message) => {
    const isOwn = msg.sender_id === currentUserId;
    let content = msg.content;
    let replyToMsg = null;
    let quoteMsg = null;
    let isVoice = false;
    let voiceDuration = 0;
    let botButtons: any[] = null;
    let botText = '';
    let forwardedComment = '';
    let isFile = false;
    let fileData: any = null;
    
    if (msg.is_deleted) {
      content = "🗑 Сообщение удалено";
    }
    
    let voiceUrl = '';
    let origParsed: any = null;
    try {
      origParsed = JSON.parse(msg.content);
      if (origParsed.type === 'bot_inline' && origParsed.buttons) {
        botButtons = origParsed.buttons;
        botText = origParsed.text || '';
        content = origParsed.text || '';
      }
      if (origParsed.reply_to) {
        content = origParsed.text;
        replyToMsg = messages.find(m => m.id === origParsed.reply_to);
      }
      if (origParsed.quote) {
        content = origParsed.text;
        quoteMsg = { text: origParsed.quote, author: origParsed.quote_author };
      }
      if (origParsed.type === 'voice') {
        isVoice = true;
        voiceDuration = origParsed.duration || 0;
        voiceUrl = origParsed.url || '';
        content = '🎤 Голосовое сообщение';
      }
      if (origParsed.type === 'forwarded') {
        content = origParsed.original_content || '';
        if (origParsed.comment) {
          forwardedComment = origParsed.comment;
        }
      }
      if (origParsed.type === 'file' && origParsed.files) {
        isFile = true;
        fileData = origParsed;
      }
    } catch {}
    
    const urls = extractUrls(content);
    const hasLinks = urls.length > 0;
    
    return (
      <div
        key={msg.id}
        ref={(el) => { if (el) messageRefs.current.set(msg.id, el); else messageRefs.current.delete(msg.id); }}
        data-message-id={msg.id}
        className={`message ${isOwn ? 'own' : 'other'} ${forwardMode ? 'selectable' : ''} ${selectedMessages.includes(msg.id) ? 'selected' : ''} ${chatSearchResults.includes(messages.indexOf(msg)) ? 'search-match' : ''} ${chatSearchResults.length > 0 && chatSearchResults[currentSearchIdx] === messages.indexOf(msg) ? 'search-current' : ''} ${isSelectionMode ? 'message-selectable' : ''} ${selectedIds.has(msg.id) ? 'message-selected' : ''} ${swipeOffset?.messageId === msg.id ? 'swiping' : ''}`}
        style={swipeOffset?.messageId === msg.id ? { transform: `translateX(${swipeOffset.offset}px)`, transition: 'none' } : swipeOffset?.messageId === msg.id ? undefined : undefined}
        onDoubleClick={(e) => handleDoubleClick(msg.id, e)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isSelectionMode) {
            toggleMessageSelection(msg.id);
          } else {
            handleContextMenu(e, msg);
          }
        }}
        onTouchStart={(e) => {
          if (isSelectionMode) {
            toggleMessageSelection(msg.id);
            return;
          }
          handleTouchStart(e, msg);
          startLongPress(msg.id);
        }}
        onTouchMove={(e) => {
          clearLongPress();
          handleTouchMove(e);
        }}
        onTouchEnd={() => { clearLongPress(); setSwipeOffset(null); }}
        onClick={() => {
          if (isSelectionMode) {
            toggleMessageSelection(msg.id);
          } else if (forwardMode) {
            handleSelectForForward(msg.id);
          }
        }}
      >
        {replyToMsg && (
          <div className="message-reply" onClick={() => handleReply(replyToMsg)}>
            <Icon name="reply" size={14} />
            <span>{replyToMsg.content.substring(0, 50)}</span>
          </div>
        )}
        
        {quoteMsg && (
          <div className="message-quote">
            <Icon name="quote" size={14} />
            <span>Цитата: {quoteMsg.text.substring(0, 50)}</span>
          </div>
        )}
        
        {msg.is_forwarded && (
          <div className="message-forwarded">
            <Icon name="forward" size={12} />
            <span>Переслано</span>
          </div>
        )}
        
        {forwardedComment && (
          <div className="message-forwarded-comment" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, fontStyle: 'italic' }}>
            {forwardedComment}
          </div>
        )}
        
        {!isOwn && <div className="message-sender">{chatName}</div>}
        
        {editingMsgId === msg.id ? (
          <div className="message-edit-area">
            <textarea
              className="edit-input"
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              autoFocus
            />
            <div className="edit-actions">
              <button className="btn-cancel-edit" onClick={() => setEditingMsgId(null)}>Отмена</button>
              <button className="btn-save-edit" onClick={() => { handleEditMessage(msg.id, editingText); setEditingMsgId(null); }}>Сохранить</button>
            </div>
          </div>
        ) : isVoice ? (
          <VoiceMessagePlayer url={voiceUrl} duration={voiceDuration} />
        ) : origParsed?.type === 'transfer' ? (
          <TransferCard amount={origParsed.amount} toUsername={origParsed.to_username} toAvatar={origParsed.to_avatar} status={origParsed.status || 'completed'} time={new Date(msg.timestamp).toLocaleString('ru-RU')} txId={origParsed.tx_id} comment={origParsed.comment} isOwn={isOwn} />
        ) : origParsed?.type === 'poll' ? (
          <PollView poll={origParsed} messageId={msg.id} currentUserId={currentUserId} />
        ) : origParsed?.type === 'connect_proposal' ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))',
                  border: '1px solid rgba(102,126,234,0.3)',
                  borderRadius: 14, padding: '16px', maxWidth: 280,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: 800, color: '#000', flexShrink: 0,
                    }}>Q</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Подключить QuarkPay</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Для переводов в чатах</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.4 }}>
                    Предлагаю подключить QuarkPay для удобных переводов прямо в чатах Monogram!
                  </p>
                  <a href={origParsed.connect_url} target="_blank" rel="noopener" style={{
                    display: 'block', width: '100%', padding: '10px',
                    background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                    color: '#000', border: 'none', borderRadius: 10,
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    textDecoration: 'none', textAlign: 'center',
                  }}>
                    Подключить
                  </a>
                </div>
        ) : origParsed?.type === 'file' && origParsed.files ? (() => {
              const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
              const guessType = (name: string) => {
                const ext = name.split('.').pop()?.toLowerCase() || '';
                if (['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)) return 'image/' + ext;
                if (['mp4','avi','mov','mkv','webm'].includes(ext)) return 'video/' + ext;
                if (['mp3','wav','ogg','m4a','flac'].includes(ext)) return 'audio/' + ext;
                if (ext === 'pdf') return 'application/pdf';
                if (['doc','docx'].includes(ext)) return 'application/msword';
                if (['xls','xlsx'].includes(ext)) return 'application/vnd.ms-excel';
                return 'application/octet-stream';
              };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                  {origParsed.files.map((f: any, idx: number) => {
                    const fileUrl = f.url?.startsWith('http') ? f.url : `${BACKEND_URL}${f.url}`;
                    const fileType = guessType(f.name || '');
                    const isImage = fileType.startsWith('image/');
                    const isVideo = fileType.startsWith('video/');
                    if (isImage) {
                      return (
                        <img
                          key={idx}
                          src={fileUrl}
                          alt={f.name || 'Файл'}
                          style={{ maxWidth: 280, borderRadius: 12, cursor: 'pointer' }}
                          onClick={() => setMediaViewerUrl(fileUrl)}
                        />
                      );
                    }
                    if (isVideo) {
                      return (
                        <video
                          key={idx}
                          src={fileUrl}
                          controls
                          style={{ maxWidth: 280, borderRadius: 12 }}
                        />
                      );
                    }
                    return (
                      <FileMessage
                        key={idx}
                        file={{
                          file_url: fileUrl,
                          file_name: f.name || 'Файл',
                          file_type: fileType,
                          file_size: f.size || 0,
                        }}
                        onMediaClick={(url) => setMediaViewerUrl(url)}
                      />
                    );
                  })}
                </div>
              );
        })() : origParsed?.type === 'location' ? (() => {
              const lat = origParsed.lat;
              const lng = origParsed.lng;
              return (
                <div style={{minWidth: 220}}>
                  <div style={{fontSize: '0.85rem', fontWeight: 600, marginBottom: 4}}>📍 Геолокация</div>
                  <iframe
                    title="location"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
                    style={{width: '100%', height: 160, border: 'none', borderRadius: 10, pointerEvents: 'none'}}
                    loading="lazy"
                  />
                  <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`} target="_blank" rel="noopener" style={{fontSize: '0.75rem', color: 'var(--accent)'}}>Открыть на карте</a>
                </div>
              );
        })() : (
          <div className="message-text">{formatMessageText(content)}</div>
        )}
        
        {hasLinks && !isFile && (
          <div className="message-links">
            {urls.map((url, idx) => (
              <LinkPreview key={idx} url={url} />
            ))}
          </div>
        )}

        {botButtons && botButtons.length > 0 && (
          <div className="bot-inline-buttons" style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8,
          }}>
            {botButtons.map((btn: any, idx: number) => {
              const handleBtnClick = () => {
                if (btn.action === 'open_url' && btn.url) {
                  const url = btn.url.startsWith('http') ? btn.url : `${window.location.origin}${btn.url}`;
                  window.open(url, '_blank');
                } else if (btn.action === 'copy' && btn.value) {
                  navigator.clipboard.writeText(btn.value).then(() => {
                    // Toast notification
                    const t = document.createElement('div');
                    t.textContent = 'Скопировано!';
                    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--bg-secondary);color:var(--text-primary);padding:10px 20px;border-radius:10px;z-index:99999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
                    document.body.appendChild(t);
                    setTimeout(() => t.remove(), 2000);
                  });
                } else if (btn.action === 'add_to_group') {
                  window.open(`${window.location.origin}/groups?bot_id=${msg.bot_id || ''}`, '_blank');
                } else if (btn.action === 'callback' && btn.data) {
                  apiClient.post('/bots/api/answerCallbackQuery', {
                    callback_query_id: msg.id,
                    data: btn.data,
                  }).catch(() => {});
                } else if (btn.action === 'pay') {
                  const payUrl = btn.url || btn.pay_url || btn.payment_url;
                  if (payUrl) {
                    window.open(payUrl.startsWith('http') ? payUrl : `${window.location.origin}${payUrl}`, '_blank');
                  } else {
                    const t = document.createElement('div');
                    t.textContent = btn.text || 'Оплата';
                    t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-secondary);color:var(--text-primary);padding:24px;border-radius:16px;z-index:99999;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,0.4);min-width:280;text-align:center;';
                    const titleDiv = document.createElement('div');
                    titleDiv.style.cssText = 'margin-bottom:16px;font-weight:600;font-size:1rem;';
                    titleDiv.textContent = btn.text || 'Оплата';
                    t.appendChild(titleDiv);
                    if (btn.description) {
                      const descDiv = document.createElement('div');
                      descDiv.style.cssText = 'margin-bottom:16px;color:var(--text-secondary);font-size:0.85rem;';
                      descDiv.textContent = btn.description;
                      t.appendChild(descDiv);
                    }
                    if (btn.amount) {
                      const amountDiv = document.createElement('div');
                      amountDiv.style.cssText = 'margin-bottom:16px;font-size:1.2rem;font-weight:700;color:var(--accent);';
                      amountDiv.textContent = btn.amount;
                      t.appendChild(amountDiv);
                    }
                    const confirmBtn = document.createElement('button');
                    confirmBtn.id = 'pay-confirm-btn';
                    confirmBtn.style.cssText = 'width:100%;padding:12px;background:var(--accent);color:white;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.9rem;';
                    confirmBtn.textContent = 'Оплатить';
                    t.appendChild(confirmBtn);
                    const cancelBtn = document.createElement('button');
                    cancelBtn.id = 'pay-cancel-btn';
                    cancelBtn.style.cssText = 'width:100%;padding:10px;background:transparent;color:var(--text-secondary);border:none;border-radius:10px;cursor:pointer;font-size:0.85rem;margin-top:8px;';
                    cancelBtn.textContent = 'Отмена';
                    t.appendChild(cancelBtn);
                    document.body.appendChild(t);
                    const backdrop = document.createElement('div');
                    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99998;';
                    document.body.appendChild(backdrop);
                    const cleanup = () => { t.remove(); backdrop.remove(); };
                    backdrop.addEventListener('click', cleanup);
                    t.querySelector('#pay-cancel-btn')?.addEventListener('click', cleanup);
                    t.querySelector('#pay-confirm-btn')?.addEventListener('click', () => {
                      cleanup();
                      if (btn.data) {
                        apiClient.post('/bots/api/answerCallbackQuery', {
                          callback_query_id: msg.id,
                          data: `pay:${btn.data}`,
                        }).catch(() => {});
                      }
                    });
                  }
                }
              };
              const btnTitle = btn.action === 'open_url' ? `Ссылка: ${btn.url || ''}`
                : btn.action === 'copy' ? `Текст для копирования: ${btn.value || ''}`
                : btn.action === 'add_to_group' ? 'Добавить бота в группу'
                : btn.action === 'callback' ? `Ответ: ${btn.data || ''}`
                : btn.action === 'pay' ? `Оплата: ${btn.text || ''}`
                : '';
              return (
                <button
                  key={idx}
                  onClick={handleBtnClick}
                  title={btnTitle}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(199,110,0,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
                >
                  <span>{btn.text}</span>
                  {btn.action === 'open_url' && <Icon name="arrow-right" size={12} style={{ opacity: 0.5, transform: 'rotate(-45deg)' }} />}
                  {btn.action === 'copy' && <Icon name="copy" size={12} style={{ opacity: 0.5 }} />}
                  {btn.action === 'add_to_group' && <Icon name="plus" size={12} style={{ opacity: 0.5 }} />}
                  {btn.action === 'pay' && <Icon name="wallet" size={12} style={{ opacity: 0.5 }} />}
                </button>
              );
            })}
          </div>
        )}
        
        <div className="message-meta">
          <span className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.edited && <span className="message-edited">(ред.)</span>}
          {isOwn && getMessageStatusIcon(msg.status)}
          <span
            className="message-reaction-add"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setShowReactionPicker({ msgId: msg.id, x: rect.left, y: rect.top - 40 });
            }}
          >
            😊
          </span>
        </div>
        
        {/* Reactions row */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="message-reactions-row">
            {Object.entries(
              (msg.reactions as any[]).reduce((acc: any, r: any) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className={`message-reaction-badge ${(msg.reactions as any[]).some((r: any) => r.user_id === currentUserId && r.emoji === emoji) ? 'active' : ''}`}
                onClick={() => handleReact(msg.id, emoji)}
              >
                {emoji} <span className="count">{count as number}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="chat-window loading">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-avatar skeleton"></div>
            <div>
              <div className="chat-header-name skeleton" style={{width: 120, height: 14}}></div>
              <div className="skeleton" style={{width: 80, height: 10, marginTop: 6}}></div>
            </div>
          </div>
        </div>
        <div className="chat-messages">
          {[85, 50, 95, 35, 70, 55, 80, 40].map((w, i) => (
            <div key={i} className="message-skeleton" style={{alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end'}}>
              <div className="skeleton" style={{width: `${w}%`, height: 14 + (i % 3) * 4, borderRadius: i % 2 === 0 ? '16px 16px 16px 4px' : '16px 16px 4px 16px'}}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header" onClick={onChatHeaderClick}>
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            <span>{chatName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="chat-header-details">
            <div className="chat-header-name">
              {chatName}
              {e2eeEnabled && (
                <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#4CAF50', fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
                  <Icon name="lock" size={13} />
                </span>
              )}
            </div>
            {typingUsers.size > 0 ? (
              <div className="chat-header-typing">печатает...</div>
            ) : !navigator.onLine ? (
              <div className="chat-header-typing" style={{color: 'var(--text-tertiary)'}}>Соединение...</div>
            ) : null}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-header-action" onClick={(e) => {
            e.stopPropagation();
            if (chatType === 'group' || chatType === 'channel') {
              onStartGroupCall?.();
            } else {
              const peerMember = chatMembers.find(m => m.id !== currentUserId);
              const peerId = peerMember?.id || 0;
              onStartCall?.(peerId, chatName);
            }
          }} title="Звонок">
            <Icon name="phone" size={20} />
          </button>
          <button className="chat-header-action" onClick={(e) => { e.stopPropagation(); setShowChatSearch(!showChatSearch); }}>
            <Icon name="search" size={20} />
          </button>
          <button className="chat-header-action" onClick={(e) => { e.stopPropagation(); setShowMediaGallery(true); }} aria-label="Медиа">
            <Icon name="picture" size={20} />
          </button>
          <button className="chat-header-action" onClick={(e) => { e.stopPropagation(); setShowChatHeaderMenu(!showChatHeaderMenu); }}>
            <Icon name="more" size={20} />
          </button>
        </div>
      </div>

      {showChatHeaderMenu && (
        <div className="chat-header-dropdown" style={{
          position: 'absolute', top: 56, right: 16, zIndex: 9999,
          background: 'var(--bg-secondary)', borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: 180, padding: '8px 0',
        }} onClick={(e) => e.stopPropagation()}>
          <button className="context-menu-item" onClick={() => { setShowChatHeaderMenu(false); setShowChatInfo(true); }}>
            <Icon name="info" size={16} /> Информация
          </button>
          <button className="context-menu-item" onClick={() => { setShowChatHeaderMenu(false); setShowChatSearch(true); }}>
            <Icon name="search" size={16} /> Поиск
          </button>
          <button className="context-menu-item" onClick={() => { setShowChatHeaderMenu(false); }}>
            <Icon name="mute" size={16} /> Выключить звук
          </button>
          <button className="context-menu-item" onClick={() => { setShowChatHeaderMenu(false); }}>
            <Icon name="folder" size={16} /> Добавить в папку
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item danger" onClick={() => { setShowChatHeaderMenu(false); }}>
            <Icon name="delete" size={16} /> Удалить чат
          </button>
        </div>
      )}
      
      {forwardMode && selectedMessages.length > 0 && (
        <div className="forward-bar">
          <span>Выбрано: {selectedMessages.length}</span>
          <button onClick={handleForwardMessages}>Переслать</button>
          <button onClick={() => { setForwardMode(false); setSelectedMessages([]); }}>Отмена</button>
        </div>
      )}
      
      {showChatSearch && (
        <div className="chat-search-bar">
          <input
            type="text"
            placeholder="Поиск в чате..."
            value={chatSearchQuery}
            onChange={(e) => {
              const q = e.target.value;
              setChatSearchQuery(q);
              if (q.length >= 2) {
                const results = messages
                  .map((m, idx) => ({ idx, msg: m }))
                  .filter(({ msg }) => msg.content.toLowerCase().includes(q.toLowerCase()))
                  .map(({ idx }) => idx);
                setChatSearchResults(results);
                setCurrentSearchIdx(results.length > 0 ? 0 : -1);
              } else {
                setChatSearchResults([]);
                setCurrentSearchIdx(-1);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (chatSearchResults.length > 0) {
                  const nextIdx = (currentSearchIdx + 1) % chatSearchResults.length;
                  setCurrentSearchIdx(nextIdx);
                  const msgEl = document.querySelector(`.chat-messages .message:nth-child(${chatSearchResults[nextIdx] + 1})`);
                  msgEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
            autoFocus
          />
          <span className="search-count">
            {chatSearchResults.length > 0 ? `${currentSearchIdx + 1}/${chatSearchResults.length}` : '0/0'}
          </span>
          <button className="search-nav-btn" onClick={() => {
            if (chatSearchResults.length > 0) {
              const prev = (currentSearchIdx - 1 + chatSearchResults.length) % chatSearchResults.length;
              setCurrentSearchIdx(prev);
              const msgEl = document.querySelector(`.chat-messages .message:nth-child(${chatSearchResults[prev] + 1})`);
              msgEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}>▲</button>
          <button className="search-nav-btn" onClick={() => {
            if (chatSearchResults.length > 0) {
              const next = (currentSearchIdx + 1) % chatSearchResults.length;
              setCurrentSearchIdx(next);
              const msgEl = document.querySelector(`.chat-messages .message:nth-child(${chatSearchResults[next] + 1})`);
              msgEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}>▼</button>
          <button className="search-close-btn" onClick={() => { setShowChatSearch(false); setChatSearchQuery(''); setChatSearchResults([]); }}>✕</button>
        </div>
      )}
      
      <PinnedBar chatId={chatId} onNavigate={handleNavigateToPinned} />

      <div
        ref={messagesContainerRef}
        className={`chat-messages ${isDragOver ? 'drag-over' : ''}`}
        style={wallpaperUrl ? { backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        onScroll={handleScroll}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            const dt = new DataTransfer();
            files.forEach(f => dt.items.add(f));
            if (fileInputRef.current) {
              fileInputRef.current.files = dt.files;
              const event = new Event('change', { bubbles: true });
              fileInputRef.current.dispatchEvent(event);
            }
          }
        }}
      >
        {isDragOver && (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <Icon name="upload" size={48} />
              <p>Drop files here</p>
            </div>
          </div>
        )}
        {messages.length === 0 && (
          <div className="chat-empty">
            {isBot ? (
              <>
                <div className="chat-empty-icon" style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: '1.5rem', fontWeight: 800,
                  color: 'var(--text-primary)',
                }}>
                  {chatName?.charAt(0)?.toUpperCase() || 'B'}
                </div>
                <h3>{chatName}</h3>
                {description ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 12px', lineHeight: 1.5 }}>
                    {description}
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {slashCommands.botCommands?.length > 0
                      ? `Доступно ${slashCommands.botCommands.length} команд. Выберите команду или напишите /start`
                      : 'Отправьте /start чтобы начать'}
                  </p>
                )}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 280 }}>
                  {slashCommands.botCommands?.length > 0 ? (
                    slashCommands.botCommands.map((cmd: any) => (
                      <button
                        key={cmd.command}
                        onClick={() => { updateInputText(`/${cmd.command} `); inputRef.current?.focus(); setTimeout(() => handleSendMessage(), 0); }}
                        style={{
                          padding: '10px 14px', background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)', borderRadius: 10,
                          color: 'var(--text-primary)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'var(--transition)', textAlign: 'left',
                        }}
                      >
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>/{cmd.command}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>{cmd.description}</span>
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => { updateInputText('/start '); inputRef.current?.focus(); setTimeout(() => handleSendMessage(), 0); }}
                      style={{
                        padding: '12px 16px', background: 'linear-gradient(135deg, #D4A017, #B8860B)',
                        border: 'none', borderRadius: 12, color: '#000',
                        fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                      }}
                    >
                      Начать
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Icon name="logo" size={48} />
                <h3>Нет сообщений</h3>
                <p>Напишите первое сообщение</p>
              </>
            )}
          </div>
        )}
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button className="scroll-to-bottom visible" onClick={scrollToBottom} aria-label="Scroll to bottom">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
          </svg>
        </button>
      )}
      
      {isSelectionMode && (
        <MessageSelector
          selectedIds={selectedIds}
          onToggle={toggleMessageSelection}
          onClear={clearSelection}
          onForward={handleForwardSelected}
          onDelete={handleDeleteSelected}
          onCopy={handleCopySelected}
        />
      )}

      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-bar" />
          <div className="reply-preview-content">
            <div className="reply-preview-sender">{replyTo.sender_id === currentUserId ? 'You' : chatName}</div>
            <span>{replyTo.content.substring(0, 50)}</span>
          </div>
          <button className="reply-preview-close" onClick={() => setReplyTo(null)} aria-label="Close reply preview">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      
      {quoteText && (
        <div className="quote-preview">
          <div className="quote-preview-content">
            <Icon name="quote" size={16} />
            <span>Цитата: {quoteText.substring(0, 50)}</span>
          </div>
          <button onClick={() => setQuoteText('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      
      <div className="chat-input-container">
        {(isBot || (chatType !== 'private' && chatType !== 'channel')) && (
          <button
            className="chat-input-action slash-trigger"
            onClick={() => {
              if (inputText.startsWith('/')) {
                setInputText('');
                setShowCommandList(false);
              } else {
                setInputText('/');
                const cmdResult = slashCommands.handleInput('/');
                setShowCommandList(cmdResult.showCommands);
                setFilteredCommands(cmdResult.filteredCommands);
              }
              inputRef.current?.focus();
            }}
            title="Команды бота"
            style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 32 }}
          >
            /
          </button>
        )}
        <button
          className="chat-input-action"
          onClick={isMobile ? () => setShowAttachMenu(!showAttachMenu) : handleAttachClick}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'var(--hover-bg)'; }}
          onDragLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.background = 'none';
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              const dt = new DataTransfer();
              files.forEach(f => dt.items.add(f));
              if (fileInputRef.current) {
                fileInputRef.current.files = dt.files;
                const event = new Event('change', { bubbles: true });
                fileInputRef.current.dispatchEvent(event);
              }
            }
          }}
        >
          <Icon name="attach" size={22} />
        </button>

        {!isMobile && (
          <>
            <button
              className="chat-input-action"
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
            >
              <Icon name="emoji" size={22} />
            </button>

            <button
              className="chat-input-action"
              onClick={() => setShowSchedulePicker(true)}
              title="Schedule message"
            >
              <Icon name="clock" size={22} />
            </button>

            {chatId !== 999999 && chatType !== 'favorites' && (
              <button
                className="chat-input-action"
                onClick={() => setShowTransferModal(true)}
                title={chatType === 'channel' ? 'Пожертвование' : 'Перевод'}
                style={{color: '#10b981'}}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </button>
            )}
          </>
        )}

        {isMobile && showAttachMenu && (
          <div className="attach-popup" style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: 8, display: 'flex', gap: 4, zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          }}>
            <button onClick={() => { setShowEmojiPicker(true); setShowStickerPicker(false); setShowAttachMenu(false); }}
              style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)'}}>
              <Icon name="emoji" size={22} />
              <span style={{fontSize: '0.65rem'}}>Эмодзи</span>
            </button>
            <button onClick={() => { handleAttachClick(); setShowAttachMenu(false); }}
              style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)'}}>
              <Icon name="picture" size={22} />
              <span style={{fontSize: '0.65rem'}}>Файл</span>
            </button>
            {chatId !== 999999 && chatType !== 'favorites' && (
              <button onClick={() => { setShowTransferModal(true); setShowAttachMenu(false); }}
                style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#10b981'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span style={{fontSize: '0.65rem'}}>Перевод</span>
              </button>
            )}
            <button onClick={() => { setShowSchedulePicker(true); setShowAttachMenu(false); }}
              style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)'}}>
              <Icon name="clock" size={22} />
              <span style={{fontSize: '0.65rem'}}>Отложено</span>
            </button>
            <button onClick={() => {
              setShowAttachMenu(false);
              if (!navigator.geolocation) {
                alert('Геолокация не поддерживается');
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  const locContent = JSON.stringify({ type: 'location', lat: latitude, lng: longitude });
                  apiClient.post('/messages/', { content: locContent, chat_id: chatId }).then(() => loadMessages()).catch(err => console.error('Location send error:', err));
                },
                () => alert('Не удалось определить местоположение'),
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }}
              style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)'}}>
              <Icon name="pin" size={22} />
              <span style={{fontSize: '0.65rem'}}>Геолокация</span>
            </button>
          </div>
        )}

        <div className="chat-input-wrapper">
          {selectedSticker && (
            <div className="sticker-preview-inline">
              <img src={selectedSticker} alt="sticker" />
              <button className="sticker-preview-remove" onClick={() => setSelectedSticker(null)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Сообщение..."
            value={inputText}
            onChange={(e) => {
              handleInputChange(e);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>
        
        {inputText.trim() || selectedSticker ? (
          <button className="send-button" onClick={handleSendButton}>
            <Icon name="send" size={20} />
          </button>
        ) : (
          <button 
            className={`voice-button ${isVoiceRecording ? 'recording' : ''} ${voiceLocked ? 'locked' : ''}`}
            onMouseDown={startVoiceRecording}
            onMouseUp={stopVoiceRecording}
            onMouseLeave={stopVoiceRecording}
            onTouchStart={startVoiceRecording}
            onTouchEnd={stopVoiceRecording}
            onTouchMove={handleVoiceTouchMove}
          >
            {isVoiceRecording ? (
              <div className="recording-indicator">
                {voiceLocked && (
                  <div className="recording-lock-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                )}
                <span className="recording-dot"></span>
                <span className="recording-time">{formatRecordingTime(recordingDuration)}</span>
              </div>
            ) : (
              <Icon name="mic" size={20} />
            )}
          </button>
        )}
      </div>
      
      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <div className="emoji-tabs-bar">
            <button className={`emoji-tab-btn ${!showStickerPicker ? 'active' : ''}`} onClick={() => setShowStickerPicker(false)}>Эмодзи</button>
            <button className={`emoji-tab-btn ${showStickerPicker ? 'active' : ''}`} onClick={() => setShowStickerPicker(true)}>Стикеры</button>
          </div>
          {showStickerPicker ? (
            <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowEmojiPicker(false)} />
          ) : (
            <EmojiPicker onSelect={handleEmojiSelect} />
          )}
        </div>
      )}
      
      {showVoiceRecorder && (
        <VoiceRecorder onSend={loadMessages} />
      )}
      
      {showContextMenu && selectedMessage && (
        <MessageContextMenu 
          x={contextMenuPosition.x} 
          y={contextMenuPosition.y} 
          message={selectedMessage} 
          isOwn={selectedMessage.sender_id === currentUserId} 
          onClose={() => setShowContextMenu(false)} 
          onReply={() => handleReply(selectedMessage)} 
          onQuote={(text: string) => handleQuote(selectedMessage, text)} 
          onEdit={(text: string) => {
            setEditingMsgId(selectedMessage.id);
            setEditingText(selectedMessage.content);
            setShowContextMenu(false);
            try {
              const p = JSON.parse(selectedMessage.content);
              setEditingText(p.text || p.type === 'poll' ? '' : selectedMessage.content);
            } catch {
              setEditingText(selectedMessage.content);
            }
          }} 
          onDelete={() => handleDeleteMessage(selectedMessage.id)} 
          onDeleteForEveryone={() => handleDeleteForEveryone(selectedMessage.id)} 
          onAutoDelete={(seconds) => handleAutoDelete(selectedMessage.id, seconds)}
          onCopy={() => handleCopyMessage(selectedMessage.content)} 
          onForward={() => {
            if (onForwardMessage) {
              onForwardMessage(selectedMessage.id);
            } else {
              setForwardMode(true);
              setSelectedMessages([selectedMessage.id]);
            }
            setShowContextMenu(false);
          }} 
          onWhoForwarded={() => handleWhoForwarded(selectedMessage)}
          onTranslate={() => {
            setTranslateText(selectedMessage.content);
            setShowTranslator(true);
            setShowContextMenu(false);
          }}
          onPin={async () => {
            try {
              await apiClient.post(`/messages/${selectedMessage.id}/pin`);
              setShowPinnedBar(true);
            } catch {}
          }}
          isForwarded={!!selectedMessage.is_forwarded || !!selectedMessage.forwarded_from_message_id}
        />
      )}
      
      {/* Translator Modal */}
      {showTranslator && (
        <TranslatorModal text={translateText} onClose={() => setShowTranslator(false)} />
      )}
      
      {/* Reaction picker */}
      {showReactionPicker && (
        <>
          <div className="reaction-picker-overlay" onClick={() => setShowReactionPicker(null)} />
          <div className="reaction-picker" style={{ left: showReactionPicker.x, top: showReactionPicker.y }}>
            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
              <button
                key={emoji}
                className="reaction-btn"
                onClick={() => {
                  handleReact(showReactionPicker.msgId, emoji);
                  setShowReactionPicker(null);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
      
      {showMediaViewer && (
        <MediaViewer
          src={mediaViewerUrl}
          type="image"
          onClose={() => setShowMediaViewer(false)}
        />
      )}
      
      {showTransferModal && (
        <TransferModal
          toUsername={chatName}
          onClose={() => setShowTransferModal(false)}
          onTransferSuccess={() => loadMessages()}
        />
      )}
      
      {showForwardSelector && (
        <div className="forward-selector-modal">
          <div className="forward-selector-content">
            <h3>Переслать в чат</h3>
            <div className="forward-chats-list">
              {chatsForForward.map(chat => (
                <div key={chat.id} onClick={() => handleConfirmForward(chat.id)}>
                  {chat.name}
                </div>
              ))}
            </div>
            <button onClick={() => setShowForwardSelector(false)}>Отмена</button>
          </div>
        </div>
      )}
      
      {/* Mention Dropdown */}
      {showMentions && (
        <MentionDropdown
          members={chatMembers}
          filter={mentionFilter}
          onSelect={handleMentionSelect}
          position={mentionPosition}
        />
      )}

      {/* Slash Commands List */}
      {showCommandList && filteredCommands.length > 0 && (
        <div className="command-list-dropdown">
          {filteredCommands.map(cmd => {
            const botCmd = slashCommands.botCommands?.find((c: any) => `/${c.command}` === cmd);
            return (
              <div
                key={cmd}
                className="command-item"
                onClick={() => handleCommandSelect(cmd)}
              >
                <span className="command-name">{cmd}</span>
                {botCmd && <span className="command-desc">{botCmd.description}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Slash Command Member Selection */}
      {slashCommands.showMemberList && slashCommands.filteredMembers.length > 0 && (
        <div className="command-list-dropdown member-list">
          {slashCommands.filteredMembers.map(m => (
            <div
              key={m.id}
              className="command-item"
              onClick={() => handleCommandMemberSelect(m.username)}
            >
              <div className="member-avatar-small">
                {(m.first_name || m.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="member-name">@{m.username}</div>
                <div className="member-fullname">{m.first_name} {m.last_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Picker */}
      {showSchedulePicker && (
        <SchedulePicker
          chatId={chatId}
          onSchedule={handleScheduleMessage}
          onClose={() => setShowSchedulePicker(false)}
        />
      )}
      
      {/* Media Gallery */}
      {showMediaGallery && (
        <MediaGallery
          chatId={chatId}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        multiple 
        onChange={handleFileSelect} 
      />
    </div>
  );
};

export default ChatWindow;