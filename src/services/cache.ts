// Local cache service — Telegram-style
// Chats and messages stored in IndexedDB, shown immediately on load

const DB_NAME = 'monogram-cache';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('chat_id', 'chat_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    };
  });
};

// ---- Chats ----

export const cacheChats = async (chats: any[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    for (const chat of chats) {
      store.put(chat);
    }
    // Сохраняем время обновления
    const metaTx = db.transaction('meta', 'readwrite');
    metaTx.objectStore('meta').put(Date.now(), 'chats_updated');
    await new Promise(r => tx.oncomplete = r);
  } catch {}
};

export const getCachedChats = async (): Promise<any[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction('chats', 'readonly');
    const store = tx.objectStore('chats');
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

// ---- Messages ----

export const cacheMessages = async (chatId: number, messages: any[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    for (const msg of messages) {
      store.put({ ...msg, chat_id: chatId });
    }
    await new Promise(r => tx.oncomplete = r);
  } catch {}
};

export const getCachedMessages = async (chatId: number): Promise<any[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('chat_id');
    return new Promise((resolve) => {
      const request = index.getAll(chatId);
      request.onsuccess = () => {
        const msgs = request.result || [];
        msgs.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
        resolve(msgs);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

export const addCachedMessage = async (message: any): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    tx.objectStore('messages').put({ ...message, chat_id: message.chat_id });
  } catch {}
};

// ---- Online status ----

export const isOnline = (): boolean => navigator.onLine;

let onlineCallback: ((online: boolean) => void) | null = null;

export const onOnlineStatusChange = (callback: (online: boolean) => void) => {
  onlineCallback = callback;
  const handler = () => callback(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
};
