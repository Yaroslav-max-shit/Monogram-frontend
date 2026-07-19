import axios from 'axios';
import { getSession, saveSession, clearSession, getRefreshToken } from './cookies';

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

// Периодическое обновление access token (каждые 25 минут)
const scheduleTokenRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
        try {
            const session = await getSession();
            if (!session?.token || !session?.refreshToken) {
                scheduleTokenRefresh();
                return;
            }
            
            const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
                headers: { Authorization: `Bearer ${session.refreshToken}` }
            });
            const newToken = response.data.access_token;
            const newRefresh = response.data.refresh_token;
            if (newToken) {
                await saveSession(newToken, session.user, newRefresh);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            }
        } catch {}
        scheduleTokenRefresh();
    }, 25 * 60 * 1000);
};

// Request interceptor — добавляет токен к каждому запросу
apiClient.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('monogram_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — автоматический refresh при 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }
        
        // Не перехватываем 401 от login/register
        if (originalRequest.url?.includes('/auth/login') || 
            originalRequest.url?.includes('/auth/register') ||
            originalRequest.url?.includes('/auth/register/init') ||
            originalRequest.url?.includes('/auth/register/choose-username')) {
            return Promise.reject(error);
        }
        
        // Если refresh уже в процессе — ставим в очередь
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
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token');
            }
            
            const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
                headers: { Authorization: `Bearer ${refreshToken}` }
            });
            
            const newToken = response.data.access_token;
            const newRefresh = response.data.refresh_token;
            
            if (newToken) {
                const session = await getSession();
                const user = session?.user || { id: 0, username: '', firstName: '', lastName: '' };
                await saveSession(newToken, user, newRefresh);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                scheduleTokenRefresh();
                return apiClient(originalRequest);
            }
        } catch (refreshError) {
            processQueue(refreshError, null);
            clearSession();
            window.location.href = '/';
        } finally {
            isRefreshing = false;
        }
        
        return Promise.reject(error);
    }
);

// Запуск refresh таймера
const initTokenRefresh = async () => {
    const session = await getSession();
    if (session?.token) {
        scheduleTokenRefresh();
    }
};
initTokenRefresh();

export const searchUsers = async (query: string) => {
    const response = await apiClient.get(`/users/search?q=${query}`);
    return response.data;
};

export default apiClient;
