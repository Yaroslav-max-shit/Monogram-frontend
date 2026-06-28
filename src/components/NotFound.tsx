import React from 'react';

interface NotFoundProps {
  title?: string;
  message?: string;
  description?: string;
  onClose?: () => void;
}

const NotFound: React.FC<NotFoundProps> = ({
  message = 'Страница не найдена',
  description = 'Запрашиваемая страница не существует или была перемещена.',
  onClose
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 30% 40%, rgba(245,158,11,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(124,58,237,0.08) 0%, transparent 50%)',
      }} />

      <div style={{position: 'relative', maxWidth: 400}}>
        <div style={{fontSize: '5rem', marginBottom: 16, lineHeight: 1}}>
          🔍
        </div>

        <div style={{
          fontSize: '7rem', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          404
        </div>

        <h1 style={{fontSize: '1.4rem', fontWeight: 700, marginBottom: 8}}>{message}</h1>
        <p style={{color: 'rgba(255,255,255,0.6)', marginBottom: 32, fontSize: '0.95rem'}}>{description}</p>

        <button
          onClick={onClose || (() => window.location.href = '/')}
          style={{
            padding: '14px 36px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white', border: 'none', borderRadius: 14,
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
          }}
        >
          На главную
        </button>
      </div>
    </div>
  );
};

export default NotFound;
