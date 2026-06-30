import React from 'react';

const BotDocsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif', color: '#e0e0e0', background: '#0d1117', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img src="/assets/images/icon.svg" alt="Monogram" style={{ width: 48, height: 48 }} />
        <h1 style={{ fontSize: '2rem', margin: '12px 0 8px', color: '#fff' }}>Monogram Bot API</h1>
        <p style={{ color: '#8b949e', fontSize: '1.1rem' }}>Полная документация по созданию и управлению ботами</p>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>Быстрый старт</h2>
        <p>1. Откройте <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: 4 }}>@BotCreator</code> в Monogram</p>
        <p>2. Отправьте <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: 4 }}>/newbot</code></p>
        <p>3. Следуйте инструкциям — введите имя и username</p>
        <p>4. Получите API ключ для управления ботом</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>Аутентификация</h2>
        <p>Все запросы к API требуют заголовок:</p>
        <pre style={{ background: '#161b22', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 14 }}>
          <code>Authorization: Bot {'<'}YOUR_API_KEY{'>'}</code>
        </pre>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>Методы</h2>
        
        {[
          { method: 'POST', path: '/bot{TOKEN}/sendMessage', desc: 'Отправить сообщение', params: 'chat_id, content, reply_to_message_id?' },
          { method: 'POST', path: '/bot{TOKEN}/sendPhoto', desc: 'Отправить фото', params: 'chat_id, photo (file), caption?' },
          { method: 'POST', path: '/bot{TOKEN}/sendDocument', desc: 'Отправить файл', params: 'chat_id, document (file)' },
          { method: 'POST', path: '/bot{TOKEN}/sendVoice', desc: 'Отправить голосовое', params: 'chat_id, voice (file)' },
          { method: 'POST', path: '/bot{TOKEN}/forwardMessage', desc: 'Переслать сообщение', params: 'chat_id, message_id, from_chat_id' },
          { method: 'POST', path: '/bot{TOKEN}/editMessage', desc: 'Редактировать сообщение', params: 'message_id, content' },
          { method: 'POST', path: '/bot{TOKEN}/deleteMessage', desc: 'Удалить сообщение', params: 'message_id' },
          { method: 'POST', path: '/bot{TOKEN}/pinMessage', desc: 'Закрепить сообщение', params: 'chat_id, message_id' },
          { method: 'POST', path: '/bot{TOKEN}/unpinMessage', desc: 'Открепить', params: 'chat_id, message_id' },
          { method: 'POST', path: '/bot{TOKEN}/banMember', desc: 'Забанить', params: 'chat_id, user_id' },
          { method: 'POST', path: '/bot{TOKEN}/kickMember', desc: 'Удалить из чата', params: 'chat_id, user_id' },
          { method: 'POST', path: '/bot{TOKEN}/muteMember', desc: 'Заглушить', params: 'chat_id, user_id, duration?' },
          { method: 'POST', path: '/bot{TOKEN}/promoteMember', desc: 'Сделать админом', params: 'chat_id, user_id' },
          { method: 'GET', path: '/bot{TOKEN}/getMe', desc: 'Информация о боте', params: '' },
          { method: 'GET', path: '/bot{TOKEN}/getUpdates', desc: 'Получить обновления', params: 'offset?, limit?' },
          { method: 'POST', path: '/bot{TOKEN}/setWebhook', desc: 'Установить webhook', params: 'url' },
          { method: 'POST', path: '/bot{TOKEN}/setCommands', desc: 'Установить команды', params: 'commands (JSON)' },
          { method: 'POST', path: '/bot{TOKEN}/setMyAvatar', desc: 'Установить аватар', params: 'avatar (file)' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#161b22', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #21262d' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ background: m.method === 'GET' ? '#1a7f37' : '#0969da', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{m.method}</span>
              <code style={{ color: '#e6edf3', fontSize: 14 }}>{m.path}</code>
            </div>
            <p style={{ margin: 0, color: '#8b949e', fontSize: 14 }}>{m.desc}</p>
            {m.params && <p style={{ margin: '6px 0 0', color: '#58a6ff', fontSize: 13 }}>Параметры: {m.params}</p>}
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>Примеры</h2>
        
        <h3 style={{ color: '#c9d1d9', marginTop: 16 }}>Отправка сообщения</h3>
        <pre style={{ background: '#161b22', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 14 }}>
          <code>{`curl -X POST https://monogram-backend-dxv4.onrender.com/bot{TOKEN}/sendMessage \\
  -H "Authorization: Bot {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id": 123, "content": "Привет от бота!"}'`}</code>
        </pre>

        <h3 style={{ color: '#c9d1d9', marginTop: 16 }}>Отправка фото</h3>
        <pre style={{ background: '#161b22', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 14 }}>
          <code>{`curl -X POST https://monogram-backend-dxv4.onrender.com/bot{TOKEN}/sendPhoto \\
  -H "Authorization: Bot {API_KEY}" \\
  -F "chat_id=123" \\
  -F "photo=@image.jpg" \\
  -F "caption=Красивая картинка"`}</code>
        </pre>

        <h3 style={{ color: '#c9d1d9', marginTop: 16 }}>Получение обновлений (Webhook)</h3>
        <pre style={{ background: '#161b22', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 14 }}>
          <code>{`curl -X POST https://monogram-backend-dxv4.onrender.com/bot{TOKEN}/setWebhook \\
  -H "Authorization: Bot {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-server.com/webhook"}'`}</code>
        </pre>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>Команды Bot-Creator</h2>
        <p>Внутри <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: 4 }}>@BotCreator</code> доступны команды:</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {[
            ['/newbot', 'Создать нового бота'],
            ['/mybots', 'Список моих ботов'],
            ['/setname', 'Изменить имя бота'],
            ['/setdescription', 'Изменить описание'],
            ['/setavatar', 'Загрузить аватар'],
            ['/setcommands', 'Настроить команды'],
            ['/regeneratekey', 'Новый API ключ'],
            ['/documentation', 'Открыть эту документацию'],
          ].map(([cmd, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#161b22', padding: '8px 12px', borderRadius: 6 }}>
              <code style={{ color: '#7ee787', minWidth: 140 }}>{cmd}</code>
              <span style={{ color: '#8b949e' }}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>Статус-коды</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['200', 'Успешно'],
            ['400', 'Неверный запрос'],
            ['401', 'Неавторизован (неверный API ключ)'],
            ['403', 'Доступ запрещён'],
            ['404', 'Не найдено'],
            ['429', 'Слишком много запросов (rate limit)'],
            ['500', 'Внутренняя ошибка сервера'],
          ].map(([code, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <code style={{ color: code.startsWith('2') ? '#7ee787' : code.startsWith('4') ? '#d29922' : '#f85149', minWidth: 40 }}>{code}</code>
              <span style={{ color: '#8b949e' }}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px 0', color: '#484f58', borderTop: '1px solid #21262d', marginTop: 40 }}>
        <p>Monogram Bot API v2.0.0</p>
        <p>© 2024 Monogram. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default BotDocsPage;
