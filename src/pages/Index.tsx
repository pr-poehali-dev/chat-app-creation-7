import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';

type IconName = Parameters<typeof Icon>[0]['name'];

const AVATAR_1 = 'https://cdn.poehali.dev/projects/4b648cf8-5671-41a1-a5c8-945763532e2b/files/b155fdd5-fbcd-4d06-bf3b-300966b3ca5d.jpg';
const AVATAR_2 = 'https://cdn.poehali.dev/projects/4b648cf8-5671-41a1-a5c8-945763532e2b/files/76cc66c0-a63d-4e1c-9ffd-a430ea02c87e.jpg';
const AVATAR_3 = 'https://cdn.poehali.dev/projects/4b648cf8-5671-41a1-a5c8-945763532e2b/files/95a1a656-f142-4efc-b0f4-9996e239a735.jpg';

const contacts = [
  { id: 1, name: 'Алиса Морозова', avatar: AVATAR_1, status: 'online', lastMsg: 'Отправила файл проекта 📎', time: '12:34', unread: 3, typing: false },
  { id: 2, name: 'Команда Nexus', avatar: AVATAR_2, status: 'online', lastMsg: 'Дима: готово к релизу!', time: '11:20', unread: 12, typing: true, isGroup: true },
  { id: 3, name: 'Виктор Соколов', avatar: AVATAR_3, status: 'away', lastMsg: 'Увидимся завтра на встрече', time: 'вчера', unread: 0, typing: false },
  { id: 4, name: 'Маша Ким', avatar: AVATAR_1, status: 'offline', lastMsg: 'Спасибо за помощь! 🙌', time: 'пн', unread: 0, typing: false },
  { id: 5, name: 'Канал новостей', avatar: AVATAR_2, status: 'online', lastMsg: 'Обновление платформы v2.5', time: 'пн', unread: 5, typing: false, isChannel: true },
  { id: 6, name: 'Артём Волков', avatar: AVATAR_3, status: 'online', lastMsg: 'Отлично, договорились!', time: 'вс', unread: 0, typing: false },
];

const stories = [
  { id: 1, name: 'Алиса', avatar: AVATAR_1, seen: false },
  { id: 2, name: 'Nexus', avatar: AVATAR_2, seen: false },
  { id: 3, name: 'Виктор', avatar: AVATAR_3, seen: true },
  { id: 4, name: 'Маша', avatar: AVATAR_1, seen: true },
];

const initialMessages: Record<number, { id: number; text: string; time: string; sent: boolean; type?: string; encrypted?: boolean }[]> = {
  1: [
    { id: 1, text: 'Привет! Можешь посмотреть мой дизайн?', time: '12:10', sent: false, encrypted: true },
    { id: 2, text: 'Конечно, скидывай!', time: '12:12', sent: true, encrypted: true },
    { id: 3, text: 'Вот файл с макетами', time: '12:30', sent: false, type: 'file', encrypted: true },
    { id: 4, text: 'Отправила файл проекта 📎', time: '12:34', sent: false, encrypted: true },
  ],
  2: [
    { id: 1, text: 'Всем привет! Когда релиз?', time: '10:00', sent: false, encrypted: true },
    { id: 2, text: 'Планируем на пятницу', time: '10:15', sent: true, encrypted: true },
    { id: 3, text: 'Дима: готово к релизу!', time: '11:20', sent: false, encrypted: true },
  ],
  3: [
    { id: 1, text: 'Привет, как дела?', time: '16:00', sent: true, encrypted: true },
    { id: 2, text: 'Всё хорошо! Увидимся завтра на встрече', time: '16:45', sent: false, encrypted: true },
  ],
};

const tabs = ['Чаты', 'Каналы', 'Группы'] as const;
type Tab = typeof tabs[number];

const navItems = [
  { id: 'chats', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'search', icon: 'Search', label: 'Поиск' },
  { id: 'contacts', icon: 'Users', label: 'Контакты' },
  { id: 'notifications', icon: 'Bell', label: 'Звонки' },
  { id: 'profile', icon: 'User', label: 'Профиль' },
  { id: 'settings', icon: 'Settings', label: 'Настройки' },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="text-xs text-muted-foreground mr-1">печатает</span>
      {[1, 2, 3].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
      ))}
    </div>
  );
}

function WaveformBars() {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="waveform-bar w-0.5 rounded-full bg-current" style={{ height: '4px' }} />
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-green-400',
    away: 'bg-yellow-400',
    offline: 'bg-gray-500',
  };
  return (
    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--bg-deep)] ${colors[status] || 'bg-gray-500'} ${status === 'online' ? 'animate-pulse-status' : ''}`} />
  );
}

export default function Index() {
  const [activeNav, setActiveNav] = useState('chats');
  const [activeTab, setActiveTab] = useState<Tab>('Чаты');
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [showCall, setShowCall] = useState<'voice' | 'video' | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStory, setShowStory] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChat]);

  useEffect(() => {
    if (showCall) {
      setCallTimer(0);
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [showCall]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const sendMessage = () => {
    if (!input.trim() || !selectedChat) return;
    const newMsg = {
      id: Date.now(),
      text: input.trim(),
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      sent: true,
      encrypted: true,
    };
    setMessages(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), newMsg] }));
    setInput('');
  };

  const currentContact = contacts.find(c => c.id === selectedChat);
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMsg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden mesh-bg font-golos">

      {/* Sidebar Navigation */}
      <aside className="flex flex-col items-center gap-2 py-6 px-2 w-16 border-r border-[rgba(157,111,255,0.15)]" style={{ background: 'var(--bg-card)' }}>
        <div className="mb-4 animate-float">
          <div className="w-10 h-10 rounded-2xl glow-violet flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #9d6fff, #22d3ee)' }}>
            <span className="text-white font-bold text-lg font-caveat">N</span>
          </div>
        </div>
        {navItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group
              ${activeNav === item.id ? 'nav-active glow-violet' : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'}`}
            style={{ animationDelay: `${idx * 0.05}s` }}
            title={item.label}
          >
            <Icon name={item.icon as IconName} size={20} className="nav-icon" />
            {item.id === 'notifications' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
            <div className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50" style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,111,255,0.2)' }}>
              {item.label}
            </div>
          </button>
        ))}
      </aside>

      {/* Chat List Panel */}
      <div className="w-72 flex flex-col border-r border-[rgba(157,111,255,0.1)]" style={{ background: 'var(--bg-panel)' }}>

        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-glow-violet" style={{ color: 'var(--neon-violet)' }}>
              {activeNav === 'chats' && 'Сообщения'}
              {activeNav === 'search' && 'Поиск'}
              {activeNav === 'contacts' && 'Контакты'}
              {activeNav === 'notifications' && 'Звонки'}
              {activeNav === 'profile' && 'Профиль'}
              {activeNav === 'settings' && 'Настройки'}
            </h1>
            <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Plus" size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,111,255,0.15)', color: 'var(--foreground)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(157,111,255,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(157,111,255,0.15)')}
            />
          </div>
        </div>

        {/* Stories */}
        {activeNav === 'chats' && (
          <div className="px-4 py-2">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <button className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-dashed border-[rgba(157,111,255,0.4)] hover:border-[var(--neon-violet)] transition-colors">
                  <Icon name="Plus" size={16} className="text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">Моя</span>
              </button>
              {stories.map(s => (
                <button key={s.id} className="flex flex-col items-center gap-1 flex-shrink-0" onClick={() => setShowStory(s.id)}>
                  <div className={s.seen ? 'p-0.5 rounded-2xl border-2 border-[rgba(255,255,255,0.15)]' : 'story-ring'}>
                    <div className={s.seen ? '' : 'story-ring-inner'}>
                      <img src={s.avatar} alt={s.name} className="w-11 h-11 rounded-[14px] object-cover" />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate w-12 text-center">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        {activeNav === 'chats' && (
          <div className="flex gap-1 px-4 pb-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={activeTab === tab ? { background: 'linear-gradient(135deg, rgba(157,111,255,0.3), rgba(34,211,238,0.2))', border: '1px solid rgba(157,111,255,0.3)' } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto px-2">
          {(activeNav === 'chats' || activeNav === 'search' || activeNav === 'contacts') && filteredContacts.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => { setSelectedChat(c.id); setActiveNav('chats'); }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-1 transition-all duration-200 text-left animate-fade-in
                ${selectedChat === c.id ? 'gradient-card glow-violet' : 'hover:bg-white/4'}`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <div className="relative flex-shrink-0">
                <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-2xl object-cover" />
                <StatusDot status={c.status} />
                {c.isGroup && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white" style={{ background: 'var(--neon-violet)' }}>G</span>
                )}
                {c.isChannel && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ background: 'var(--neon-cyan)', color: '#000' }}>C</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{c.time}</span>
                </div>
                {c.typing ? (
                  <TypingIndicator />
                ) : (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMsg}</p>
                )}
              </div>
              {c.unread > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'var(--neon-violet)' }}>
                  {c.unread > 9 ? '9+' : c.unread}
                </span>
              )}
            </button>
          ))}

          {activeNav === 'notifications' && (
            <div className="p-4 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-3">Недавние звонки</p>
              {[
                { name: 'Алиса Морозова', type: 'Входящий', icon: 'PhoneIncoming', time: '12:34', duration: '5:20', color: 'text-green-400', avatar: AVATAR_1 },
                { name: 'Виктор Соколов', type: 'Пропущенный', icon: 'PhoneMissed', time: 'вчера', duration: '', color: 'text-red-400', avatar: AVATAR_3 },
                { name: 'Команда Nexus', type: 'Видеозвонок', icon: 'Video', time: 'пн', duration: '23:10', color: 'text-cyan-400', avatar: AVATAR_2 },
              ].map((call, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl mb-2 gradient-card">
                  <img src={call.avatar} alt={call.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{call.name}</p>
                    <div className="flex items-center gap-1">
                      <Icon name={call.icon as IconName} size={12} className={call.color} />
                      <span className="text-xs text-muted-foreground">{call.type} {call.duration && `· ${call.duration}`}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{call.time}</span>
                </div>
              ))}
            </div>
          )}

          {activeNav === 'profile' && (
            <div className="p-4 animate-fade-in">
              <div className="flex flex-col items-center mb-4">
                <div className="story-ring mb-2">
                  <div className="story-ring-inner">
                    <img src={AVATAR_2} alt="me" className="w-16 h-16 rounded-[20px] object-cover" />
                  </div>
                </div>
                <p className="font-bold text-base">Александр Новиков</p>
                <p className="text-xs text-muted-foreground">@alex_nexus</p>
              </div>
              <div className="encrypt-badge rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                <Icon name="Shield" size={14} />
                <span className="text-xs font-medium">E2E шифрование активно</span>
              </div>
              {[
                { label: 'Номер телефона', value: '+7 (999) 123-45-67', icon: 'Phone' },
                { label: 'Email', value: 'alex@nexus.app', icon: 'Mail' },
                { label: 'О себе', value: 'Product Designer 🎨', icon: 'Info' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Icon name={item.icon as IconName} size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeNav === 'settings' && (
            <div className="p-4 animate-fade-in">
              {[
                { label: 'Уведомления', icon: 'Bell', toggle: true },
                { label: 'Конфиденциальность', icon: 'Lock', toggle: false },
                { label: 'Тема оформления', icon: 'Palette', toggle: false },
                { label: 'Язык', icon: 'Globe', toggle: false },
                { label: 'Двухфакторная аутентификация', icon: 'Shield', toggle: true },
                { label: 'Резервное копирование', icon: 'CloudUpload', toggle: false },
                { label: 'О приложении', icon: 'Info', toggle: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl mb-2 cursor-pointer hover:bg-white/5 transition-colors gradient-card">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(157,111,255,0.15)' }}>
                      <Icon name={item.icon as IconName} size={14} className="text-primary" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.toggle ? (
                    <div className="w-10 h-5 rounded-full relative" style={{ background: 'var(--neon-violet)' }}>
                      <div className="absolute right-1 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
                  ) : (
                    <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedChat && currentContact ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[rgba(157,111,255,0.1)]" style={{ background: 'rgba(14,14,26,0.8)', backdropFilter: 'blur(20px)' }}>
              <div className="relative">
                <img src={currentContact.avatar} alt={currentContact.name} className="w-10 h-10 rounded-xl object-cover" />
                <StatusDot status={currentContact.status} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base">{currentContact.name}</h2>
                  <span className="encrypt-badge text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <Icon name="Lock" size={9} />
                    E2E
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentContact.status === 'online' ? (
                    <span className="text-green-400">в сети</span>
                  ) : currentContact.status === 'away' ? (
                    'недавно был'
                  ) : (
                    'не в сети'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCall('voice')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(157,111,255,0.15)', color: 'var(--neon-violet)' }}
                  title="Голосовой звонок"
                >
                  <Icon name="Phone" size={16} />
                </button>
                <button
                  onClick={() => setShowCall('video')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--neon-cyan)' }}
                  title="Видеозвонок"
                >
                  <Icon name="Video" size={16} />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                  <Icon name="MoreVertical" size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
              {(messages[selectedChat] || []).map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  {!msg.sent && (
                    <img src={currentContact.avatar} alt="" className="w-7 h-7 rounded-lg object-cover mr-2 mt-auto flex-shrink-0" />
                  )}
                  <div className={`max-w-xs ${msg.sent ? 'msg-sent' : 'msg-recv'} rounded-2xl px-4 py-2.5`}>
                    {msg.type === 'file' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <Icon name="Paperclip" size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-medium">design_v3.fig</p>
                          <p className="text-[10px] opacity-60">2.4 МБ</p>
                        </div>
                        <Icon name="Download" size={14} className="ml-1 opacity-70" />
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {msg.encrypted && <Icon name="Lock" size={9} className="opacity-40" />}
                      <span className="text-[10px] opacity-50">{msg.time}</span>
                      {msg.sent && <Icon name="CheckCheck" size={11} className="opacity-60" />}
                    </div>
                  </div>
                </div>
              ))}
              {currentContact.typing && (
                <div className="flex items-end gap-2">
                  <img src={currentContact.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  <div className="msg-recv rounded-2xl px-4 py-3">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-[rgba(157,111,255,0.1)]" style={{ background: 'rgba(14,14,26,0.8)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-end gap-3">
                <div className="flex gap-2">
                  <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all" title="Прикрепить файл">
                    <Icon name="Paperclip" size={18} />
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all" title="Голосовое сообщение">
                    <Icon name="Mic" size={18} />
                  </button>
                </div>
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Написать сообщение..."
                    rows={1}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(157,111,255,0.2)',
                      color: 'var(--foreground)',
                      maxHeight: '120px',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(157,111,255,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(157,111,255,0.2)')}
                  />
                  <button className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="Smile" size={18} />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 glow-violet"
                  style={{ background: 'linear-gradient(135deg, #9d6fff, #7c3aed)', color: 'white' }}
                >
                  <Icon name="Send" size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-2 justify-center">
                <Icon name="Lock" size={10} className="text-green-400 opacity-60" />
                <span className="text-[10px] text-muted-foreground opacity-60">Сообщения защищены сквозным шифрованием</span>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl glow-violet animate-float flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(157,111,255,0.2), rgba(34,211,238,0.1))', border: '1px solid rgba(157,111,255,0.3)' }}>
                <Icon name="MessageCircle" size={40} className="text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center animate-pulse-ring" style={{ background: 'var(--neon-violet)' }}>
                <Icon name="Lock" size={12} className="text-white" />
              </div>
            </div>
            <div className="text-center max-w-xs">
              <h2 className="text-3xl font-bold mb-2 font-caveat text-glow-violet" style={{ color: 'var(--neon-violet)' }}>Nexus Messenger</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Выбери чат слева, чтобы начать общение. Все сообщения защищены сквозным шифрованием.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {['🔐 E2E шифрование', '📞 Голос и видео', '📁 Файлообмен', '📡 Истории', '👥 Группы'].map(f => (
                <div key={f} className="px-3 py-1.5 rounded-full text-xs text-muted-foreground" style={{ border: '1px solid rgba(157,111,255,0.2)', background: 'rgba(157,111,255,0.05)' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Call Overlay */}
      {showCall && currentContact && (
        <div className="absolute inset-0 z-50 flex items-center justify-center animate-scale-in" style={{ background: 'rgba(7,7,15,0.92)', backdropFilter: 'blur(20px)' }}>
          <div className="flex flex-col items-center gap-6 p-10 rounded-3xl text-center glow-violet" style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,111,255,0.3)', minWidth: '320px' }}>
            {showCall === 'video' ? (
              <div className="w-32 h-32 rounded-3xl overflow-hidden glow-violet">
                <img src={currentContact.avatar} alt={currentContact.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="story-ring">
                <div className="story-ring-inner">
                  <img src={currentContact.avatar} alt={currentContact.name} className="w-28 h-28 rounded-[22px] object-cover" />
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold">{currentContact.name}</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--neon-cyan)' }}>
                {showCall === 'voice' ? '🔐 Защищённый звонок' : '🎥 Видеозвонок'}
              </p>
              <p className="text-2xl font-caveat mt-2" style={{ color: 'var(--neon-violet)' }}>{formatTime(callTimer)}</p>
            </div>
            {showCall === 'voice' && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <WaveformBars />
              </div>
            )}
            <div className="flex gap-4 mt-2">
              {[
                { icon: 'MicOff', label: 'Микрофон', bg: 'rgba(255,255,255,0.08)' },
                { icon: showCall === 'video' ? 'VideoOff' : 'Speaker', label: 'Динамик', bg: 'rgba(255,255,255,0.08)' },
                { icon: 'PhoneOff', label: 'Завершить', bg: '#ef4444', action: () => setShowCall(null) },
              ].map((btn) => (
                <button
                  key={btn.icon}
                  onClick={btn.action}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: btn.bg }}>
                    <Icon name={btn.icon as IconName} size={22} className="text-white" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story Overlay */}
      {showStory !== null && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center animate-scale-in"
          style={{ background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(30px)' }}
          onClick={() => setShowStory(null)}
        >
          <div className="relative w-80 rounded-3xl overflow-hidden glow-violet" style={{ border: '1px solid rgba(157,111,255,0.3)', aspectRatio: '9/16', maxHeight: '80vh' }}>
            <img src={stories.find(s => s.id === showStory)?.avatar} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)' }} />
            <div className="absolute top-4 left-4 right-4">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex-1 h-0.5 rounded-full" style={{ background: i === 1 ? 'var(--neon-violet)' : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <img src={stories.find(s => s.id === showStory)?.avatar} alt="" className="w-8 h-8 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-bold text-white">{stories.find(s => s.id === showStory)?.name}</p>
                  <p className="text-[10px] text-white/60">2 часа назад</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 left-4 right-4 text-center">
              <p className="font-caveat text-2xl text-white text-glow-violet">Новый проект запущен! 🚀</p>
              <p className="text-xs text-white/60 mt-1">Нажми, чтобы закрыть</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}