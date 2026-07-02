import React, { useState } from 'react';
import apiClient from '../services/api';
import Icon from './Icon';

interface Props {
  text: string;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'uz', name: "O'zbek" },
  { code: 'kk', name: 'Қазақ' },
  { code: 'be', name: 'Беларуская' },
  { code: 'uk', name: 'Українська' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
];

const TranslatorModal: React.FC<Props> = ({ text, onClose }) => {
  const [targetLang, setTargetLang] = useState('en');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/ai/translate', {
        text,
        target_lang: targetLang
      });
      setTranslated(res.data.translated || res.data.text || '');
    } catch (err) {
      setError('Ошибка перевода');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Переводчик</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Оригинальный текст */}
        <div style={{ 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 8, 
          marginBottom: 12,
          fontSize: 14,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap'
        }}>
          {text}
        </div>

        {/* Выбор языка */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
            Перевести на:
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)' 
            }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* Кнопка перевода */}
        <button
          onClick={handleTranslate}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {loading ? 'Переводим...' : 'Перевести'}
        </button>

        {/* Результат */}
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>
        )}
        
        {translated && (
          <div style={{ 
            padding: 12, 
            background: 'var(--bg-tertiary)', 
            borderRadius: 8, 
            fontSize: 14,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            borderLeft: '3px solid var(--accent)'
          }}>
            {translated}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslatorModal;
