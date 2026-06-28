import React, { useState, useRef, useEffect } from 'react';

interface PinModalProps {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  error?: string;
}

const PinModal: React.FC<PinModalProps> = ({ onSubmit, onCancel, title = 'Введите PIN-код', error }) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    if (newDigits.every(d => d !== '')) {
      onSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      onSubmit(pasted);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: 20,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', borderRadius: 24, padding: '32px 28px',
        width: '100%', maxWidth: 340, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h3 style={{margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 600}}>{title}</h3>
        <div style={{display: 'flex', gap: 10, justifyContent: 'center', marginBottom: error ? 12 : 20}}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              style={{
                width: 52, height: 56, textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                border: `2px solid ${error ? '#ef4444' : digit ? '#f59e0b' : 'var(--border-color)'}`,
                borderRadius: 14, background: 'var(--bg-primary)', color: 'var(--text-primary)',
                outline: 'none', transition: 'border-color 0.2s',
              }}
            />
          ))}
        </div>
        {error && <div style={{color: '#ef4444', fontSize: '0.8rem', marginBottom: 16}}>{error}</div>}
        <button onClick={onCancel} style={{
          width: '100%', padding: 12, background: 'none', border: '1px solid var(--border-color)',
          borderRadius: 12, color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer',
        }}>
          Отмена
        </button>
      </div>
    </div>
  );
};

export default PinModal;
