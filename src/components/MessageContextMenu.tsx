import React, { useEffect, useRef } from 'react';
import Icon from './Icon';
import './MessageContextMenu.css';

interface Message {
  id: number;
  content: string;
  sender_id: number;
  timestamp: string;
}

interface MessageContextMenuProps {
  x: number;
  y: number;
  message: Message;
  isOwn: boolean;
  isForwarded?: boolean;
  onClose: () => void;
  onReply: () => void;
  onQuote: (text: string) => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onDeleteForEveryone: () => void;
  onAutoDelete: (seconds: number) => void;
  onCopy: () => void;
  onForward: () => void;
  onWhoForwarded?: () => void;
  onTranslate?: () => void;
  onPin?: () => void;
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  x,
  y,
  message,
  isOwn,
  isForwarded,
  onClose,
  onReply,
  onQuote,
  onEdit,
  onDelete,
  onDeleteForEveryone,
  onAutoDelete,
  onCopy,
  onForward,
  onWhoForwarded,
  onTranslate,
  onPin,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = React.useState('');
  const [showAutoDelete, setShowAutoDelete] = React.useState(false);

  useEffect(() => {
    const selection = window.getSelection();
    const text = selection?.toString();
    if (text && text.trim()) {
      setSelectedText(text);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let finalX = x;
      let finalY = y;

      if (x + rect.width > viewportWidth) {
        finalX = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        finalY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${finalX}px`;
      menuRef.current.style.top = `${finalY}px`;
    }
  }, [x, y]);

  const handleEdit = () => {
    const newText = prompt('Редактировать сообщение:', message.content);
    if (newText && newText !== message.content) {
      onEdit(newText);
    }
    onClose();
  };

  const handleQuoteClick = () => {
    if (selectedText) {
      onQuote(selectedText);
    } else {
      onQuote(message.content);
    }
    onClose();
  };

  return (
    <div className="context-menu" ref={menuRef}>
      <div className="context-menu-item" onClick={onReply}>
        <Icon name="reply" size={18} />
        <span>Ответить</span>
      </div>
      
      <div className="context-menu-item" onClick={handleQuoteClick}>
        <Icon name="quote" size={18} />
        <span>{selectedText ? 'Цитировать выделенное' : 'Цитировать'}</span>
      </div>
      
      <div className="context-menu-item" onClick={onForward}>
        <Icon name="forward" size={18} />
        <span>Переслать</span>
      </div>

      {onPin && (
        <div className="context-menu-item" onClick={() => { onPin(); onClose(); }}>
          <Icon name="pin" size={18} />
          <span>Закрепить</span>
        </div>
      )}
      
      <div className="context-menu-item" onClick={onCopy}>
        <Icon name="copy" size={18} />
        <span>Копировать</span>
      </div>
      
      {isForwarded && onWhoForwarded && (
        <div className="context-menu-item" onClick={onWhoForwarded}>
          <Icon name="forward" size={18} />
          <span>Кто переслал</span>
        </div>
      )}

      {!isOwn && (
        <div className="context-menu-item" onClick={onDelete}>
          <Icon name="delete" size={18} />
          <span>Удалить у себя</span>
        </div>
      )}

      {isOwn && (
        <>
          <div className="context-menu-item" onClick={handleEdit}>
            <Icon name="edit" size={18} />
            <span>Редактировать</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={onDelete}>
            <Icon name="delete" size={18} />
            <span>Удалить у себя</span>
          </div>
          <div className="context-menu-item danger" onClick={onDeleteForEveryone}>
            <Icon name="delete" size={18} />
            <span>Удалить у всех</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => setShowAutoDelete(!showAutoDelete)}>
            <Icon name="clock" size={18} />
            <span style={{ flex: 1 }}>Автоудаление</span>
            <Icon name={showAutoDelete ? "arrow-up" : "arrow-down"} size={16} />
          </div>
          {showAutoDelete && (
            <>
              <div className="context-menu-item" onClick={() => { onAutoDelete(3600); onClose(); }} style={{ paddingLeft: 44 }}>
                <span>Через 1 час</span>
              </div>
              <div className="context-menu-item" onClick={() => { onAutoDelete(86400); onClose(); }} style={{ paddingLeft: 44 }}>
                <span>Через 24 часа</span>
              </div>
              <div className="context-menu-item" onClick={() => { onAutoDelete(604800); onClose(); }} style={{ paddingLeft: 44 }}>
                <span>Через 7 дней</span>
              </div>
              <div className="context-menu-item" onClick={() => { onAutoDelete(2592000); onClose(); }} style={{ paddingLeft: 44 }}>
                <span>Через 30 дней</span>
              </div>
              <div className="context-menu-item" onClick={() => { onAutoDelete(0); onClose(); }} style={{ paddingLeft: 44 }}>
                <span>Выключить</span>
              </div>
            </>
          )}
        </>
      )}

      {onTranslate && (
        <>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => { onTranslate(); onClose(); }}>
            <Icon name="globe" size={18} />
            <span>Перевести</span>
          </div>
        </>
      )}
    </div>
  );
};

export default MessageContextMenu;