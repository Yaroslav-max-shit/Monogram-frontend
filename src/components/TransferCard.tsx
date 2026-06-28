import React, { useState } from 'react';
import { ArrowRightLeft, Check, Clock, X, Copy, FileText, Download } from 'lucide-react';

interface TransferCardProps {
  amount: number;
  toUsername: string;
  toAvatar?: string;
  status: 'completed' | 'processing' | 'error';
  time: string;
  txId?: string;
  comment?: string;
  isOwn: boolean;
  fromUsername?: string;
}

const TransferCard: React.FC<TransferCardProps> = ({
  amount, toUsername, toAvatar, status, time, txId, comment, isOwn, fromUsername
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const statusConfig = {
    completed: { icon: <Check size={14} />, color: '#10b981', text: 'Выполнен' },
    processing: { icon: <Clock size={14} />, color: '#f59e0b', text: 'В обработке' },
    error: { icon: <X size={14} />, color: '#ef4444', text: 'Ошибка' }
  };

  const s = statusConfig[status];
  const sender = isOwn ? 'Вы' : (fromUsername || 'Отправитель');
  const receiver = isOwn ? toUsername : 'Вы';

  const generateReceipt = () => {
    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Чек перевода</title>
<style>
  body { font-family: 'Courier New', monospace; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; margin: 0; }
  .receipt { background: white; max-width: 320px; width: 100%; padding: 24px 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .receipt-header { text-align: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 16px; margin-bottom: 16px; }
  .receipt-logo { font-size: 1.2rem; font-weight: 800; color: #7c3aed; margin-bottom: 4px; }
  .receipt-title { font-size: 0.8rem; color: #6b7280; }
  .receipt-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; }
  .receipt-label { color: #6b7280; }
  .receipt-value { font-weight: 600; text-align: right; }
  .receipt-divider { border-top: 1px dashed #e5e7eb; margin: 12px 0; }
  .receipt-amount { font-size: 1.4rem; font-weight: 800; color: #10b981; text-align: center; padding: 12px 0; }
  .receipt-footer { text-align: center; font-size: 0.7rem; color: #9ca3af; margin-top: 16px; padding-top: 12px; border-top: 2px dashed #e5e7eb; }
  .receipt-status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
  .receipt-status.ok { background: #d1fae5; color: #065f46; }
</style>
</head>
<body>
<div class="receipt">
  <div class="receipt-header">
    <div class="receipt-logo">Monogram × QuarkPay</div>
    <div class="receipt-title">ЭЛЕКТРОННЫЙ ЧЕК</div>
  </div>
  <div class="receipt-amount">${isOwn ? '-' : '+'}${amount.toLocaleString('ru-RU')} ₽</div>
  <div class="receipt-divider"></div>
  <div class="receipt-row"><span class="receipt-label">Отправитель</span><span class="receipt-value">${sender}</span></div>
  <div class="receipt-row"><span class="receipt-label">Получатель</span><span class="receipt-value">${receiver}</span></div>
  <div class="receipt-row"><span class="receipt-label">Дата и время</span><span class="receipt-value">${time}</span></div>
  ${comment ? `<div class="receipt-row"><span class="receipt-label">Комментарий</span><span class="receipt-value">${comment}</span></div>` : ''}
  <div class="receipt-row"><span class="receipt-label">Статус</span><span class="receipt-value"><span class="receipt-status ok">${s.text}</span></span></div>
  ${txId ? `<div class="receipt-row"><span class="receipt-label">ID транзакции</span><span class="receipt-value">#${txId}</span></div>` : ''}
  <div class="receipt-divider"></div>
  <div class="receipt-footer">
    Monogram Messenger × QuarkPay<br>
    Сформирован автоматически<br>
    ${new Date().toLocaleString('ru-RU')}
  </div>
</div>
</body>
</html>`;
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${txId || Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="transfer-card" onClick={() => setShowDetails(!showDetails)}>
        <div className="transfer-card-icon">
          <ArrowRightLeft size={20} />
        </div>
        
        <div className="transfer-card-body">
          <div className="transfer-card-amount">
            {isOwn ? '-' : '+'}{amount.toLocaleString('ru-RU')} ₽
          </div>
          <div className="transfer-card-user">
            {toAvatar && <img src={toAvatar} alt="" className="transfer-card-avatar" />}
            <span>{isOwn ? `→ ${toUsername}` : `← ${sender}`}</span>
          </div>
          {comment && <div className="transfer-card-comment">{comment}</div>}
        </div>
        
        <div className="transfer-card-meta">
          <span className="transfer-card-status" style={{color: s.color}}>
            {s.icon}
            <span>{s.text}</span>
          </span>
          <span className="transfer-card-time">{time}</span>
        </div>
        
        {showDetails && (
          <div className="transfer-card-details" style={{position: 'relative', bottom: 'auto', left: 'auto', marginTop: 8, borderTop: '1px solid var(--border-color)', paddingTop: 8}}>
            {txId && (
              <div style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8}}>
                <span className="transfer-card-txid">#{txId}</span>
                <button className="transfer-card-copy" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(txId); }}>
                  <Copy size={12} />
                </button>
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); setShowReceipt(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-primary)',
            }}>
              <FileText size={14} /> Создать чек
            </button>
          </div>
        )}
      </div>

      {showReceipt && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: 20}} onClick={() => setShowReceipt(false)}>
          <div onClick={e => e.stopPropagation()} style={{background: 'white', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
              <FileText size={24} color="white" />
            </div>
            <h3 style={{margin: '0 0 16px', fontSize: '1.1rem'}}>Чек перевода</h3>
            <div style={{background: '#f9fafb', borderRadius: 12, padding: 16, textAlign: 'left', fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: 16}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}><span style={{color: '#6b7280'}}>Сумма</span><span style={{fontWeight: 700, color: '#10b981'}}>{isOwn ? '-' : '+'}{amount.toLocaleString('ru-RU')} ₽</span></div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}><span style={{color: '#6b7280'}}>Отправитель</span><span style={{fontWeight: 600}}>{sender}</span></div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}><span style={{color: '#6b7280'}}>Получатель</span><span style={{fontWeight: 600}}>{receiver}</span></div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}><span style={{color: '#6b7280'}}>Дата</span><span style={{fontWeight: 600}}>{time}</span></div>
              {txId && <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#6b7280'}}>ID</span><span style={{fontWeight: 600}}>#{txId}</span></div>}
            </div>
            <div style={{display: 'flex', gap: 8}}>
              <button onClick={() => setShowReceipt(false)} style={{flex: 1, padding: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: '0.9rem', cursor: 'pointer'}}>Закрыть</button>
              <button onClick={generateReceipt} style={{flex: 1, padding: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', border: 'none', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                <Download size={16} /> Скачать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransferCard;
