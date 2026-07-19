interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName?: string;
  avatar_url?: string;
}

interface Session {
  token: string;
  refreshToken: string;
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
        const token = sessionStorage.getItem('monogram_token');
        const refreshToken = sessionStorage.getItem('monogram_refresh_token');
        const userStr = sessionStorage.getItem('monogram_user');
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            return { token, refreshToken: refreshToken || '', user };
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
};

export const getRefreshToken = async (): Promise<string | null> => {
    try {
        return sessionStorage.getItem('monogram_refresh_token');
    } catch {
        return null;
    }
};

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
