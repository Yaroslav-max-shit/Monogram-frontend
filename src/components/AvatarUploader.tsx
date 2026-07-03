import React, { useRef, useState, useCallback, useEffect } from 'react';
import Icon from './Icon';
import apiClient from '../services/api';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';

interface AvatarUploaderProps {
  onAvatarSaved: (url: string) => void;
  onClose: () => void;
  currentAvatar?: string | null;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ onAvatarSaved, onClose, currentAvatar }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [cropSize] = useState(280);

  const minScale = 0.5;
  const maxScale = 1.8;

  // Загрузка изображения
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Зум колёсиком мыши
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(prev => Math.max(minScale, Math.min(maxScale, prev + delta)));
  }, []);

  // Начало перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  // Перетаскивание
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !image) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Ограничиваем перемещение, чтобы изображение не выходило за круг
    const maxOffset = (image.width * scale - cropSize) / 2;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, newX));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, newY));
    
    setPosition({ x: clampedX, y: clampedY });
  }, [isDragging, dragStart, image, scale, cropSize]);

  // Конец перетаскивания
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Поворот
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Сохранение
  const handleSave = async () => {
    if (!image || !containerRef.current) return;
    
    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = cropSize * 2; // 2x для высокого качества
      canvas.height = cropSize * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Рисуем круглую маску
      ctx.beginPath();
      ctx.arc(cropSize, cropSize, cropSize, 0, Math.PI * 2);
      ctx.clip();

      // Применяем трансформации
      ctx.translate(cropSize, cropSize);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(position.x / scale, position.y / scale);

      // Рисуем изображение по центру
      const imgW = image.width;
      const imgH = image.height;
      ctx.drawImage(image, -imgW / 2, -imgH / 2, imgW, imgH);

      // Конвертируем в blob и загружаем
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const formData = new FormData();
        formData.append('avatar', blob, 'avatar.jpg');
        
        try {
          const res = await apiClient.post('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const avatarUrl = res.data?.avatar_url || res.data?.avatar;
          if (avatarUrl) {
            onAvatarSaved(avatarUrl.startsWith('http') ? avatarUrl : `${BACKEND_URL}${avatarUrl}`);
          }
        } catch (err) {
          console.error('Avatar upload error:', err);
        }
        setLoading(false);
        onClose();
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Avatar save error:', err);
      setLoading(false);
    }
  };

  // Обработка Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="avatar-uploader-overlay" onClick={onClose}>
      <div className="avatar-uploader-modal" onClick={e => e.stopPropagation()}>
        <div className="avatar-uploader-header">
          <button onClick={onClose} className="avatar-uploader-close">
            <Icon name="x" size={20} />
          </button>
          <h3>Фото профиля</h3>
          <button 
            onClick={handleSave} 
            className="avatar-uploader-save"
            disabled={!image || loading}
          >
            {loading ? '...' : 'Готово'}
          </button>
        </div>

        <div 
          className="avatar-uploader-canvas"
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Серый фон за пределами круга */}
          <div className="avatar-uploader-bg" />
          
          {/* Круглая область обрезки */}
          <div className="avatar-uploader-circle">
            {image ? (
              <img
                src={image.src}
                alt=""
                draggable={false}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease',
                }}
              />
            ) : (
              <div className="avatar-uploader-placeholder">
                <Icon name="camera" size={48} />
                <p>Выберите фото</p>
              </div>
            )}
          </div>
          
          {/* Граница круга */}
          <div className="avatar-uploader-border" />
        </div>

        {image && (
          <div className="avatar-uploader-controls">
            <button onClick={handleRotate} className="avatar-uploader-rotate" title="Повернуть">
              <Icon name="rotate-cw" size={20} />
            </button>
            <input
              type="range"
              min={minScale * 100}
              max={maxScale * 100}
              value={scale * 100}
              onChange={(e) => setScale(Number(e.target.value) / 100)}
              className="avatar-uploader-zoom-slider"
            />
          </div>
        )}

        {!image && (
          <div className="avatar-uploader-actions">
            <label className="avatar-uploader-upload-btn">
              <Icon name="image" size={20} />
              Выбрать фото
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader;
