import apiClient from './api';

let ws: WebSocket | null = null;
let globalHandler: ((msg: any) => void) | null = null;
let currentUserId: number | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let authToken: string | null = null;

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
    
    const url = `${WS_URL}/${userId}?token=${encodeURIComponent(authToken)}`;
    
    try {
        ws = new WebSocket(url);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (globalHandler) {
                    globalHandler(data);
                }
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };
        
        ws.onclose = (event) => {
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

const scheduleReconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
        if (currentUserId) {
            connectToServer(currentUserId);
        }
    }, 3000);
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
    if (ws) {
        ws.close(1000);
        ws = null;
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    currentUserId = null;
};
