import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PREMIUM_PRICES, PREMIUM_DISCOUNT } from '../../services/premium';
import Icon from '../Icon';

interface PremiumModalProps {
  onClose: () => void;
  initialPlan?: 'month' | 'year';
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, initialPlan }) => {
  const [step, setStep] = useState<'payment' | 'success'>('payment');
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan || 'month');

  const QUARKPAY_DOMAIN = 'https://f1w6ggb2-5174.euw.devtunnels.ms';

  const handleQuarkPay = () => {
    // Open QuarkPay with plan info — user pays from QuarkPay account
    window.open(`${QUARKPAY_DOMAIN}/pay/${selectedPlan}`, '_blank');
  };

  const handleYooMoney = async () => {
    try {
      const { default: apiClient } = await import('../../services/api');
      const res = await apiClient.get(`/payment/yoomoney-form?plan=${selectedPlan}`);
      if (res.data?.form_url) {
        window.open(res.data.form_url, '_blank');
      }
    } catch {
      alert('ЮMoney недоступен. Попробуйте QuarkPay или тестовую оплату.');
    }
  };

  const handleTestPay = async () => {
    try {
      const { default: apiClient } = await import('../../services/api');
      await apiClient.post('/payment/test-premium', { plan: selectedPlan });
      setStep('success');
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const colors = ['#f59e0b', '#7c3aed', '#10b981', '#ec4899', '#00d4aa'];
          const particles: any[] = [];
          for (let i = 0; i < 150; i++) {
            particles.push({ x: Math.random() * canvas.width, y: -20, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4 + 2, color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() * 10 + 4, life: 1, rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10 });
          }
          const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rotation += p.rotSpeed; p.life -= 0.008; if (p.life > 0) { alive = true; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); ctx.restore(); } });
            if (alive) requestAnimationFrame(animate);
          };
          animate();
          setTimeout(() => canvas.remove(), 3000);
        }
      }, 100);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка оплаты');
    }
  };

  if (step === 'success') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: 400, borderRadius: 28, overflow: 'hidden', background: 'var(--bg-secondary)'}}>
          <div style={{padding: '48px 32px', textAlign: 'center'}}>
            <div style={{width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)'}}>
              <Icon name="check" size={40} />
            </div>
            <h2 style={{marginBottom: 8, fontSize: '1.4rem'}}>Готово!</h2>
            <p style={{color: 'var(--text-tertiary)', marginBottom: 32, fontSize: '0.95rem'}}>
              Premium на {selectedPlan === 'month' ? '1 месяц' : '12 месяцев'}
            </p>
            <button onClick={onClose} style={{
              width: '100%', padding: 14, background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white', border: 'none', borderRadius: 14, fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            }}>Продолжить</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 400, width: '100%', borderRadius: 28, overflow: 'hidden',
        background: 'var(--bg-secondary)', position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>

        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 180,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
          borderRadius: '28px 28px 0 0',
        }} />

        <div style={{position: 'relative', padding: '28px 24px', textAlign: 'center'}}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.15)',
            border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem',
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          <h2 style={{margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: 'white'}}>Оплата Premium</h2>
          <p style={{opacity: 0.85, fontSize: '0.85rem', margin: '0 0 24px', color: 'white'}}>
            {selectedPlan === 'month' ? `${PREMIUM_PRICES.monthly}₽ / месяц` : `${PREMIUM_PRICES.yearly}₽ / год (−${PREMIUM_DISCOUNT}%)`}
          </p>

          <div style={{
            display: 'inline-block', background: 'white', padding: 16, borderRadius: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 24,
          }}>
            <QRCodeSVG
              value={`https://monogram-one-mu.vercel.app/premium`}
              size={160}
              level="H"
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              style={{borderRadius: 12, display: 'block'}}
            />
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <button onClick={handleQuarkPay} style={{
              width: '100%', padding: 14, background: 'linear-gradient(135deg, #00d4aa, #00b894)',
              color: 'white', border: 'none', borderRadius: 14, fontSize: '0.95rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <div style={{width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem'}}>Q</div>
              QuarkPay
            </button>

            <button onClick={handleYooMoney} style={{
              width: '100%', padding: 14, background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: 'white', border: 'none', borderRadius: 14, fontSize: '0.95rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{fontWeight: 800, fontSize: '1rem'}}>Ю</span>
              ЮMoney
            </button>

            <button onClick={handleTestPay} style={{
              width: '100%', padding: 12, background: 'transparent',
              color: 'var(--text-tertiary)', border: 'none', borderRadius: 14,
              fontSize: '0.85rem', cursor: 'pointer',
            }}>
              Тестовая оплата
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
