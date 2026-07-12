import axios from 'axios';
import { getSession, saveSession, clearSession } from './cookies';

const API_URL = import.meta.env.VITE_API_URL || 'https://monogram-backend-dxv4.onrender.com';

const apiClient = axios.create({
    baseURL: API_URL,
});
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Прораннее обновление токена каждые 6 дней (токен живёт 7 дней)
const scheduleTokenRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
        try {
            const session = await getSession();
            if (!session?.token) return;
            const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
                headers: { Authorization: `Bearer ${session.token}` }
            });
            const newToken = response.data.access_token;
            if (newToken) {
                await saveSession(newToken, session.user);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            }
        } catch {}
        scheduleTokenRefresh(); // Планируем следующее обновление
    }, 6 * 24 * 60 * 60 * 1000); // 6 дней
};

apiClient.interceptors.request.use(async (config) => {
    const session = await getSession();
    if (session?.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                });
            }
            
            originalRequest._retry = true;
            isRefreshing = true;
            
            try {
                const session = await getSession();
                if (!session?.token) {
                    throw new Error('No token');
                }
                
                const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
                    headers: { Authorization: `Bearer ${session.token}` }
                });
                
                const newToken = response.data.access_token;
                if (newToken) {
                    await saveSession(newToken, session.user);
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    scheduleTokenRefresh();
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Токен истёк — выходим из аккаунта
                clearSession();
                window.location.href = '/';
            } finally {
                isRefreshing = false;
            }
        }
        
        return Promise.reject(error);
    }
);

// Запускаем прораннее обновление при старте
scheduleTokenRefresh();

export const searchUsers = async (query: string) => {
    const response = await apiClient.get(`/users/search?q=${query}`);
    return response.data;
};

export default apiClient;
