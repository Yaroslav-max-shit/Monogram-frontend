import React, { useState } from 'react';
import Icon from '../Icon';
import PinModal from './PinModal';

interface BiometricAuthProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

const BiometricAuth: React.FC<BiometricAuthProps> = ({ onSuccess, onFailure }) => {
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const handlePinSubmit = (pin: string) => {
    const savedPin = localStorage.getItem('user_pin');
    if (pin === savedPin) {
      setShowPin(false);
      setPinError('');
      onSuccess();
    } else {
      setPinError('Неверный PIN-код');
    }
  };

  return (
    <>
      <button
        onClick={() => { setShowPin(true); setPinError(''); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', background: 'var(--accent)', color: 'white',
          border: 'none', borderRadius: 12, cursor: 'pointer', width: '100%',
          justifyContent: 'center', fontSize: '0.95rem', fontWeight: 600,
        }}
      >
        <Icon name="lock" size={20} />
        <span>Войти по PIN-коду</span>
      </button>
      {showPin && (
        <PinModal
          onSubmit={handlePinSubmit}
          onCancel={() => { setShowPin(false); setPinError(''); }}
          error={pinError}
        />
      )}
    </>
  );
};

export default BiometricAuth;
