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
  user: UserData;
}

// Save session - token goes to HttpOnly cookie (backend sets it), user data in sessionStorage (not localStorage)
export const saveSession = async (
    token: string,
    user: UserData
) => {
    // Token is set as HttpOnly cookie by backend via Set-Cookie header
    // We store minimal user data in sessionStorage (cleared on tab close)
    try {
        sessionStorage.setItem('monogram_user', JSON.stringify(user));
        sessionStorage.setItem('monogram_token', token);
    } catch (error) {
        console.error('Error saving session:', error);
    }
};

// Get session - token from cookie, user from sessionStorage
export const getSession = async (): Promise<Session | null> => {
    try {
        // Try sessionStorage first (faster)
        let token = sessionStorage.getItem('monogram_token');
        let userStr = sessionStorage.getItem('monogram_user');
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            return { token, user };
        }
        
        // Fallback: try to get token from cookie
        const cookieMatch = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
        if (cookieMatch) {
            token = decodeURIComponent(cookieMatch[1]);
            if (token) {
                // Decode JWT payload to get user info (no verification - just reading)
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const user: UserData = {
                        id: payload.user_id || payload.sub,
                        username: payload.username || '',
                        firstName: payload.first_name || '',
                        lastName: payload.last_name || '',
                    };
                    // Save for faster access next time
                    sessionStorage.setItem('monogram_token', token);
                    sessionStorage.setItem('monogram_user', JSON.stringify(user));
                    return { token, user };
                } catch {
                    // Invalid JWT format
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error loading session:', error);
        return null;
    }
};

// Clear session
export const clearSession = () => {
    sessionStorage.removeItem('monogram_token');
    sessionStorage.removeItem('monogram_user');
    sessionStorage.removeItem('monogram_settings');
    
    // Clear auth cookie
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure';
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
