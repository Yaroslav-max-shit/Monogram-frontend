import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import apiClient from '../services/api';
import jsQR from 'jsqr';
import './QRScanner.css';

interface Point {
  x: number;
  y: number;
}

interface QRLocation {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

interface QRScannerProps {
  onClose: () => void;
  onScanSuccess?: (result: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose, onScanSuccess }) => {
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrLocation, setQrLocation] = useState<QRLocation | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  const OUR_DOMAINS = [
    'f1w6ggb2-5173.euw.devtunnels.ms',
    'f1w6ggb2-5173.euw.devtunnels.ms'
  ];

  const stopCamera = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    setError(null);
    setQrLocation(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        startScanning();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Р”РѕСЃС‚СѓРї Рє РєР°РјРµСЂРµ Р·Р°РїСЂРµС‰С‘РЅ. Р Р°Р·СЂРµС€РёС‚Рµ РґРѕСЃС‚СѓРї РІ РЅР°СЃС‚СЂРѕР№РєР°С… Р±СЂР°СѓР·РµСЂР°.');
      } else {
        setError('РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РґРѕСЃС‚СѓРї Рє РєР°РјРµСЂРµ');
      }
    }
  };

  const drawBoundingBox = (ctx: CanvasRenderingContext2D, location: QRLocation, isFound: boolean) => {
    // Р РёСЃСѓРµРј Р·Р°С‚РµРјРЅРµРЅРёРµ Р·Р° РїСЂРµРґРµР»Р°РјРё QR-РєРѕРґР°
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Р’С‹СЂРµР·Р°РµРј РѕР±Р»Р°СЃС‚СЊ QR-РєРѕРґР° (РґРµР»Р°РµРј РµС‘ РїСЂРѕР·СЂР°С‡РЅРѕР№)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(location.topLeft.x, location.topLeft.y);
    ctx.lineTo(location.topRight.x, location.topRight.y);
    ctx.lineTo(location.bottomRight.x, location.bottomRight.y);
    ctx.lineTo(location.bottomLeft.x, location.bottomLeft.y);
    ctx.closePath();
    ctx.fill();
    
    // Р’РѕР·РІСЂР°С‰Р°РµРј РѕР±С‹С‡РЅС‹Р№ СЂРµР¶РёРј СЂРёСЃРѕРІР°РЅРёСЏ
    ctx.globalCompositeOperation = 'source-over';
    
    // Р РёСЃСѓРµРј Р·РµР»С‘РЅСѓСЋ СЂР°РјРєСѓ РІРѕРєСЂСѓРі QR-РєРѕРґР°
    ctx.strokeStyle = isFound ? '#10b981' : 'var(--accent)';
    ctx.lineWidth = 4;
    ctx.shadowColor = isFound ? 'rgba(16, 185, 129, 0.5)' : 'rgba(199, 110, 0, 0.5)';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.moveTo(location.topLeft.x, location.topLeft.y);
    ctx.lineTo(location.topRight.x, location.topRight.y);
    ctx.lineTo(location.bottomRight.x, location.bottomRight.y);
    ctx.lineTo(location.bottomLeft.x, location.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();
    
    // Р РёСЃСѓРµРј СѓРіРѕР»РєРё
    const cornerLength = 30;
    const cornerWidth = 6;
    ctx.lineWidth = cornerWidth;
    
    // Р’РµСЂС…РЅРёР№ Р»РµРІС‹Р№ СѓРіРѕР»
    ctx.beginPath();
    ctx.moveTo(location.topLeft.x, location.topLeft.y + cornerLength);
    ctx.lineTo(location.topLeft.x, location.topLeft.y);
    ctx.lineTo(location.topLeft.x + cornerLength, location.topLeft.y);
    ctx.stroke();
    
    // Р’РµСЂС…РЅРёР№ РїСЂР°РІС‹Р№ СѓРіРѕР»
    ctx.beginPath();
    ctx.moveTo(location.topRight.x - cornerLength, location.topRight.y);
    ctx.lineTo(location.topRight.x, location.topRight.y);
    ctx.lineTo(location.topRight.x, location.topRight.y + cornerLength);
    ctx.stroke();
    
    // РќРёР¶РЅРёР№ Р»РµРІС‹Р№ СѓРіРѕР»
    ctx.beginPath();
    ctx.moveTo(location.bottomLeft.x, location.bottomLeft.y - cornerLength);
    ctx.lineTo(location.bottomLeft.x, location.bottomLeft.y);
    ctx.lineTo(location.bottomLeft.x + cornerLength, location.bottomLeft.y);
    ctx.stroke();
    
    // РќРёР¶РЅРёР№ РїСЂР°РІС‹Р№ СѓРіРѕР»
    ctx.beginPath();
    ctx.moveTo(location.bottomRight.x - cornerLength, location.bottomRight.y);
    ctx.lineTo(location.bottomRight.x, location.bottomRight.y);
    ctx.lineTo(location.bottomRight.x, location.bottomRight.y - cornerLength);
    ctx.stroke();
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const scan = async () => {
      if (!scanning || !videoRef.current || !canvasRef.current) return;
      
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (code) {
          const location: QRLocation = {
            topLeft: code.location.topLeftCorner,
            topRight: code.location.topRightCorner,
            bottomLeft: code.location.bottomLeftCorner,
            bottomRight: code.location.bottomRightCorner
          };
          setQrLocation(location);
          drawBoundingBox(ctx, location, true);
          
          const result = code.data;
          setScannedData(result);
          
          const isValid = OUR_DOMAINS.some(domain => result.includes(domain));
          
          if (isValid) {
            showNotification('вњ… QR-РєРѕРґ СЂР°СЃРїРѕР·РЅР°РЅ!', 'success');
            
            const inviteMatch = result.match(/\/register\/([a-zA-Z0-9_-]+)/);
            const loginMatch = result.match(/\/login\/([a-zA-Z0-9_-]+)/);
            
            if (inviteMatch) {
              setTimeout(() => {
                window.location.href = `/register/${inviteMatch[1]}`;
              }, 500);
            } else if (loginMatch) {
              setTimeout(() => {
                window.location.href = `/login/${loginMatch[1]}`;
              }, 500);
            } else {
              if (onScanSuccess) onScanSuccess(result);
            }
            stopCamera();
            setTimeout(() => onClose(), 1000);
          } else {
            drawBoundingBox(ctx, location, false);
            setError('Р­С‚РѕС‚ QR-РєРѕРґ РЅРµ РѕС‚ Monogram');
            setTimeout(() => setError(null), 2000);
          }
        } else {
          setQrLocation(null);
          if (canvas.width > 0 && canvas.height > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(scan);
    };
    
    scan();
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const notification = document.createElement('div');
    notification.className = `custom-toast ${type}`;
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;
    notification.appendChild(iconSpan);
    notification.appendChild(msgSpan);
    notification.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : 'var(--accent)'};
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 100000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  };

  const decodeQRFromImage = async (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas context not available')); return; }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          resolve(code?.data || null);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    
    try {
      const result = await decodeQRFromImage(file);
      
      if (result) {
        const isValid = OUR_DOMAINS.some(domain => result.includes(domain));
        if (isValid) {
          showNotification('✅ QR-код распознан!', 'success');
          const inviteMatch = result.match(/\/register\/([a-zA-Z0-9_-]+)/);
          if (inviteMatch) {
            setTimeout(() => {
              window.location.href = `/register/${inviteMatch[1]}`;
            }, 500);
          }
        } else {
          setError('QR-код не от Monogram Messenger');
        }
      } else {
        setError('Не удалось распознать QR-код');
      }
    } catch (err) {
      setError('Ошибка при обработке изображения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-scanner-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Icon name="qr" size={20} /> РЎРєР°РЅРёСЂРѕРІР°С‚СЊ QR-РєРѕРґ</h2>
          <button className="modal-close-btn" onClick={onClose}>вњ•</button>
        </div>
        
        <div className="qr-scanner-body">
          <div className="scanner-preview">
            <video ref={videoRef} autoPlay playsInline className="scanner-video" />
            <canvas ref={canvasRef} className="scanner-canvas" />
          </div>
          
          {loading && (
            <div className="scanner-loading">
              <div className="loading-spinner-small" />
              <span>РћР±СЂР°Р±РѕС‚РєР°...</span>
            </div>
          )}
          
          {error && <div className="scanner-error">{error}</div>}
          
          <div className="scanner-actions">
            <label className="upload-btn">
              <Icon name="upload" size={18} />
              Р’С‹Р±СЂР°С‚СЊ РёР· РіР°Р»РµСЂРµРё
              <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
