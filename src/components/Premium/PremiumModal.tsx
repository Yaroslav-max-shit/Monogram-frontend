import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PREMIUM_PRICES, PREMIUM_DISCOUNT } from '../../services/premium';
import Icon from '../Icon';
import './PremiumModal.css';

interface PremiumModalProps {
  onClose: () => void;
  initialPlan?: 'month' | 'year';
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, initialPlan }) => {
  const [step, setStep] = useState<'payment' | 'success'>('payment');
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan || 'month');

  const QUARKPAY_DOMAIN = import.meta.env.VITE_QUARKPAY_URL || '';

  const handleQuarkPay = () => {
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
        <div className="premium-modal" onClick={e => e.stopPropagation()}>
          <div className="premium-success">
            <div className="premium-success-icon">
              <Icon name="check" size={40} />
            </div>
            <h2 className="premium-success-title">Готово!</h2>
            <p className="premium-success-text">
              Premium на {selectedPlan === 'month' ? '1 месяц' : '12 месяцев'}
            </p>
            <button className="premium-btn premium-btn-continue" onClick={onClose}>
              Продолжить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="premium-modal" onClick={e => e.stopPropagation()}>
        <div className="premium-header">
          <div className="premium-header-bg" />
          <button className="premium-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
          <div className="premium-header-content">
            <div className="premium-icon-wrap">
              <Icon name="crown" size={32} />
            </div>
            <h2 className="premium-title">Premium</h2>
            <p className="premium-subtitle">
              {selectedPlan === 'month'
                ? `${PREMIUM_PRICES.monthly}₽ / месяц`
                : `${PREMIUM_PRICES.yearly}₽ / год (−${PREMIUM_DISCOUNT}%)`}
            </p>
          </div>
        </div>

        <div className="premium-body">
          <div className="premium-features">
            <div className="premium-feature">
              <Icon name="check" size={16} />
              <span>Больше аккаунтов в QuarkPay</span>
            </div>
            <div className="premium-feature">
              <Icon name="check" size={16} />
              <span>Приоритетная поддержка</span>
            </div>
            <div className="premium-feature">
              <Icon name="check" size={16} />
              <span>Расширенные возможности ботов</span>
            </div>
            <div className="premium-feature">
              <Icon name="check" size={16} />
              <span>Эксклюзивные стикеры</span>
            </div>
          </div>

          <div className="premium-plan-toggle">
            <button
              className={`premium-plan-btn ${selectedPlan === 'month' ? 'active' : ''}`}
              onClick={() => setSelectedPlan('month')}
            >
              1 мес
            </button>
            <button
              className={`premium-plan-btn ${selectedPlan === 'year' ? 'active' : ''}`}
              onClick={() => setSelectedPlan('year')}
            >
              12 мес
              <span className="premium-plan-badge">−{PREMIUM_DISCOUNT}%</span>
            </button>
          </div>

          <div className="premium-qr">
            <QRCodeSVG
              value={`https://monogram-one-mu.vercel.app/premium`}
              size={140}
              level="H"
              bgColor="transparent"
              fgColor="var(--text-primary)"
              style={{ borderRadius: 12, display: 'block' }}
            />
          </div>

          <div className="premium-pay-buttons">
            <button className="premium-btn premium-btn-quarkpay" onClick={handleQuarkPay}>
              <div className="premium-btn-icon">Q</div>
              QuarkPay
            </button>
            <button className="premium-btn premium-btn-yoomoney" onClick={handleYooMoney}>
              <span className="premium-btn-icon">Ю</span>
              ЮMoney
            </button>
            <button className="premium-btn premium-btn-test" onClick={handleTestPay}>
              Тестовая оплата
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
