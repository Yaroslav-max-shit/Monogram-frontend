import React, { useState } from 'react';

const METHODS = [
  { cat: 'Получение', items: [
    { name: 'getMe', method: 'GET', desc: 'Получить информацию о боте', params: [], response: '{"ok":true,"result":{"id":123,"is_bot":true,"first_name":"MyBot","username":"mybotBot","can_join_groups":true,"can_read_all_group_messages":true}}' },
    { name: 'getUpdates', method: 'GET', desc: 'Получить обновления (long polling)', params: ['offset (int)', 'limit (int)', 'timeout (int)'], response: '{"ok":true,"result":[{"update_id":1,"message":{"message_id":1,"chat":{"id":100,"type":"private"},"text":"Hello","from":{"id":200,"username":"user1"}}}]}' },
  ]},
  { cat: 'Отправка сообщений', items: [
    { name: 'sendMessage', method: 'POST', desc: 'Отправить текстовое сообщение', params: ['chat_id (int|str)', 'text (str)', 'reply_to_message_id (int, opt)'], response: '{"ok":true,"result":{"message_id":456,"date":1234567890,"text":"Hello!","from":{"id":123},"chat":{"id":100}}}' },
    { name: 'sendPhoto', method: 'POST', desc: 'Отправить фото (file_id, URL или путь на диске)', params: ['chat_id (int|str)', 'photo (str)', 'caption (str, opt)'], response: '{"ok":true,"result":{"message_id":457,"photo":[{"file_id":"abc123"}]}}' },
    { name: 'sendDocument', method: 'POST', desc: 'Отправить документ', params: ['chat_id (int|str)', 'document (str)', 'caption (str, opt)'], response: '{"ok":true,"result":{"message_id":458,"document":{"file_id":"doc123"}}}' },
    { name: 'sendVideo', method: 'POST', desc: 'Отправить видео', params: ['chat_id (int|str)', 'video (str)', 'caption (str, opt)'], response: '{"ok":true,"result":{"message_id":459,"video":{"file_id":"vid123"}}}' },
    { name: 'sendVoice', method: 'POST', desc: 'Отправить голосовое', params: ['chat_id (int|str)', 'voice (str)'], response: '{"ok":true,"result":{"message_id":460}}' },
    { name: 'sendAudio', method: 'POST', desc: 'Отправить аудио', params: ['chat_id (int|str)', 'audio (str)', 'caption (str, opt)'], response: '{"ok":true,"result":{"message_id":461}}' },
    { name: 'sendSticker', method: 'POST', desc: 'Отправить стикер', params: ['chat_id (int|str)', 'sticker (str)'], response: '{"ok":true,"result":{"message_id":462}}' },
    { name: 'sendAnimation', method: 'POST', desc: 'Отправить GIF/анимацию', params: ['chat_id (int|str)', 'animation (str)', 'caption (str, opt)'], response: '{"ok":true,"result":{"message_id":463}}' },
    { name: 'sendVideoNote', method: 'POST', desc: 'Отправить видео-кружок', params: ['chat_id (int|str)', 'video_note (str)'], response: '{"ok":true,"result":{"message_id":464}}' },
    { name: 'sendMediaGroup', method: 'POST', desc: 'Отправить группу медиа (2-10)', params: ['chat_id (int|str)', 'media (array)'], response: '{"ok":true,"result":[{"message_id":465},{"message_id":466}]}' },
  ]},
  { cat: 'Специальные типы', items: [
    { name: 'sendLocation', method: 'POST', desc: 'Отправить геолокацию', params: ['chat_id (int|str)', 'latitude (float)', 'longitude (float)'], response: '{"ok":true,"result":{"message_id":470}}' },
    { name: 'sendVenue', method: 'POST', desc: 'Отправить место', params: ['chat_id (int|str)', 'latitude (float)', 'longitude (float)', 'title (str)', 'address (str)'], response: '{"ok":true,"result":{"message_id":471}}' },
    { name: 'sendContact', method: 'POST', desc: 'Отправить контакт', params: ['chat_id (int|str)', 'phone_number (str)', 'first_name (str)'], response: '{"ok":true,"result":{"message_id":472}}' },
    { name: 'sendPoll', method: 'POST', desc: 'Отправить опрос', params: ['chat_id (int|str)', 'question (str)', 'options (array)'], response: '{"ok":true,"result":{"message_id":473}}' },
    { name: 'sendDice', method: 'POST', desc: 'Отправить кубик', params: ['chat_id (int|str)', 'emoji (str, opt)'], response: '{"ok":true,"result":{"message_id":474}}' },
    { name: 'sendChatAction', method: 'POST', desc: 'Показать индикатор действия', params: ['chat_id (int|str)', 'action (str)'], response: '{"ok":true,"result":true}' },
    { name: 'sendInvoice', method: 'POST', desc: 'Отправить инвойс', params: ['chat_id (int|str)', 'title (str)', 'description (str)', 'amount (int)'], response: '{"ok":true,"result":{"message_id":480,"chat_id":100}}' },
  ]},
  { cat: 'Редактирование', items: [
    { name: 'editMessageText', method: 'POST', desc: 'Редактировать текст', params: ['chat_id (int|str)', 'message_id (int)', 'text (str)'], response: '{"ok":true,"result":{"message_id":456,"text":"Updated"}}' },
    { name: 'editMessageCaption', method: 'POST', desc: 'Редактировать подпись', params: ['chat_id (int|str)', 'message_id (int)', 'caption (str)'], response: '{"ok":true,"result":true}' },
    { name: 'editMessageMedia', method: 'POST', desc: 'Редактировать медиа', params: ['chat_id (int|str)', 'message_id (int)', 'media (object)'], response: '{"ok":true,"result":true}' },
    { name: 'deleteMessage', method: 'POST', desc: 'Удалить сообщение', params: ['chat_id (int|str)', 'message_id (int)'], response: '{"ok":true,"result":true}' },
    { name: 'forwardMessage', method: 'POST', desc: 'Переслать сообщение', params: ['chat_id (int|str)', 'from_chat_id (int|str)', 'message_id (int)'], response: '{"ok":true,"result":{"message_id":480}}' },
    { name: 'copyMessage', method: 'POST', desc: 'Копировать сообщение', params: ['chat_id (int|str)', 'from_chat_id (int|str)', 'message_id (int)'], response: '{"ok":true,"result":{"message_id":481}}' },
  ]},
  { cat: 'Информация о чатах', items: [
    { name: 'getChat', method: 'GET', desc: 'Получить информацию о чате', params: ['chat_id (int|str)'], response: '{"ok":true,"result":{"id":100,"type":"group","title":"My Group","members_count":50}}' },
    { name: 'getChatMember', method: 'GET', desc: 'Получить участника', params: ['chat_id (int|str)', 'user_id (int|str)'], response: '{"ok":true,"result":{"id":200,"username":"user1","status":"member"}}' },
    { name: 'getChatMembers', method: 'GET', desc: 'Получить всех участников', params: ['chat_id (int|str)'], response: '{"ok":true,"result":[{"id":200,"username":"user1","status":"member"},{"id":300,"username":"admin1","status":"admin"}]}' },
    { name: 'getChatMembersCount', method: 'GET', desc: 'Количество участников', params: ['chat_id (int|str)'], response: '{"ok":true,"result":50}' },
    { name: 'getChatAdministrators', method: 'GET', desc: 'Список админов', params: ['chat_id (int|str)'], response: '{"ok":true,"result":[{"id":300,"username":"admin1","status":"admin"}]}' },
  ]},
  { cat: 'Управление чатом', items: [
    { name: 'setChatTitle', method: 'POST', desc: 'Изменить название', params: ['chat_id (int|str)', 'title (str)'], response: '{"ok":true,"result":true}' },
    { name: 'setChatDescription', method: 'POST', desc: 'Изменить описание', params: ['chat_id (int|str)', 'description (str)'], response: '{"ok":true,"result":true}' },
    { name: 'setChatPhoto', method: 'POST', desc: 'Изменить фото чата', params: ['chat_id (int|str)', 'photo (file)'], response: '{"ok":true,"result":true}' },
    { name: 'pinChatMessage', method: 'POST', desc: 'Закрепить сообщение', params: ['chat_id (int|str)', 'message_id (int)'], response: '{"ok":true,"result":true}' },
    { name: 'unpinChatMessage', method: 'POST', desc: 'Открепить', params: ['chat_id (int|str)'], response: '{"ok":true,"result":true}' },
    { name: 'leaveChat', method: 'POST', desc: 'Покинуть чат', params: ['chat_id (int|str)'], response: '{"ok":true,"result":true}' },
  ]},
  { cat: 'Управление участниками', items: [
    { name: 'banChatMember', method: 'POST', desc: 'Забанить', params: ['chat_id (int|str)', 'user_id (int|str)'], response: '{"ok":true,"result":true}' },
    { name: 'kickChatMember', method: 'POST', desc: 'Удалить из чата', params: ['chat_id (int|str)', 'user_id (int|str)'], response: '{"ok":true,"result":true}' },
    { name: 'restrictChatMember', method: 'POST', desc: 'Ограничить', params: ['chat_id (int|str)', 'user_id (int|str)', 'until_date (str, opt)'], response: '{"ok":true,"result":true}' },
    { name: 'promoteChatMember', method: 'POST', desc: 'Назначить админом', params: ['chat_id (int|str)', 'user_id (int|str)'], response: '{"ok":true,"result":true}' },
    { name: 'setChatAdministrator', method: 'POST', desc: 'Назначить администратора (с проверкой permissions)', params: ['chat_id (int|str)', 'user_id (int|str)'], response: '{"ok":true,"result":true}' },
    { name: 'deleteChatAdministrator', method: 'POST', desc: 'Снять администратора', params: ['chat_id (int|str)', 'user_id (int|str)'], response: '{"ok":true,"result":true}' },
  ]},
  { cat: 'Бот', items: [
    { name: 'setMyCommands', method: 'POST', desc: 'Установить команды', params: ['commands (array)'], response: '{"ok":true,"result":true}' },
    { name: 'getMyCommands', method: 'GET', desc: 'Получить команды', params: [], response: '{"ok":true,"result":[{"command":"start","description":"Начать работу с ботом"},{"command":"help","description":"Помощь"}]}' },
    { name: 'setWebhook', method: 'POST', desc: 'Установить webhook', params: ['url (str)'], response: '{"ok":true,"result":true}' },
    { name: 'getWebhookInfo', method: 'GET', desc: 'Информация о webhook', params: [], response: '{"ok":true,"result":{"url":"https://example.com/hook","has_custom_certificate":false}}' },
    { name: 'deleteWebhook', method: 'DELETE', desc: 'Удалить webhook', params: [], response: '{"ok":true,"result":true}' },
  ]},
  { cat: 'Файлы', items: [
    { name: 'getFile', method: 'GET', desc: 'Получить информацию о файле', params: ['file_id (str)'], response: '{"ok":true,"result":{"file_id":"abc123","file_unique_id":"abc123","file_size":1024,"file_path":"uploads/bot_files/abc123"}}' },
  ]},
  { cat: 'Безопасность', items: [
    { name: 'setBotPermissions', method: 'POST', desc: 'Настроить permissions бота (только создатель)', params: ['permissions (object)'], response: '{"ok":true,"result":{"can_manage_admins":true,"can_manage_chat":true}}' },
  ]},
];

const CODE_EXAMPLES: Record<string, {curl: string, python: string, js: string}> = {
  sendMessage: {
    curl: `curl -X POST https://monogram-backend-dxv4.onrender.com/bots/api/sendMessage \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id": 100, "text": "Привет!"}'`,
    python: `import requests

resp = requests.post(
    "https://monogram-backend-dxv4.onrender.com/bots/api/sendMessage",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    json={"chat_id": 100, "text": "Привет!"}
)
print(resp.json())`,
    js: `const res = await fetch("https://monogram-backend-dxv4.onrender.com/bots/api/sendMessage", {
  method: "POST",
  headers: { "X-Api-Key": "YOUR_API_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: 100, text: "Привет!" })
});
console.log(await res.json());`,
  },
  sendPhoto: {
    curl: `curl -X POST https://monogram-backend-dxv4.onrender.com/bots/api/sendPhoto \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id": 100, "photo": "https://example.com/photo.jpg", "caption": "Описание"}'`,
    python: `resp = requests.post(
    "https://monogram-backend-dxv4.onrender.com/bots/api/sendPhoto",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    json={"chat_id": 100, "photo": "https://example.com/photo.jpg", "caption": "Описание"}
)`,
    js: `const res = await fetch(".../sendPhoto", {
  method: "POST",
  headers: { "X-Api-Key": "YOUR_API_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: 100, photo: "https://example.com/photo.jpg" })
});`,
  },
  getChatMembers: {
    curl: `curl -X GET "https://monogram-backend-dxv4.onrender.com/bots/api/getChatMembers?chat_id=100" \\
  -H "X-Api-Key: YOUR_API_KEY"`,
    python: `resp = requests.get(
    "https://monogram-backend-dxv4.onrender.com/bots/api/getChatMembers",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    params={"chat_id": 100}
)`,
    js: `const res = await fetch(".../getChatMembers?chat_id=100", {
  headers: { "X-Api-Key": "YOUR_API_KEY" }
});`,
  },
  setChatAdministrator: {
    curl: `curl -X POST https://monogram-backend-dxv4.onrender.com/bots/api/setChatAdministrator \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id": "100", "user_id": "@username"}'`,
    python: `resp = requests.post(
    ".../setChatAdministrator",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    json={"chat_id": "100", "user_id": "@username"}
)`,
    js: `const res = await fetch(".../setChatAdministrator", {
  method: "POST",
  headers: { "X-Api-Key": "YOUR_API_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: "100", user_id: "@username" })
});`,
  },
};

const BotDocsPage: React.FC = () => {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());
  const [codeLang, setCodeLang] = useState<'curl' | 'python' | 'js'>('curl');

  const toggleResponse = (name: string) => {
    setExpandedResponses(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <nav style={{
        width: 240, flexShrink: 0, padding: '20px 16px',
        borderRight: '1px solid var(--border-color)',
        overflowY: 'auto', position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#000' }}>M</div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Bot API</span>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          <button onClick={() => setLang('ru')} style={{ flex: 1, padding: 6, border: `1px solid ${lang === 'ru' ? 'var(--accent)' : 'var(--border-color)'}`, borderRadius: 6, background: lang === 'ru' ? 'var(--accent-dim)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>RU</button>
          <button onClick={() => setLang('en')} style={{ flex: 1, padding: 6, border: `1px solid ${lang === 'en' ? 'var(--accent)' : 'var(--border-color)'}`, borderRadius: 6, background: lang === 'en' ? 'var(--accent-dim)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>EN</button>
        </div>

        {METHODS.map(cat => (
          <div key={cat.cat} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-tertiary)', marginBottom: 6 }}>{cat.cat}</div>
            {cat.items.map(item => (
              <button
                key={item.name}
                onClick={() => setActiveMethod(item.name)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', border: 'none', borderRadius: 6,
                  background: activeMethod === item.name ? 'var(--accent-dim)' : 'transparent',
                  color: activeMethod === item.name ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: activeMethod === item.name ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '24px 40px', maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Monogram Bot API</h1>
        </div>

        {/* Quick start */}
        <section style={{ marginBottom: 32, padding: 24, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>{lang === 'ru' ? 'Быстрый старт' : 'Quick Start'}</h2>
          <ol style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <li>{lang === 'ru' ? 'Создайте бота через ' : 'Create a bot via '}\n<a href="/settings" style={{ color: 'var(--accent)' }}>BotCreator</a></li>
            <li>{lang === 'ru' ? 'Получите API ключ' : 'Get your API key'}</li>
            <li>{lang === 'ru' ? 'Отправьте первый запрос' : 'Send your first request'}</li>
          </ol>
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem' }}>
            <code style={{ color: 'var(--accent)' }}>Authorization: Bot {'<'}YOUR_API_KEY{'>'}</code>
          </div>
        </section>

        {/* Method details */}
        {activeMethod && METHODS.flatMap(c => c.items).filter(m => m.name === activeMethod).map(method => (
          <section key={method.name} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                background: method.method === 'GET' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                color: method.method === 'GET' ? '#22c55e' : '#3b82f6',
              }}>{method.method}</span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{method.name}</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>{method.desc}</p>

            {/* Parameters */}
            {method.params.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>{lang === 'ru' ? 'Параметры' : 'Parameters'}</h3>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                  {method.params.map((p, i) => {
                    const [name, type] = p.split(' (');
                    return (
                      <div key={i} style={{ padding: '10px 14px', borderBottom: i < method.params.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                        <code style={{ fontWeight: 600, fontSize: '0.85rem' }}>{name}</code>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{type?.replace(')', '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Response */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => toggleResponse(method.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  borderRadius: 8, width: '100%', cursor: 'pointer', color: 'var(--text-primary)',
                  fontSize: '0.9rem', fontWeight: 600,
                }}
              >
                <span>{lang === 'ru' ? 'Ответ (нажмите для раскрытия)' : 'Response (click to expand)'}</span>
                <span style={{ marginLeft: 'auto', transform: expandedResponses.has(method.name) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </button>
              {expandedResponses.has(method.name) && (
                <pre style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16, overflow: 'auto', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  <code>{method.response}</code>
                </pre>
              )}
            </div>

            {/* Code examples */}
            {CODE_EXAMPLES[method.name] && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>{lang === 'ru' ? 'Примеры кода' : 'Code Examples'}</h3>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {(['curl', 'python', 'js'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setCodeLang(l)}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: `1px solid ${codeLang === l ? 'var(--accent)' : 'var(--border-color)'}`,
                        background: codeLang === l ? 'var(--accent-dim)' : 'transparent',
                        color: codeLang === l ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >{l.toUpperCase()}</button>
                  ))}
                </div>
                <pre style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, overflow: 'auto', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <code>{CODE_EXAMPLES[method.name][codeLang]}</code>
                </pre>
              </div>
            )}

            {/* Permissions note */}
            {['setChatAdministrator', 'deleteChatAdministrator'].includes(method.name) && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--danger)' }}>
                ⚠ {lang === 'ru'
                  ? 'Требует permission can_manage_admins. Бот должен быть админом в чате.'
                  : 'Requires can_manage_admins permission. Bot must be admin in the chat.'}
              </div>
            )}
            {['getChatHistory'].includes(method.name) && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--danger)' }}>
                ⚠ {lang === 'ru'
                  ? 'Требует permission can_read_messages. Бот должен быть админом в чате.'
                  : 'Requires can_read_messages permission. Bot must be admin in the chat.'}
              </div>
            )}
            {['sendInvoice'].includes(method.name) && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--warning)' }}>
                ⚠ {lang === 'ru'
                  ? 'Требует permission can_manage_payments. В личных чатах деньги списываются с аккаунта владельца бота.'
                  : 'Requires can_manage_payments permission. In personal chats, funds are deducted from the bot owner\'s account.'}
              </div>
            )}
          </section>
        ))}

        {!activeMethod && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
            <p style={{ fontSize: '1.1rem' }}>{lang === 'ru' ? 'Выберите метод слева для просмотра документации' : 'Select a method from the sidebar to view documentation'}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BotDocsPage;
