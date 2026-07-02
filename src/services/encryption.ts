// ============================================
//   E2E ШИФРОВАНИЕ — X25519 + AES-GCM 256-bit
// ============================================
// Приватный ключ хранится в IndexedDB.
// Публичный ключ загружается на сервер через POST /e2ee/set-public-key.
// При отправке: получаем публичный ключ получателя → X25519 DH → AES-GCM.
// Фоллбэк: если публичный ключ получателя недоступен, используется симметричный ключ из chat ID.

import apiClient from './api';

// ============================================
//   УТИЛИТЫ ДЛЯ КОНВЕРТАЦИИ
// ============================================

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  // Проверяем валидность base64 перед atob
  const cleaned = base64.replace(/[\s\n\r]/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error('Invalid base64 string');
  }
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// ============================================
//   IndexedDB ДЛЯ ХРАНЕНИЯ КЛЮЧЕЙ
// ============================================

const DB_NAME = 'monogram-e2ee';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const storeKey = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadKey = async (key: string): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const deleteKey = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ============================================
//   ГЕНЕРАЦИЯ КЛЮЧЕЙ И ОБМЕН
// ============================================

// Генерация новой пары ключей ECDH (P-256)
export const generateKeyPair = async (): Promise<{ publicKey: string; privateKey: CryptoKey }> => {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(publicKeyRaw);
  
  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
  };
};

// Инициализация E2EE для пользователя
export const initE2EEKeys = async (userId: number): Promise<string | null> => {
  const storageKey = `e2ee_${userId}`;
  
  // Проверяем, есть ли уже ключ в IndexedDB
  const stored = await loadKey(storageKey);
  
  if (stored && stored.privateKey && stored.publicKey) {
    // Ключ уже есть — возвращаем публичный ключ
    return stored.publicKey;
  }
  
  // Генерируем новую пару ключей
  const { publicKey, privateKey } = await generateKeyPair();
  
  // Сохраняем оба ключа в IndexedDB
  await storeKey(storageKey, { publicKey, privateKey });
  
  // Загружаем публичный ключ на сервер
  try {
    await apiClient.post('/e2ee/set-public-key', { public_key: publicKey });
  } catch (error) {
    console.error('Ошибка загрузки публичного ключа:', error);
  }
  
  return publicKey;
};

// Загрузка приватного ключа из IndexedDB
const getPrivateKey = async (userId: number): Promise<CryptoKey | null> => {
  const storageKey = `e2ee_${userId}`;
  const stored = await loadKey(storageKey);
  
  if (!stored || !stored.privateKey) return null;
  
  // Импортируем ключ из Raw формата
  const privateKeyRaw = base64ToArrayBuffer(stored.privateKey);
  return crypto.subtle.importKey(
    'raw',
    privateKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
};

// Получение публичного ключа собеседника с сервера
const getRecipientPublicKey = async (userId: number): Promise<CryptoKey | null> => {
  try {
    const response = await apiClient.get(`/e2ee/get-public-key/${userId}`);
    const publicKeyBase64 = response.data?.public_key;
    
    if (!publicKeyBase64) return null;
    
    const publicKeyRaw = base64ToArrayBuffer(publicKeyBase64);
    
    return crypto.subtle.importKey(
      'raw',
      publicKeyRaw,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
  } catch (error) {
    console.error('Ошибка получения публичного ключа:', error);
    return null;
  }
};

// Вычисление общего секрета через ECDH
const deriveSharedSecret = async (
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> => {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Фоллбэк: создание симметричного ключа из chat ID
const getSymmetricKey = async (chatId: number): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`monogram-chat-${chatId}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('monogram-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// ============================================
//   ШИФРОВАНИЕ / ДЕШИФРОВАНИЕ ТЕКСТА
// ============================================

// Шифрование сообщения
export const encryptMessage = async (
  plaintext: string,
  recipientUserId: number,
  senderUserId: number,
  chatId: number
): Promise<string> => {
  try {
    const privateKey = await getPrivateKey(senderUserId);
    const recipientPublicKey = await getRecipientPublicKey(recipientUserId);
    
    let key: CryptoKey;
    
    if (privateKey && recipientPublicKey) {
      // Используем ECDH для создания общего секрета
      key = await deriveSharedSecret(privateKey, recipientPublicKey);
    } else {
      // Фоллбэк: симметричный ключ из chat ID
      key = await getSymmetricKey(chatId);
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Формат: iv (12 bytes) + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Ошибка шифрования:', error);
    return plaintext;
  }
};

// Дешифрование сообщения
export const decryptMessage = async (
  encryptedBase64: string,
  senderUserId: number,
  recipientUserId: number,
  chatId: number
): Promise<string> => {
  if (!encryptedBase64) return encryptedBase64;
  
  try {
    const privateKey = await getPrivateKey(recipientUserId);
    const senderPublicKey = await getRecipientPublicKey(senderUserId);
    
    let key: CryptoKey;
    
    if (privateKey && senderPublicKey) {
      // Используем ECDH для создания общего секрета
      key = await deriveSharedSecret(privateKey, senderPublicKey);
    } else {
      // Фоллбэк: симметричный ключ из chat ID
      key = await getSymmetricKey(chatId);
    }
    
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Ошибка расшифровки:', error);
    return encryptedBase64;
  }
};

// ============================================
//   ШИФРОВАНИЕ / ДЕШИФРОВАНИЕ ФАЙЛОВ
// ============================================

export const encryptFile = async (
  file: File | Blob,
  recipientUserId: number,
  senderUserId: number,
  chatId: number
): Promise<{ encrypted: Blob; iv: Uint8Array }> => {
  try {
    const privateKey = await getPrivateKey(senderUserId);
    const recipientPublicKey = await getRecipientPublicKey(recipientUserId);
    
    let key: CryptoKey;
    if (privateKey && recipientPublicKey) {
      key = await deriveSharedSecret(privateKey, recipientPublicKey);
    } else {
      key = await getSymmetricKey(chatId);
    }
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );
    
    return {
      encrypted: new Blob([encrypted], { type: 'application/octet-stream' }),
      iv
    };
  } catch (error) {
    console.error('Ошибка шифрования файла:', error);
    throw error;
  }
};

export const decryptFile = async (
  encryptedBlob: Blob,
  iv: Uint8Array,
  senderUserId: number,
  recipientUserId: number,
  chatId: number,
  originalType: string = 'application/octet-stream'
): Promise<Blob> => {
  try {
    const privateKey = await getPrivateKey(recipientUserId);
    const senderPublicKey = await getRecipientPublicKey(senderUserId);
    
    let key: CryptoKey;
    if (privateKey && senderPublicKey) {
      key = await deriveSharedSecret(privateKey, senderPublicKey);
    } else {
      key = await getSymmetricKey(chatId);
    }
    
    const encryptedBuffer = await encryptedBlob.arrayBuffer();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      encryptedBuffer
    );
    
    return new Blob([decrypted], { type: originalType });
  } catch (error) {
    console.error('Ошибка расшифровки файла:', error);
    throw error;
  }
};

export const encryptFileToBase64 = async (
  file: File | Blob,
  recipientUserId: number,
  senderUserId: number,
  chatId: number
): Promise<string> => {
  try {
    const { encrypted, iv } = await encryptFile(file, recipientUserId, senderUserId, chatId);
    const encryptedBuffer = await encrypted.arrayBuffer();
    
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Ошибка шифрования файла в base64:', error);
    throw error;
  }
};

export const decryptFileFromBase64 = async (
  base64Data: string,
  senderUserId: number,
  recipientUserId: number,
  chatId: number,
  originalType: string = 'application/octet-stream'
): Promise<Blob> => {
  try {
    const combined = new Uint8Array(base64ToArrayBuffer(base64Data));
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const privateKey = await getPrivateKey(recipientUserId);
    const senderPublicKey = await getRecipientPublicKey(senderUserId);
    
    let key: CryptoKey;
    if (privateKey && senderPublicKey) {
      key = await deriveSharedSecret(privateKey, senderPublicKey);
    } else {
      key = await getSymmetricKey(chatId);
    }
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    return new Blob([decrypted], { type: originalType });
  } catch (error) {
    console.error('Ошибка расшифровки файла из base64:', error);
    throw error;
  }
};

// ============================================
//   ШИФРОВАНИЕ / ДЕШИФРОВАНИЕ JSON
// ============================================

export const encryptJSON = async (
  data: object,
  recipientUserId: number,
  senderUserId: number,
  chatId: number
): Promise<string> => {
  const jsonString = JSON.stringify(data);
  return encryptMessage(jsonString, recipientUserId, senderUserId, chatId);
};

export const decryptJSON = async <T = object>(
  encryptedData: string,
  senderUserId: number,
  recipientUserId: number,
  chatId: number
): Promise<T> => {
  const jsonString = await decryptMessage(encryptedData, senderUserId, recipientUserId, chatId);
  return JSON.parse(jsonString) as T;
};

// ============================================
//   УТИЛИТЫ
// ============================================

export const hashFile = async (file: File | Blob): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToBase64(hash);
};

export const isEncrypted = (data: string): boolean => {
  if (!data || data.length < 24) return false;
  const trimmed = data.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('<')) return false;
  // Проверяем валидную base64 строку чётной длины (с учётом padding)
  if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) return false;
  // Длина должна быть кратна 4 (с учётом padding) для валидного base64
  const padded = trimmed.length % 4 === 0 ? trimmed : trimmed + '='.repeat(4 - (trimmed.length % 4));
  return padded.length >= 24;
};

// Удаление ключей (при логауте)
export const removeE2EEKeys = async (userId: number): Promise<void> => {
  await deleteKey(`e2ee_${userId}`);
};

// ============================================
//   ЭКСПОРТ
// ============================================

export default {
  generateKeyPair,
  initE2EEKeys,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
  encryptFileToBase64,
  decryptFileFromBase64,
  encryptJSON,
  decryptJSON,
  arrayBufferToBase64,
  hashFile,
  isEncrypted,
  removeE2EEKeys,
};
