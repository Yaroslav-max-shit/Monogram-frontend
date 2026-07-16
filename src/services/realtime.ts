import { getSession } from './cookies';

type RealtimeHandler = (data: any) => void;

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://monogram-backend-dxv4.onrender.com';

class RealtimeService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<RealtimeHandler>> = new Map();
  private userId: number | null = null;
  private token: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sseSource: EventSource | null = null;
  private sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  async connect(userId: number, token: string) {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.userId = userId;
    this.token = token;
    this.reconnectAttempts = 0;
    this.intentionallyClosed = false;
    
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

    try {
      if (this.ws) {
        this.intentionallyClosed = true;
        this.ws.close(1000, 'Reconnecting');
        this.ws = null;
        this.intentionallyClosed = false;
      }
      
      this.ws = new WebSocket(`${wsUrl}/ws/${userId}`);

      this.connectTimeoutTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('[WS] Connection timeout, closing');
          this.ws.close(4008, 'Timeout');
        }
      }, 45000);

      this.ws.onopen = () => {
        clearTimeout(this.connectTimeoutTimer!);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.ws?.send(JSON.stringify({ type: 'auth', token: this.token }));
        console.log('[WS] Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          if (data.type === 'pong') return;
          this.emit(data.type, data);
        } catch {}
      };

      this.ws.onclose = (event) => {
        clearTimeout(this.connectTimeoutTimer!);
        this.isConnecting = false;
        
        if (this.intentionallyClosed) return;
        
        console.log(`[WS] Closed: ${event.code} ${event.reason}`);

        if (event.code === 4001 || event.code === 4003) {
          console.warn('[WS] Auth failed, not reconnecting');
          return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectAttempts++;
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.reconnectTimer = setTimeout(async () => {
            if (!this.userId) return;
            const session = await getSession();
            if (!session?.token) {
              console.warn('[WS] No valid token, stopping reconnection');
              return;
            }
            this.token = session.token;
            this.connect(this.userId, this.token);
          }, delay);
        } else {
          console.warn('[WS] Max reconnect attempts reached, falling back to SSE');
          this.scheduleSSE(2000);
        }
      };

      this.ws.onerror = () => {};

    } catch (error) {
      console.error('[WS] Connect error:', error);
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
        if (this.userId && this.reconnectAttempts < this.maxReconnectAttempts + 5) {
          this.scheduleSSE(10000);
        }
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
    this.intentionallyClosed = true;
    clearTimeout(this.connectTimeoutTimer!);
    clearTimeout(this.reconnectTimer!);
    clearTimeout(this.sseReconnectTimer!);
    this.reconnectTimer = null;
    this.sseReconnectTimer = null;
    this.connectTimeoutTimer = null;
    this.ws?.close(1000, 'Logout');
    this.ws = null;
    this.sseSource?.close();
    this.sseSource = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.userId = null;
    this.token = '';
  }
}

export const realtime = new RealtimeService();
