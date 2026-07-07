import React, { useRef, useState, useCallback, useEffect } from 'react';
import Icon from './Icon';
import apiClient from '../services/api';
import './AvatarUploader.css';

const BACKEND_URL = 'https://monogram-backend-dxv4.onrender.com';

interface AvatarUploaderProps {
  onAvatarSaved: (url: string) => void;
  onClose: () => void;
  currentAvatar?: string | null;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ onAvatarSaved, onClose, currentAvatar }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotateStart, setRotateStart] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cropSize] = useState(320);

  const minScale = 0.3;
  const maxScale = 2.5;

  // Авто-размер при загрузке изображения
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Авто-подгонка: фото полностью видно в круге
        const containerSize = cropSize * 2;
        const maxDim = Math.max(img.width, img.height);
        const autoScale = containerSize / maxDim;
        const fitScale = Math.max(minScale, Math.min(maxScale, autoScale * 0.9));
        setImage(img);
        setScale(fitScale);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Клик по кругу — открыть файл
  const handleCircleClick = () => {
    if (!image) {
      fileInputRef.current?.click();
    }
  };

  // Зум колёсиком
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(prev => Math.max(minScale, Math.min(maxScale, prev + delta)));
  }, []);

  // Перетаскивание
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image || isRotating) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    if (isRotating) {
      const dx = e.clientX - rotateStart;
      setRotation(prev => prev + dx * 0.5);
      setRotateStart(e.clientX);
    }
  }, [isDragging, isRotating, dragStart, rotateStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsRotating(false);
  }, []);

  // Поворот через ручку
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setRotateStart(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!image) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  // Сохранение
  const handleSave = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = cropSize * 2;
      canvas.height = cropSize * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Круглая маска
      ctx.beginPath();
      ctx.arc(cropSize, cropSize, cropSize, 0, Math.PI * 2);
      ctx.clip();

      ctx.translate(cropSize, cropSize);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(position.x / scale, position.y / scale);

      const imgW = image.width;
      const imgH = image.height;
      ctx.drawImage(image, -imgW / 2, -imgH / 2, imgW, imgH);

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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : isRotating ? 'ew-resize' : 'pointer' }}
          onClick={handleCircleClick}
        >
          <div className="avatar-uploader-bg" />

          <div className="avatar-uploader-circle">
            {image ? (
              <img
                src={image.src}
                alt=""
                draggable={false}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transition: (isDragging || isRotating) ? 'none' : 'transform 0.15s ease',
                }}
              />
            ) : (
              <div className="avatar-uploader-placeholder">
                <Icon name="camera" size={48} />
                <p>Нажмите чтобы выбрать фото</p>
              </div>
            )}
          </div>

          <div className="avatar-uploader-border" />

          {/* Ручка поворота */}
          {image && (
            <div
              className="avatar-uploader-rotate-handle"
              onMouseDown={handleRotateStart}
              onTouchStart={(e) => { e.stopPropagation(); setIsRotating(true); setRotateStart(e.touches[0].clientX); }}
            >
              <Icon name="rotate-cw" size={16} />
            </div>
          )}
        </div>

        {/* Зум-слайдер */}
        {image && (
          <div className="avatar-uploader-controls">
            <Icon name="zoom-out" size={16} />
            <input
              type="range"
              min={minScale * 100}
              max={maxScale * 100}
              value={scale * 100}
              onChange={(e) => setScale(Number(e.target.value) / 100)}
              className="avatar-uploader-zoom-slider"
            />
            <Icon name="zoom-in" size={16} />
          </div>
        )}

        {/* Кнопка загрузки */}
        {!image && (
          <div className="avatar-uploader-actions">
            <label className="avatar-uploader-upload-btn">
              <Icon name="image" size={20} />
              Выбрать фото
              <input
                ref={fileInputRef}
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
