// E2EE Service — обёртка над encryption.ts для совместимости с App.tsx

import { initE2EEKeys, removeE2EEKeys } from './encryption';

let currentUserId: number | null = null;

// Инициализация E2EE для пользователя
export async function initE2EE(userId: number): Promise<boolean> {
  try {
    currentUserId = userId;
    await initE2EEKeys(userId);
    localStorage.setItem('e2ee_initialized', 'true');
    return true;
  } catch {
    return false;
  }
}

// Проверка включён ли E2EE для чата
export function isE2EEEnabled(chatId: number): boolean {
  return localStorage.getItem(`e2ee_chat_${chatId}`) !== 'disabled';
}

// Загрузка настроек E2EE
export function loadE2EESettings(): { enabled: boolean } {
  return { enabled: true };
}

// Включение/выключение E2EE для чата
export function setE2EEEnabled(chatId: number, enabled: boolean): void {
  localStorage.setItem(`e2ee_chat_${chatId}`, enabled ? 'enabled' : 'disabled');
}

// Сброс ключей E2EE
export function resetE2EEKeys(): void {
  if (currentUserId) {
    removeE2EEKeys(currentUserId);
  }
  localStorage.removeItem('e2ee_initialized');
}

export default {
  initE2EE,
  isE2EEEnabled,
  loadE2EESettings,
  setE2EEEnabled,
  resetE2EEKeys,
};
