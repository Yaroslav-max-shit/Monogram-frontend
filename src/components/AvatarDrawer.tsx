import React, { useRef, useState, useEffect, useCallback } from 'react';

interface AvatarDrawerProps {
  onSave: (avatar: string) => void;
  onSkip: () => void;
}

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FF6B35', '#7B2D8E', '#1E90FF', '#32CD32',
  '#FFD700', '#FF69B4', '#8B4513', '#808080',
];

const TOOLS = [
  { id: 'brush', name: 'Кисть', icon: '🖌️' },
  { id: 'marker', name: 'Фломастер', icon: '✏️' },
  { id: 'eraser', name: 'Ластик', icon: '🧹' },
  { id: 'fill', name: 'Заливка', icon: '🪣' },
];

const SIZES = [2, 5, 10, 15, 20];

const AvatarDrawer: React.FC<AvatarDrawerProps> = ({ onSave, onSkip }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setHistoryIndex(prev => prev - 1);
    ctx.putImageData(history[historyIndex - 1], 0, 0);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setHistoryIndex(prev => prev + 1);
    ctx.putImageData(history[historyIndex + 1], 0, 0);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.globalAlpha = opacity;
    
    if (tool === 'fill') {
      floodFill(ctx, Math.round(pos.x), Math.round(pos.y), color);
      saveToHistory();
      return;
    }
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2;
    } else if (tool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = opacity * 0.5;
      ctx.lineWidth = size;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = opacity;
      ctx.lineWidth = size;
    }
    
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    saveToHistory();
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    
    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);
    
    if (startR === fillR && startG === fillG && startB === fillB) return;
    
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const idx = (y * width + x) * 4;
      if (data[idx] !== startR || data[idx + 1] !== startG || data[idx + 2] !== startB) continue;
      
      visited.add(key);
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10001, padding: 20, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 24, padding: 24,
        maxWidth: 420, width: '100%', maxHeight: '90vh', overflow: 'auto',
      }}>
        <h2 style={{margin: '0 0 16px', fontSize: '1.2rem', textAlign: 'center'}}>
          Нарисуйте аватар
        </h2>

        <div style={{display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap'}}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} style={{
              padding: '6px 12px', borderRadius: 10, border: tool === t.id ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              background: tool === t.id ? 'var(--accent)' : 'var(--bg-primary)',
              color: tool === t.id ? 'white' : 'var(--text-primary)',
              cursor: 'pointer', fontSize: '0.8rem',
            }}>{t.icon} {t.name}</button>
          ))}
        </div>

        <div style={{display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap'}}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: '50%', background: c,
              border: color === c ? '3px solid var(--accent)' : '2px solid var(--border-color)',
              cursor: 'pointer',
            }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0}} />
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center'}}>
          <span style={{fontSize: '0.75rem', color: 'var(--text-tertiary)'}}>Толщина:</span>
          <input type="range" min="1" max="20" value={size} onChange={e => setSize(Number(e.target.value))}
            style={{flex: 1, maxWidth: 120}} />
          <span style={{fontSize: '0.75rem', width: 24}}>{size}</span>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center'}}>
          <span style={{fontSize: '0.75rem', color: 'var(--text-tertiary)'}}>Прозрачность:</span>
          <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={e => setOpacity(Number(e.target.value))}
            style={{flex: 1, maxWidth: 120}} />
          <span style={{fontSize: '0.75rem', width: 24}}>{Math.round(opacity * 100)}%</span>
        </div>

        <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16}}>
          <button onClick={undo} disabled={historyIndex <= 0} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)', cursor: 'pointer', opacity: historyIndex <= 0 ? 0.5 : 1,
          }}>↩ Undo</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)', cursor: 'pointer', opacity: historyIndex >= history.length - 1 ? 0.5 : 1,
          }}>↪ Redo</button>
          <button onClick={clearCanvas} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--danger, #ef4444)',
            background: 'transparent', color: '#ef4444', cursor: 'pointer',
          }}>🗑 Очистить</button>
        </div>

        <div style={{display: 'flex', justifyContent: 'center', marginBottom: 12}}>
          <div style={{
            width: 180, height: 180, borderRadius: '50%', overflow: 'hidden',
            border: '3px solid var(--border-color)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            <canvas ref={canvasRef} width={256} height={256}
              style={{width: '100%', height: '100%', cursor: 'crosshair'}}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            />
          </div>
        </div>

        <div style={{display: 'flex', gap: 10}}>
          <button onClick={onSkip} style={{
            flex: 1, padding: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            borderRadius: 12, cursor: 'pointer', fontWeight: 600,
          }}>Пропустить</button>
          <button onClick={handleSave} style={{
            flex: 1, padding: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 600,
          }}>Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default AvatarDrawer;
