import React, { useState, useEffect, useRef, useCallback } from 'react';
import { animate } from 'animejs';
import apiClient from '../services/api';
import './TransferModal.css';

const QUARKPAY_DOMAIN = 'https://f1w6ggb2-5174.euw.devtunnels.ms';

interface TransferModalProps {
  onClose: () => void;
  toUsername: string;
  toAvatar?: string;
  toFirstName?: string;
  toLastName?: string;
  onTransferSuccess?: () => void;
}

type ModalStep = 'checking' | 'not_connected' | 'recipient_not_connected' | 'sending_proposal' | 'proposal_sent';

const TransferModal: React.FC<TransferModalProps> = ({
  onClose, toUsername, toAvatar, toFirstName, toLastName, onTransferSuccess
}) => {
  const [step, setStep] = useState<ModalStep>('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectCode, setConnectCode] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const displayName = toFirstName
    ? `${toFirstName} ${toLastName || ''}`.trim()
    : toUsername;

  useEffect(() => {
    if (modalRef.current) {
      animate(modalRef.current, {
        translate: ['80px 0', '0px 0'],
        opacity: [0, 1],
        duration: 300,
        ease: 'outCubic',
      });
    }
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await apiClient.get('/payment/quarkpay-status');
        const myConnected = res.data.connected;

        if (!myConnected) {
          setStep('not_connected');
          return;
        }

        try {
          const recipientRes = await apiClient.get(`/payment/quarkpay-recipient-status/${toUsername}`);
          const recipientConnected = recipientRes.data.connected;

          if (!recipientConnected) {
            setStep('recipient_not_connected');
          } else {
            setStep('not_connected');
          }
        } catch {
          setStep('recipient_not_connected');
        }
      } catch {
        setStep('not_connected');
      }
    };
    checkStatus();
  }, [toUsername]);

  const animateClose = useCallback(() => {
    if (modalRef.current) {
      animate(modalRef.current, {
        translate: ['0px 0', '80px 0'],
        opacity: [1, 0],
        duration: 200,
        ease: 'inCubic',
      }).then(() => onClose());
    } else {
      onClose();
    }
  }, [onClose]);

  const handleSendProposal = async () => {
    setStep('sending_proposal');
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/payment/quarkpay-generate-connect-code');
      const code = res.data?.connect_code;
      if (!code) {
        setError('Не удалось получить код подключения');
        setStep('recipient_not_connected');
        setLoading(false);
        return;
      }
      setConnectCode(code);

      const connectUrl = `${QUARKPAY_DOMAIN}/connect/${code}`;

      await apiClient.post('/messages/send', {
        chat_id: undefined,
        content: `💳 Предлагаю подключить QuarkPay для переводов!\n\nQuarkPay — это удобный способ отправлять деньги прямо в чатах Monogram.\n\nНажмите кнопку ниже, чтобы подключить:`,
        chat_name: toUsername,
        type: 'connect_proposal',
        connect_url: connectUrl,
      });

      setStep('proposal_sent');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Не удалось отправить предложение');
      setStep('recipient_not_connected');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) animateClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      paddingBottom: 80, background: 'rgba(0,0,0,0.3)',
    }}>
      <div ref={modalRef} style={{
        background: 'var(--bg-card, #1e1e1e)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        width: 340,
        maxHeight: 'calc(100vh - 120px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--accent-dim)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              {toAvatar ? (
                <img src={toAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
                  {toUsername.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{displayName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>@{toUsername}</div>
            </div>
          </div>
          <button onClick={animateClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: 4, fontSize: 18,
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 16px', flex: 1, overflowY: 'auto' }}>

          {step === 'checking' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-tertiary)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>Q</div>
              <div style={{
                height: 14, width: '60%', background: 'var(--bg-primary)', borderRadius: 7,
                margin: '0 auto 8px', animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <div style={{
                height: 12, width: '80%', background: 'var(--bg-primary)', borderRadius: 6,
                margin: '0 auto', animation: 'pulse 1.5s ease-in-out infinite 0.2s',
              }} />
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 12 }}>Проверка подключения...</p>
            </div>
          )}

          {step === 'not_connected' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', fontSize: '1.3rem', fontWeight: 800, color: '#000',
              }}>Q</div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>
                Подключить QuarkPay
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
                Для переводов нужно подключить QuarkPay к вашему аккаунту Monogram
              </p>

              <div style={{
                background: 'var(--bg-primary)', borderRadius: 12, padding: '14px 16px',
                marginBottom: 16, textAlign: 'left',
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600 }}>
                  Monogram будет иметь доступ к:
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <li>Полный профиль QuarkPay</li>
                  <li>Просматривать ваш PIN-код</li>
                  <li>Создавать транзакции и выполнять их</li>
                </ul>
              </div>

              <button onClick={async () => {
                try {
                  const res = await apiClient.post('/payment/quarkpay-generate-connect-code');
                  const code = res.data?.connect_code;
                  if (code) {
                    window.location.href = `${QUARKPAY_DOMAIN}/connect/${code}`;
                  }
                } catch {
                  window.location.href = `${QUARKPAY_DOMAIN}/connect`;
                }
              }} style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                color: '#000', border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                textAlign: 'center',
              }}>
                Подключить
              </button>
            </div>
          )}

          {step === 'recipient_not_connected' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', fontSize: '1.5rem',
              }}>💸</div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>
                @{toUsername} не подключён
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
                Этот пользователь ещё не использует QuarkPay. Хотите отправить ему предложение подключить?
              </p>

              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>
              )}

              <button onClick={handleSendProposal} disabled={loading} style={{
                width: '100%', padding: '12px',
                background: 'var(--gradient-primary)',
                color: 'white', border: 'none', borderRadius: 12,
                fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Отправка...' : 'Отправить предложение'}
              </button>
            </div>
          )}

          {step === 'sending_proposal' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{
                width: 40, height: 40, border: '3px solid var(--border-color)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 12px',
              }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Отправка предложения...</p>
            </div>
          )}

          {step === 'proposal_sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#10b981', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>
                Предложение отправлено!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
                Сообщение с предложением подключить QuarkPay отправлено @{toUsername}. Как только он подключится, вы сможете отправлять переводы.
              </p>

              <button onClick={animateClose} style={{
                width: '100%', padding: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 12,
                color: 'var(--text-primary)', fontWeight: 600,
                fontSize: '0.95rem', cursor: 'pointer',
              }}>
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default TransferModal;
