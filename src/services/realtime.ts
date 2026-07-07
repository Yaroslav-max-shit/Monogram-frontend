import { getSession } from './cookies';

type RealtimeHandler = (data: any) => void;

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://monogram-backend-dxv4.onrender.com';

class RealtimeService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<RealtimeHandler>> = new Map();
  private userId: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sseSource: EventSource | null = null;
  private sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  async connect(userId: number, token: string) {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.userId = userId;
    this.disconnect();

    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

    try {
      this.ws = new WebSocket(`${wsUrl}/ws/${userId}`);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.ws?.send(JSON.stringify({ type: 'auth', token }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch {}
      };

      this.ws.onclose = () => {
        // WS закрылся — подключаем SSE с задержкой
        if (!this.sseSource) {
          this.scheduleSSE(5000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleSSE(2000);
    }
  }

  private scheduleSSE(delay: number) {
    if (this.sseReconnectTimer) return;
    this.sseReconnectTimer = setTimeout(() => {
      this.sseReconnectTimer = null;
      if (this.userId && !this.sseSource) {
        this.connectSSE(this.userId);
      }
    }, delay);
  }

  private async connectSSE(userId: number) {
    if (this.sseSource) return;

    const session = await getSession();
    const token = session?.token || '';
    if (!token) return;

    try {
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
        // Переподключаемся с большой задержкой
        this.scheduleSSE(10000);
      };
    } catch {
      this.scheduleSSE(10000);
    }
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
    this.isConnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sseReconnectTimer) {
      clearTimeout(this.sseReconnectTimer);
      this.sseReconnectTimer = null;
    }
  }
}

export const realtime = new RealtimeService();
