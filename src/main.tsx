import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import './styles/index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Глобальный перехват ошибок — показываем вместо чёрного экрана
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error);
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#141210;color:#fff;font-family:sans-serif;text-align:center;padding:20px;">
        <div>
          <h2 style="margin-bottom:12px;">Произошла ошибка</h2>
          <p style="color:#888;margin-bottom:16px;">${e.message || 'Неизвестная ошибка'}</p>
          <button onclick="location.reload()" style="padding:10px 20px;background:#C76E00;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Перезагрузить</button>
        </div>
      </div>`;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
});

document.addEventListener('contextmenu', (e) => { if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);