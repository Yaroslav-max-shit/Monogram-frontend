import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../../services/api';
import './StoryViewer.css';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
const getMediaUrl = (url?: string | null) => url ? (url.startsWith('http') ? url : `${BACKEND_URL}${url}`) : '';

interface StoryData {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  bg_color: string;
  font_color: string;
  created_at: string;
  viewed: boolean;
}

interface StoryViewerProps {
  stories: StoryData[];
  startIndex: number;
  allUserStories: StoryData[][];
  currentUserIndex: number;
  onClose: () => void;
  onNextUser: () => void;
  onPrevUser: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  startIndex,
  allUserStories,
  currentUserIndex,
  onClose,
  onNextUser,
  onPrevUser,
}) => {
  const [slideIndex, setSlideIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const progressRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const holdRef = useRef(false);
  const touchStartX = useRef(0);

  const currentStory = stories[slideIndex];

  // Таймер истории (5 секунд)
  useEffect(() => {
    if (!currentStory || isPaused) return;

    startTimeRef.current = Date.now();
    progressRef.current = 0;
    setProgress(0);

    timerRef.current = setInterval(() => {
      if (holdRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / 5000) * 100, 100);
      progressRef.current = pct;
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timerRef.current);
        if (slideIndex < stories.length - 1) {
          setSlideIndex(slideIndex + 1);
          setProgress(0);
        } else {
          onNextUser();
        }
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [slideIndex, isPaused, currentStory]);

  // Пометить как просмотренную
  useEffect(() => {
    if (currentStory && !currentStory.viewed) {
      apiClient.post(`/stories/${currentStory.id}/react`, { emoji: 'viewed' }).catch(() => {});
    }
  }, [currentStory?.id]);

  // Клавиатура
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showReply) return;
      if (e.key === 'ArrowRight') navigateSlide(1);
      else if (e.key === 'ArrowLeft') navigateSlide(-1);
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); setIsPaused(p => !p); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slideIndex, stories.length, showReply]);

  const navigateSlide = useCallback((dir: number) => {
    clearInterval(timerRef.current);
    const next = slideIndex + dir;
    if (next < 0) {
      onPrevUser();
    } else if (next >= stories.length) {
      onNextUser();
    } else {
      setSlideIndex(next);
      setProgress(0);
      progressRef.current = 0;
      startTimeRef.current = Date.now();
    }
  }, [slideIndex, stories.length]);

  // Клик: левая часть — назад, правая — вперёд, центр — пауза
  const handleContainerClick = (e: React.MouseEvent) => {
    if (showReply) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    if (x < w * 0.3) navigateSlide(-1);
    else if (x > w * 0.7) navigateSlide(1);
    else setIsPaused(p => !p);
  };

  // Тач: свайп влево/вправо
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    holdRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    holdRef.current = false;
    if (showReply) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      navigateSlide(dx > 0 ? -1 : 1);
    }
  };

  // Отправка ответа
  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await apiClient.post(`/stories/${currentStory.id}/react`, { emoji: 'reply', text: replyText });
    } catch {}
    setReplyText('');
    setShowReply(false);
    onNextUser();
  };

  if (!currentStory) return null;

  const hoursAgo = Math.floor((Date.now() - new Date(currentStory.created_at).getTime()) / 3600000);
  const timeText = hoursAgo < 1 ? 'только что' : `${hoursAgo}ч назад`;

  return (
    <div className="story-viewer-overlay" onClick={handleContainerClick}>
      <div
        className="story-viewer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Прогресс-бар */}
        <div className="story-progress-bar-container">
          {stories.map((_, idx) => (
            <div key={idx} className="story-progress-segment">
              <div
                className="story-progress-fill"
                style={{
                  width: idx < slideIndex ? '100%' : idx === slideIndex ? `${progress}%` : '0%',
                  transition: idx === slideIndex ? 'width 50ms linear' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Шапка */}
        <div className="story-viewer-header">
          <div className="story-viewer-user">
            <div className="story-viewer-avatar">
              {currentStory.avatar_url ? (
                <img src={getMediaUrl(currentStory.avatar_url)} alt="" />
              ) : (
                <span>{currentStory.username?.charAt(0)?.toUpperCase()}</span>
              )}
            </div>
            <span className="story-viewer-username">{currentStory.username}</span>
            <span className="story-viewer-time">{timeText}</span>
          </div>
          <button className="story-viewer-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            ✕
          </button>
        </div>

        {/* Слайд */}
        <div className="story-slide">
          {currentStory.content_type === 'photo' && currentStory.content_url && (
            <img src={getMediaUrl(currentStory.content_url)} alt="" className="story-media" draggable={false} />
          )}
          {currentStory.content_type === 'video' && currentStory.content_url && (
            <video src={getMediaUrl(currentStory.content_url)} className="story-media" autoPlay muted loop draggable={false} />
          )}
          {currentStory.content_type === 'text' && (
            <div className="story-text-slide" style={{ backgroundColor: currentStory.bg_color || '#1a1a2e' }}>
              <span style={{ color: currentStory.font_color || '#ffffff' }}>
                {currentStory.text_content || ''}
              </span>
            </div>
          )}
        </div>

        {/* Кнопка ответа */}
        <button className="story-viewer-reply-btn" onClick={(e) => { e.stopPropagation(); setShowReply(!showReply); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M21 11.5C21 16.1944 17.1944 20 12.5 20C11.3954 20 10.3424 19.7815 9.38197 19.3819L4 21L5.61803 15.618C5.21846 14.6575 5 13.6046 5 12.5C5 7.80558 8.80558 4 13.5 4C18.1944 4 21 7.80558 21 11.5Z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Поле ответа */}
        {showReply && (
          <div className="story-reply-bar" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="story-reply-input"
              placeholder="Ответить..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
              autoFocus
            />
            <button className="story-reply-send" onClick={handleSendReply} disabled={!replyText.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
export type { StoryData };
