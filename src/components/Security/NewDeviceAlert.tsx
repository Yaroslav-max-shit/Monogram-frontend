import React from 'react';

interface NewDeviceAlertProps {
  onConfirm: () => void;
  onDeny: () => void;
  deviceInfo: any;
}

const NewDeviceAlert: React.FC<NewDeviceAlertProps> = ({ onConfirm, onDeny, deviceInfo }) => {
  return (
    <div className="new-device-toast" style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 16,
      padding: '16px 20px',
      maxWidth: 380,
      width: 'calc(100% - 40px)',
      zIndex: 10000,
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Icon name="danger" size={20} style={{ color: 'var(--accent)' }} />
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Новое устройство</h3>
      </div>
      <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Обнаружен вход с нового устройства
      </p>
      {deviceInfo && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 12 }}>
          {deviceInfo.device && <div>Устройство: {deviceInfo.device}</div>}
          {deviceInfo.ip && <div>IP: {deviceInfo.ip}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDeny} style={{
          flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-color)',
          background: 'transparent', color: 'var(--danger, #ef4444)', fontWeight: 600,
          fontSize: '0.85rem', cursor: 'pointer',
        }}>Заблокировать</button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '10px', borderRadius: 10, border: 'none',
          background: 'var(--accent)', color: 'white', fontWeight: 600,
          fontSize: '0.85rem', cursor: 'pointer',
        }}>Это я</button>
      </div>
    </div>
  );
};

export default NewDeviceAlert;
