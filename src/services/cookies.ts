// Session management - tokens stored in HttpOnly cookies (set by backend)
// No client-side encryption needed - cookies are HttpOnly + Secure + SameSite

interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName?: string;
  avatar_url?: string;
}

interface Session {
  token: string;
  refreshToken?: string;
  user: UserData;
}

export const saveSession = async (
    token: string,
    user: UserData,
    refreshToken?: string
) => {
    try {
        sessionStorage.setItem('monogram_user', JSON.stringify(user));
        sessionStorage.setItem('monogram_token', token);
        if (refreshToken) {
            sessionStorage.setItem('monogram_refresh_token', refreshToken);
        }
    } catch (error) {
        console.error('Error saving session:', error);
    }
};

export const getSession = async (): Promise<Session | null> => {
    try {
        let token: string | null = sessionStorage.getItem('monogram_token');

        if (!token) {
            const cookieMatch = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
            if (cookieMatch) {
                token = decodeURIComponent(cookieMatch[1]);
            }
        }

        let userStr = sessionStorage.getItem('monogram_user');
        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (!user.avatar_url) {
                try {
                    const { default: apiClient } = await import('./api');
                    const res = await apiClient.get('/auth/me');
                    if (res.data?.avatar_url) {
                        user.avatar_url = res.data.avatar_url;
                        sessionStorage.setItem('monogram_user', JSON.stringify(user));
                    }
                } catch {}
            }
            return { token, user };
        }

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const user: UserData = {
                    id: payload.user_id || payload.sub,
                    username: payload.username || '',
                    firstName: payload.first_name || '',
                    lastName: payload.last_name || '',
                    avatar_url: payload.avatar_url || '',
                };
                sessionStorage.setItem('monogram_user', JSON.stringify(user));
                try {
                    const { default: apiClient } = await import('./api');
                    const res = await apiClient.get('/auth/me');
                    if (res.data?.avatar_url) {
                        user.avatar_url = res.data.avatar_url;
                        sessionStorage.setItem('monogram_user', JSON.stringify(user));
                    }
                } catch {}
                return { token, user };
            } catch {
                // Invalid JWT format
            }
        }

        return null;
    } catch (error) {
        console.error('Error loading session:', error);
        return null;
    }
};

export const clearSession = () => {
    sessionStorage.removeItem('monogram_token');
    sessionStorage.removeItem('monogram_refresh_token');
    sessionStorage.removeItem('monogram_user');
    sessionStorage.removeItem('monogram_settings');
    
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/auth; Secure';
};

export const getRefreshToken = async (): Promise<string | null> => {
    try {
        return sessionStorage.getItem('monogram_refresh_token');
    } catch {
        return null;
    }
};

// Settings (non-sensitive, can stay in localStorage)
export const saveSettings = (settings: any) => {
    localStorage.setItem('monogram_settings', JSON.stringify(settings));
};

export const getSettings = () => {
    try {
        const saved = localStorage.getItem('monogram_settings');
        return saved ? JSON.parse(saved) : { 
            darkMode: true, 
            fontSize: 14, 
            notifications: true, 
            sounds: true, 
            chatBackground: 'default' 
        };
    } catch {
        return { 
            darkMode: true, 
            fontSize: 14, 
            notifications: true, 
            sounds: true, 
            chatBackground: 'default' 
        };
    }
};
