const ENCRYPTION_KEY = 'monogram-e2e-key-2024-secure-v2-final';

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const getKey = async (): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(ENCRYPTION_KEY), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('monogram-salt-v2'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (plaintext: string): Promise<string> => {
  try {
    const key = await getKey();
    const data = new TextEncoder().encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    let binary = '';
    for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
    return btoa(binary);
  } catch (e) { console.error('Encrypt error:', e); return plaintext; }
};

export const decryptMessage = async (encryptedBase64: string): Promise<string> => {
  if (!encryptedBase64) return encryptedBase64;
  try {
    const key = await getKey();
    const binaryString = atob(encryptedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    if (bytes.length < 13) {
      console.error('Decrypt: data too short');
      return encryptedBase64;
    }
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data.buffer);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decrypt failed:', e);
    return encryptedBase64;
  }
};

export const encryptData = (data: string, password: string): string => {
  if (!data) return data;
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ password.charCodeAt(i % password.length));
  }
  return btoa(result);
};

export const decryptData = (encryptedData: string, password: string): string => {
  if (!encryptedData) return encryptedData;
  try {
    const data = atob(encryptedData);
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return result;
  } catch { return encryptedData; }
};

export const isEncrypted = (data: string): boolean => {
  if (!data || data.length < 24) return false;
  const trimmed = data.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('<')) return false;
  return /^[A-Za-z0-9+/=]{24,}$/.test(trimmed);
};

export const generateChatKey = async (): Promise<string> => {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return arrayBufferToBase64(await crypto.subtle.exportKey('raw', key));
};

export const hashFile = async (file: File | Blob): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return arrayBufferToBase64(hash);
};

export default {
  encryptMessage, decryptMessage, encryptData, decryptData,
  arrayBufferToBase64, generateChatKey, hashFile, isEncrypted,
};
