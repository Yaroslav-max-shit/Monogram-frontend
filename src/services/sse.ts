let eventSource: EventSource | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

export const connectSSE = (userId: number, onEvent: (data: any) => void) => {
    if (eventSource) eventSource.close();
    reconnectAttempts = 0;
    
    const url = `/api/sse/${userId}`;
    eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onEvent(data);
        } catch (e) {
            console.error('Ошибка парсинга SSE:', e);
        }
    };
    
    eventSource.onerror = () => {
        if (reconnectAttempts < MAX_RECONNECT) {
            reconnectAttempts++;
            const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts - 1), 30000);
            setTimeout(() => connectSSE(userId, onEvent), delay);
        }
    };
};

export const disconnectSSE = () => {
    eventSource?.close();
    eventSource = null;
    reconnectAttempts = 0;
};
