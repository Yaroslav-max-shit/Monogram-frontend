import { getSession } from './cookies';

type RealtimeHandler = (data: any) => void;

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://monogram-backend-dxv4.onrender.com';

class RealtimeService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<RealtimeHandler>> = new Map();
  private userId: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sseSource: EventSource | null = null;

  async connect(userId: number, token: string) {
    this.userId = userId;
    this.disconnect();

    // Подключаемся к бэкенду, а не к фронтенду (Vercel не проксирует WS)
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

    try {
      this.ws = new WebSocket(`${wsUrl}/ws/${userId}`);

      this.ws.onopen = () => {
        console.debug('[Realtime] WebSocket connected to', wsUrl);
        // Отправляем токен в первом сообщении (не в URL)
        this.ws?.send(JSON.stringify({ type: 'auth', token }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch {}
      };

      this.ws.onclose = () => {
        console.debug('[Realtime] WebSocket disconnected');
        this.scheduleReconnect();
        this.connectSSE(userId);
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.connectSSE(userId);
    }
  }

  private async connectSSE(userId: number) {
    if (this.sseSource) return;

    // Получаем расшифрованный токен из сессии
    const session = await getSession();
    const token = session?.token || '';
    if (!token) return;

    // SSE тоже на бэкенде, не на Vercel
    this.sseSource = new EventSource(`${BACKEND_URL}/api/sse/${userId}?token=${encodeURIComponent(token)}`);
    this.sseSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch {}
    };
    this.sseSource.onerror = () => {
      this.sseSource?.close();
      this.sseSource = null;
    };
  }

  private async scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.userId) {
        const session = await getSession();
        const token = session?.token || '';
        if (token) {
          this.connect(this.userId, token);
        }
      }
    }, 3000);
  }

  private emit(type: string, data: any) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(h => h(data));
    }
  }

  on(type: string, handler: RealtimeHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.sseSource?.close();
    this.sseSource = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const realtime = new RealtimeService();
