import apiClient from './api';

let ws: WebSocket | null = null;
let globalHandler: ((msg: any) => void) | null = null;
let currentUserId: number | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let authToken: string | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let pongTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

const WS_BACKEND = import.meta.env.VITE_API_URL || '';
const WS_URL = WS_BACKEND.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

export const connectToServer = async (userId: number) => {
    currentUserId = userId;
    
    const session = await import('./cookies').then(m => m.getSession());
    authToken = session?.token || null;
    if (!authToken) return;
    
    if (ws) {
        ws.close();
        ws = null;
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    clearPing();
    
    const url = `${WS_URL}/${userId}?token=${encodeURIComponent(authToken)}`;
    
    try {
        ws = new WebSocket(url);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            reconnectAttempts = 0;
            startPing();
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'pong') {
                    if (pongTimeout) {
                        clearTimeout(pongTimeout);
                        pongTimeout = null;
                    }
                    return;
                }
                if (globalHandler) {
                    globalHandler(data);
                }
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };
        
        ws.onclose = (event) => {
            clearPing();
            if (event.code !== 1000) {
                console.log('WebSocket disconnected, reconnecting...');
                scheduleReconnect();
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (e) {
        console.error('WebSocket connection failed:', e);
        scheduleReconnect();
    }
};

const startPing = () => {
    clearPing();
    pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
            pongTimeout = setTimeout(() => {
                console.log('WS pong timeout, reconnecting...');
                if (ws) ws.close();
            }, 5000);
        }
    }, 30000);
};

const clearPing = () => {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    if (pongTimeout) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
    }
};

const scheduleReconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    console.log(`WS reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
    reconnectTimeout = setTimeout(() => {
        if (currentUserId) {
            connectToServer(currentUserId);
        }
    }, delay);
};

export const onMessage = (handler: (msg: any) => void) => {
    globalHandler = handler;
};

export const sendMessage = (type: string, data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...data }));
    }
};

export const disconnect = () => {
    clearPing();
    if (ws) {
        ws.close(1000);
        ws = null;
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    currentUserId = null;
    reconnectAttempts = 0;
};
