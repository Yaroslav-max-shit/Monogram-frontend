import React from 'react';
import {
  Search, Send, Settings, User, LogOut, Bell, Edit, Trash2, X,
  ChevronLeft, ChevronRight, Check, Camera, Mic, Paperclip,
  Smile, Pin, Copy, Reply, Phone, Video, Volume2, VolumeX,
  Play, Pause, Download, Upload, Folder, Image, FileText, Star,
  Crown, Shield, Lock, Globe, Paintbrush, Moon, Sun, QrCode,
  Share2, Link, Calendar, Clock, StickyNote, Home, Heart,
  Users, Megaphone, MessageCircle, Loader, RefreshCw, Maximize,
  Minimize, ZoomIn, ZoomOut, Gift, Mail, BellRing,
  File, MoreHorizontal, MoreVertical,
  ArrowRightLeft, CheckCircle, AlertCircle, Info,
  Plus, Minus, ChevronUp, ChevronDown, Briefcase,
  UserPlus, UserMinus, UserSearch, Forward, RotateCcw, Compass, Maximize2, Minimize2,
  FolderMinus, FolderDown, FolderSearch, FileSpreadsheet
} from 'lucide-react';

const SmoothSend: React.FC<{ size?: number; className?: string; style?: React.CSSProperties; color?: string }> = ({
  size = 24, className = '', style, color
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} color={color}>
    <path
      d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L13 12l-10.13 1.88A1.01 1.01 0 002 14.88l.01 4.61c0 .71.73 1.2 1.39.91z"
      fill="currentColor"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size = 24, className = '', style
}) => (
  <img
    src="/assets/images/icon.svg"
    alt="Monogram"
    width={size}
    height={size}
    className={className}
    style={{ ...style, display: 'block', objectFit: 'contain' }}
  />
);

const iconMap: Record<string, React.ComponentType<any>> = {
  'search': Search, 'send': SmoothSend, 'settings': Settings, 'profile': User,
  'logout': LogOut, 'bell': Bell, 'edit': Edit, 'delete': Trash2,
  'close': X, 'arrow': ChevronLeft, 'arrow-right': ChevronRight,
  'arrow-up': ChevronUp, 'arrow-down': ChevronDown, 'check': Check,
  'checkmark': CheckCircle, 'camera': Camera, 'mic': Mic,
  'attach': Paperclip, 'emoji': Smile, 'pin': Pin, 'pin-filled': Pin,
  'copy': Copy, 'reply': Reply, 'more': MoreHorizontal,
  'phone': Phone, 'phone-down': Phone, 'video': Video,
  'volume': Volume2, 'volume-off': VolumeX, 'play': Play, 'pause': Pause,
  'download': Download, 'upload': Upload, 'folder': Folder,
  'picture': Image, 'image': Image, 'file': FileText,
  'document': FileText, 'star': Star, 'crown': Crown, 'shield': Shield,
  'lock': Lock, 'globe': Globe, 'paint': Paintbrush, 'moon': Moon,
  'sun': Sun, 'qr': QrCode, 'share': Share2, 'link': Link,
  'calendar': Calendar, 'clock': Clock, 'note': StickyNote,
  'home': Home, 'heart': Heart, 'favorite': Heart, 'users': Users,
  'megaphone': Megaphone, 'message-circle': MessageCircle,
  'loader': Loader, 'spinner': Loader, 'refresh': RefreshCw,
  'fullscreen': Maximize, 'fullscreen-exit': Minimize,
  'zoom-in': ZoomIn, 'zoom-out': ZoomOut, 'gift': Gift,
  'mail': Mail, 'notifications': BellRing,
  'ppt': File, 'rar': FileText, 'txt': FileText, 'zip': FileText,
  'layer': FileText, 'forward': Forward, 'backward': RotateCcw,
  'compress': Minimize2, 'expand': Maximize2, 'new-chat': Plus,
  'plus': Plus, 'minus': Minus, 'x': X,
  'log-out': LogOut, 'group': Users, 'channel': Share2,
  'menu': MoreHorizontal, 'menu-hamburger': MoreHorizontal,
  'more-horizontal': MoreHorizontal, 'more-vertical': MoreVertical,
  'usercheck': UserPlus, 'useradd': UserPlus, 'userdelete': UserMinus,
  'usersearch': UserSearch, 'folderdelete': FolderMinus,
  'folderdownload': FolderDown, 'foldersearch': FolderSearch,
  'folderuser': Users, 'file-pdf': FileText, 'file-doc': FileText,
  'file-xls': FileSpreadsheet,
  'wallet': Briefcase, 'briefcase': Briefcase, 'palette': Paintbrush, 'film': Play,
  'arrow-left': ChevronLeft, 'chevron-right': ChevronRight,
  'info': Info, 'mute': VolumeX, 'quote': Reply,
  'bell-off': BellRing, 'archive': Folder, 'trash-2': Trash2,
  'ban': AlertCircle, 'rotate-cw': RotateCcw, 'alert': AlertCircle,
  'danger': AlertCircle, 'sound': Volume2, 'sound-off': VolumeX,
};

const Icon: React.FC<{ name: string; className?: string; size?: number; style?: React.CSSProperties; color?: string }> = ({ 
  name, className = '', size = 24, style, color 
}) => {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} style={style} color={color} />;
};

export default Icon;
