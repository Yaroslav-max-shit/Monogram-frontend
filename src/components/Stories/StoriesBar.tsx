import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../../services/api';
import './StoriesBar.css';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';
const getAvatarUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BACKEND_URL}${url}`) : '';

interface StoryData {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  bg_color: string;
  created_at: string;
  viewed: boolean;
}

interface StoriesBarProps {
  currentUserId: number;
  onOpenStory: (stories: StoryData[], index: number) => void;
  onCreateStory: () => void;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId, onOpenStory, onCreateStory }) => {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const res = await apiClient.get('/stories/');
      const data = (res.data || []).map((s: any) => ({
        ...s,
        viewed: false,
      }));
      setStories(data);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  // Группируем истории по пользователям
  const groupedByUser = stories.reduce<Record<number, StoryData[]>>((acc, story) => {
    if (!acc[story.user_id]) acc[story.user_id] = [];
    acc[story.user_id].push(story);
    return acc;
  }, {});

  const userEntries = Object.entries(groupedByUser).map(([userId, userStories]) => ({
    userId: Number(userId),
    username: userStories[0].username,
    avatar_url: userStories[0].avatar_url,
    hasUnviewed: userStories.some(s => !s.viewed),
    stories: userStories,
  }));

  // Сначала те, у кого есть непросмотренные
  userEntries.sort((a, b) => {
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return 0;
  });

  // Свой профиль — первый
  const myStories = userEntries.filter(u => u.userId === currentUserId);
  const otherStories = userEntries.filter(u => u.userId !== currentUserId);
  const sorted = [...myStories, ...otherStories];

  if (loading) {
    return (
      <div className="stories-bar">
        <div className="stories-bar-scroll">
          {[1, 2, 3].map(i => (
            <div key={i} className="story-circle skeleton">
              <div className="story-ring skeleton-ring" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sorted.length === 0 && stories.length === 0) return null;

  const handleUserStoryClick = (entry: typeof sorted[0], idx: number) => {
    onOpenStory(entry.stories, 0);
  };

  return (
    <div className="stories-bar">
      <div className="stories-bar-scroll" ref={scrollRef}>
        {/* Кнопка добавления истории */}
        <div className="story-circle add-story" onClick={onCreateStory}>
          <div className="story-ring add-ring">
            <div className="story-avatar add-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
          <span className="story-username">Моя история</span>
        </div>

        {/* Истории других пользователей */}
        {sorted.map((entry, idx) => (
          <div
            key={entry.userId}
            className={`story-circle ${entry.hasUnviewed ? 'unviewed' : 'viewed'}`}
            onClick={() => handleUserStoryClick(entry, idx)}
          >
            <div className={`story-ring ${entry.hasUnviewed ? 'ring-new' : 'ring-viewed'}`}>
              <div className="story-avatar">
                {entry.avatar_url ? (
                  <img src={getAvatarUrl(entry.avatar_url)} alt="" />
                ) : (
                  <span>{entry.username?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
            </div>
            <span className="story-username">
              {entry.username?.length > 10 ? entry.username.substring(0, 10) + '…' : entry.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoriesBar;
