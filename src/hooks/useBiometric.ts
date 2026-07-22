import { useState, useEffect, useCallback } from 'react';

interface BiometricState {
  isSupported: boolean;
  isEnabled: boolean;
  isAvailable: boolean;
  isMobile: boolean;
  deviceType: 'iphone' | 'android' | 'windows' | 'mac' | 'unknown';
  biometricType: 'face' | 'fingerprint' | 'iris' | 'none';
}

export const useBiometric = () => {
  const [state, setState] = useState<BiometricState>({
    isSupported: false,
    isEnabled: false,
    isAvailable: false,
    isMobile: false,
    deviceType: 'unknown',
    biometricType: 'none'
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Определение устройства
  const detectDevice = useCallback((): { isMobile: boolean; deviceType: BiometricState['deviceType'] } => {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return { isMobile: true, deviceType: 'iphone' };
    }
    if (/Android/i.test(ua)) {
      return { isMobile: true, deviceType: 'android' };
    }
    if (/Windows/i.test(ua)) {
      return { isMobile: false, deviceType: 'windows' };
    }
    if (/Mac/i.test(ua)) {
      return { isMobile: false, deviceType: 'mac' };
    }
    return { isMobile: false, deviceType: 'unknown' };
  }, []);

  // Определение типа биометрии (упрощённая проверка)
  const detectBiometricType = useCallback((): BiometricState['biometricType'] => {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad/i.test(ua)) {
      return 'face';
    }
    if (/Android/i.test(ua)) {
      return 'fingerprint';
    }
    if (/Windows/i.test(ua) && (window as any).windows) {
      return 'fingerprint';
    }
    return 'none';
  }, []);

  // Проверка поддержки биометрии
  const checkSupport = useCallback(async () => {
    const { isMobile, deviceType } = detectDevice();
    const biometricType = detectBiometricType();
    // На вебе биометрия работает только через WebAuthn, что сложно, поэтому пока отключаем
    const isSupported = false; // Отключаем биометрию на вебе
    
    setState(prev => ({
      ...prev,
      isSupported,
      isAvailable: isSupported,
      isMobile,
      deviceType,
      biometricType
    }));
  }, [detectDevice, detectBiometricType]);

  // Загрузка настроек
  useEffect(() => {
    checkSupport();
    
    const saved = localStorage.getItem('biometric_enabled');
    setState(prev => ({ ...prev, isEnabled: saved === 'true' }));
  }, [checkSupport]);

  // Аутентификация (заглушка, так как на вебе биометрия не работает)
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.isEnabled) {
      return true;
    }
    
    setIsAuthenticating(true);
    
    const pin = prompt('Введите PIN-код для входа:');
    const storedHash = localStorage.getItem('user_pin_hash');
    if (!pin || !storedHash) {
      setIsAuthenticating(false);
      return false;
    }
    const pinHash = await hashPin(pin);
    const success = pinHash === storedHash;
    
    setIsAuthenticating(false);
    return success;
  }, [state.isSupported, state.isEnabled]);

  // Включение/выключение биометрии
  const toggle = useCallback(async () => {
    const newValue = !state.isEnabled;
    
    if (newValue && state.isSupported) {
      const pin = prompt('Создайте PIN-код для входа (запасной вариант):');
      if (pin && pin.length >= 4) {
        const pinHash = await hashPin(pin);
        localStorage.setItem('user_pin_hash', pinHash);
      } else {
        return;
      }
    } else if (!newValue) {
      localStorage.removeItem('user_pin_hash');
    }
    
    setState(prev => ({ ...prev, isEnabled: newValue }));
    localStorage.setItem('biometric_enabled', String(newValue));
  }, [state.isSupported, state.isEnabled]);

  const reset = useCallback(() => {
    setState(prev => ({ ...prev, isEnabled: false }));
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('user_pin_hash');
  }, []);

  return {
    ...state,
    isAuthenticating,
    authenticate,
    toggle,
    reset,
    isBiometricAvailable: state.isSupported && state.isAvailable,
    canUseBiometric: state.isSupported && state.isEnabled
  };
};

export default useBiometric;
