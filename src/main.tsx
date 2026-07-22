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
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;background:#141210;color:#fff;font-family:sans-serif;text-align:center;padding:20px;';
    const inner = document.createElement('div');
    const heading = document.createElement('h2');
    heading.style.cssText = 'margin-bottom:12px;';
    heading.textContent = 'Произошла ошибка';
    inner.appendChild(heading);
    const msg = document.createElement('p');
    msg.style.cssText = 'color:#888;margin-bottom:16px;';
    msg.textContent = e.message || 'Неизвестная ошибка';
    inner.appendChild(msg);
    const btn = document.createElement('button');
    btn.style.cssText = 'padding:10px 20px;background:#C76E00;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;';
    btn.textContent = 'Перезагрузить';
    btn.addEventListener('click', () => location.reload());
    inner.appendChild(btn);
    container.appendChild(inner);
    root.appendChild(container);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
});

document.addEventListener('contextmenu', (e) => { if (e.target instanceof HTMLElement && e.target.closest('.message')) { e.preventDefault(); } });

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