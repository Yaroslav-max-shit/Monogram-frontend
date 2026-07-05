import React, { useState, useRef, useCallback } from 'react';
import apiClient from '../../services/api';
import './StoryCreator.css';

interface StoryCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

const StoryCreator: React.FC<StoryCreatorProps> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState<'choose' | 'edit'>('choose');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'text'>('text');
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#1a1a2e');
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isRotating = useRef(false);
  const rotateStartY = useRef(0);

  const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483', '#2b2d42', '#8d99ae', '#ef233c'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
    setStep('edit');
  };

  // Поворот зажатием кнопки
  const handleRotateStart = () => {
    isRotating.current = true;
    rotateStartY.current = Date.now();
    const interval = setInterval(() => {
      if (!isRotating.current) {
        clearInterval(interval);
        return;
      }
      setRotation(r => r + 2);
    }, 16);
    const stop = () => {
      isRotating.current = false;
      clearInterval(interval);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
  };

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    try {
      if (mediaType === 'text') {
        // Текстовая история
        await apiClient.post('/stories/', {
          content_type: 'text',
          text_content: textContent,
          bg_color: bgColor,
          font_color: '#ffffff',
        });
      } else if (mediaFile) {
        // Загружаем файл
        const formData = new FormData();
        formData.append('file', mediaFile);
        const uploadRes = await apiClient.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fileUrl = uploadRes.data?.url;

        await apiClient.post('/stories/', {
          content_type: mediaType,
          content_url: fileUrl,
        });
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Ошибка публикации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-creator-overlay">
      <div className="story-creator">
        {/* Шапка */}
        <div className="story-creator-header">
          <button className="story-creator-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h3>{step === 'choose' ? 'Новая история' : 'Редактирование'}</h3>
          {step === 'edit' && (
            <button className="story-creator-publish" onClick={handlePublish} disabled={loading}>
              {loading ? '...' : 'Опубликовать'}
            </button>
          )}
        </div>

        {step === 'choose' && (
          <div className="story-creator-choose">
            {/* Текстовая история */}
            <div className="story-creator-option" onClick={() => { setMediaType('text'); setStep('edit'); }}>
              <div className="story-creator-option-icon" style={{ background: bgColor }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <span>Текст</span>
            </div>

            {/* Фото из галереи */}
            <div className="story-creator-option" onClick={() => fileInputRef.current?.click()}>
              <div className="story-creator-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <span>Фото</span>
            </div>

            {/* Видео из галереи */}
            <div className="story-creator-option" onClick={() => fileInputRef.current?.click()}>
              <div className="story-creator-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span>Видео</span>
            </div>

            {/* Камера */}
            <div className="story-creator-option" onClick={() => cameraInputRef.current?.click()}>
              <div className="story-creator-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span>Камера</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>
        )}

        {step === 'edit' && (
          <div className="story-creator-edit">
            {/* Предпросмотр */}
            <div className="story-creator-preview" style={{ backgroundColor: mediaType === 'text' ? bgColor : '#000' }}>
              {mediaType === 'text' ? (
                <div className="story-creator-text-preview" style={{ color: '#fff' }}>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Введите текст..."
                    maxLength={500}
                    autoFocus
                  />
                </div>
              ) : mediaPreview ? (
                <div className="story-creator-media-wrapper" style={{ transform: `rotate(${rotation}deg) scale(${scale})` }}>
                  {mediaType === 'image' ? (
                    <img src={mediaPreview} alt="" draggable={false} />
                  ) : (
                    <video src={mediaPreview} autoPlay muted loop draggable={false} />
                  )}
                </div>
              ) : null}

              {/* Кнопка поворота — всегда сверху */}
              {mediaType !== 'text' && (
                <button
                  className="story-creator-rotate-btn"
                  onMouseDown={handleRotateStart}
                  onTouchStart={handleRotateStart}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>
              )}
            </div>

            {/* Палитра цветов (для текстовых историй) */}
            {mediaType === 'text' && (
              <div className="story-creator-colors">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`story-color-btn ${bgColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBgColor(color)}
                  />
                ))}
              </div>
            )}

            {/* Слайдер масштаба (для фото/видео) */}
            {mediaType !== 'text' && (
              <div className="story-creator-zoom">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <input
                  type="range"
                  min="50"
                  max="180"
                  value={scale * 100}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                </svg>
              </div>
            )}

            {error && <div className="story-creator-error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCreator;
