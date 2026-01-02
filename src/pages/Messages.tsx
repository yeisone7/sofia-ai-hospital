import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils'; // Importar getInitials

// Interfaces para la estructura de datos esperada
interface Conversation {
  id: string;
  participantName: string;
  participantAvatarUrl?: string;
  lastMessageContent: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  senderId: string; // ID del usuario o del participante de la conversación
  content: string;
  timestamp: string;
  isMine: boolean; // true si el mensaje es del usuario actual
}

const Messages = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');

  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchConversations();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    // Scroll to bottom of messages when new messages arrive or conversation changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setConversationsLoading(true);
    setChatError(null);
    try {
      // Placeholder data
      const dummyConversations: Conversation[] = [
        { id: 'conv1', participantName: 'María González', participantAvatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOS6Dsw080tA4PGE4aC6QMCLRjikPujnDSLOqtqvKS6iMKEtOZgqRhXQQan2K6yebAyAMPBffTX3xKS7No6Hwfk5e3CYf7_kK1j6CNe1c4o1XyMUmpRliJVxTCoW6_q13r3T6xKStIvZRpaYwlshBVMbMzxSUECSvs2Qj1RCh8-DmztdiUsU9x07YKnqD_yfg8VmIV-kzTuIjRx5nxwzcoMCM8x7LbOVU-7cQ4oIt49j09_LBO-aLyB_o3lZ8XnX8vwnBK2eUj58Y', lastMessageContent: 'Hola, quisiera confirmar mi cita...', lastMessageTimestamp: '10:42 AM', unreadCount: 1 },
        { id: 'conv2', participantName: 'Carlos Rodriguez', participantAvatarUrl: '', lastMessageContent: '¿Tienen disponibilidad para hoy?', lastMessageTimestamp: '09:15 AM', unreadCount: 0 },
        { id: 'conv3', participantName: 'Javier Méndez', participantAvatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYLpEj0Yew8nNxSSAmPR4hWNZw8EETw_yykqKxEdXZy09BjlJcwMMp-WF64pcNAdjZCH1JhHou1xV7ndKd2TGy3uTjS2sLHOTdh6g0IwYz1C0f-pgl0D2B5uDY5QFIxRl5A1dnZcCn7kp9F2tbDY0pisCE0pAoItLGDqZo4_YuJWDewfYXkb3n3dA0OgPPyRK1Os5EvHS6Mets-vxQ3CLgY4IfFEJxJ6BubOtEDAH5q1_eR0NiZol1gA5eCcBkYwRsPMgSxoqRTNA', lastMessageContent: 'Gracias, nos vemos entonces.', lastMessageTimestamp: 'Ayer', unreadCount: 0 },
        { id: 'conv4', participantName: 'Luisa Perez', participantAvatarUrl: '', lastMessageContent: 'Necesito cancelar mi cita...', lastMessageTimestamp: 'Ayer', unreadCount: 0 },
        { id: 'conv5', participantName: 'Dr. Ana Martínez', participantAvatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwHtixTzdpJCvMAVOQqZUxaPsAbVL-KpQR-e7iTOF_8aOi0vWBIPFagRfWtWc06qZf-I1EE4rpqG3OzV5svDIpihjDe0IYkkwjwdna1nKFVIegRlVrxZ87H7kfrkgn3rU2z8iGDb8yJ2fZ8vAAqaIiCJRnK9wUxYtXKIZY8Lxc-qYHApE2E5hOnN9ufqqsr_JETme0Xq-CarLnTdg80p_oaVpwxvlF5Cb3wLh1Gq8EiECrMwTYDG7qWgC2Q5SwmSbqNZsxgKCnea8', lastMessageContent: 'Recordatorio de la reunión de equipo.', lastMessageTimestamp: 'Hace 2 días', unreadCount: 0 },
      ];
      setConversations(dummyConversations);
      if (dummyConversations.length > 0) {
        setSelectedConversationId(dummyConversations[0].id);
      }

    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      setChatError('No se pudieron cargar las conversaciones.');
      showError('Error al cargar conversaciones: ' + error.message);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    setChatError(null);
    try {
      // Placeholder data
      const dummyMessages: ChatMessage[] = [
        { id: 'msgA1', senderId: 'conv1', content: 'Hola, ¿cómo estás? Quería confirmar mi cita para el próximo martes a las 10 AM.', timestamp: '10:40 AM', isMine: false },
        { id: 'msgA2', senderId: user?.id || 'user', content: 'Hola María, todo bien. Sí, tu cita está confirmada para el martes a las 10 AM. ¿Necesitas algo más?', timestamp: '10:42 AM', isMine: true },
        { id: 'msgA3', senderId: 'conv1', content: 'Perfecto, muchas gracias. ¡Nos vemos el martes!', timestamp: '10:45 AM', isMine: false },
        { id: 'msgA4', senderId: user?.id || 'user', content: 'De nada, que tengas un excelente día.', timestamp: '10:46 AM', isMine: true },
      ];
      setMessages(dummyMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setChatError('No se pudieron cargar los mensajes.');
      showError('Error al cargar mensajes: ' + error.message);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !selectedConversationId) return;

    const messageToSend: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: user?.id || 'user',
      content: newMessageContent.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    };

    setMessages((prevMessages) => [...prevMessages, messageToSend]);
    setNewMessageContent('');

    try {
      showSuccess('Mensaje enviado.');
    } catch (error: any) {
      console.error('Error sending message:', error);
      showError('Error al enviar mensaje: ' + error.message);
      setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== messageToSend.id));
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando sesión...</p>
      </div>
    );
  }

  if (chatError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
          <p className="text-text-main dark:text-white">{chatError}</p>
          <button
            onClick={fetchConversations}
            className="mt-4 bg-primary hover:bg-primary-dark text-text-main font-bold py-2 px-4 rounded-xl"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const userRole = user?.user_metadata?.role || 'Admin';
  const userAvatar = user?.user_metadata?.avatar_url || null; // Ahora puede ser null

  const renderConversationsLoadingState = () => (
    <div className="flex flex-col gap-3 p-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-700">
          <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderConversationsEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center text-text-secondary">
      <div className="bg-primary/10 text-primary-dark p-4 rounded-full mb-4">
        <span className="material-symbols-outlined text-4xl">chat_bubble_off</span>
      </div>
      <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">No hay conversaciones</h3>
      <p className="text-sm">Parece que no tienes conversaciones activas.</p>
    </div>
  );

  const renderMessagesLoadingState = () => (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[70%] p-3 rounded-lg ${i % 2 === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary/20 dark:bg-primary/30'}`}>
            <div className="h-4 w-full bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMessagesEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-secondary">
      <div className="bg-primary/10 text-primary-dark p-4 rounded-full mb-4">
        <span className="material-symbols-outlined text-4xl">sms_failed</span>
      </div>
      <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">Sin mensajes</h3>
      <p className="text-sm">Envía el primer mensaje para iniciar la conversación.</p>
    </div>
  );

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main h-screen overflow-hidden flex">
      {/* Side Navigation Bar */}
      <aside className="w-72 bg-surface-light dark:bg-surface-dark border-r border-[#e7f3f2] dark:border-[#2a3c3b] flex flex-col hidden md:flex flex-shrink-0 transition-all z-20">
        {/* Logo Area */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              <span className="material-symbols-outlined text-primary-dark font-bold">medical_services</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-text-main dark:text-white text-lg font-bold leading-tight">Laura AI</h1>
              <p className="text-text-secondary text-xs font-medium">Asistente Virtual</p>
            </div>
          </div>
        </div>
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/dashboard' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/dashboard">
            <span className={`material-symbols-outlined ${location.pathname === '/dashboard' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>dashboard</span>
            <p className={`text-sm font-semibold ${location.pathname === '/dashboard' ? 'text-text-main dark:text-white' : ''}`}>Dashboard</p>
          </Link>
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/messages' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/messages">
            <span className={`material-symbols-outlined ${location.pathname === '/messages' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>chat</span>
            <p className={`text-sm font-medium ${location.pathname === '/messages' ? 'text-text-main dark:text-white' : ''}`}>Mensajes</p>
          </Link>
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/patients' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/patients">
            <span className={`material-symbols-outlined ${location.pathname === '/patients' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>groups</span>
            <p className={`text-sm font-medium ${location.pathname === '/patients' ? 'text-text-main dark:text-white' : ''}`}>Pacientes</p>
          </Link>
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/appointments' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/appointments">
            <span className={`material-symbols-outlined ${location.pathname === '/appointments' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>calendar_month</span>
            <p className={`text-sm font-medium ${location.pathname === '/appointments' ? 'text-text-main dark:text-white' : ''}`}>Citas</p>
          </Link>
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/doctors' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/doctors">
            <span className={`material-symbols-outlined ${location.pathname === '/doctors' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>stethoscope</span>
            <p className={`text-sm font-medium ${location.pathname === '/doctors' ? 'text-text-main dark:text-white' : ''}`}>Médicos</p>
          </Link>
          {isAdmin && (
            <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/users' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/users">
              <span className={`material-symbols-outlined ${location.pathname === '/users' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>group</span>
              <p className={`text-sm font-medium ${location.pathname === '/users' ? 'text-text-main dark:text-white' : ''}`}>Usuarios</p>
            </Link>
          )}
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/reports' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/reports">
            <span className={`material-symbols-outlined ${location.pathname === '/reports' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>analytics</span>
            <p className={`text-sm font-medium ${location.pathname === '/reports' ? 'text-text-main dark:text-white' : ''}`}>Reportes</p>
          </Link>
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/settings' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/settings">
            <span className={`material-symbols-outlined ${location.pathname === '/settings' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>settings</span>
            <p className={`text-sm font-medium ${location.pathname === '/settings' ? 'text-text-main dark:text-white' : ''}`}>Configuración</p>
          </Link>
          <div className="mt-auto pt-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b]">
            <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/help' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/help">
              <span className={`material-symbols-outlined ${location.pathname === '/help' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>help_outline</span>
              <p className={`text-sm font-medium ${location.pathname === '/help' ? 'text-text-main dark:text-white' : ''}`}>Ayuda</p>
            </Link>
          </div>
        </nav>
        {/* User Logout */}
        <div className="p-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-primary hover:bg-primary-dark transition-colors text-text-main font-bold text-sm tracking-wide shadow-sm shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
        {/* Top Header */}
        <header className="h-20 bg-surface-light dark:bg-surface-dark border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Left: Page Context/Title */}
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-text-main hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden sm:flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary-dark">
              <span className="material-symbols-outlined">chat</span>
            </div>
            <div>
              <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight">Mensajes</h2>
              <p className="text-text-secondary text-xs hidden sm:block">Gestiona tus conversaciones</p>
            </div>
          </div>
          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Search Bar */}
            <div className="hidden lg:flex items-center bg-[#f2f8f7] dark:bg-white/5 rounded-xl h-10 px-3 w-64 border border-transparent focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[20px]">search</span>
              <input
                className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full text-text-main dark:text-white placeholder:text-text-secondary/70 ml-2"
                placeholder="Buscar conversación..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="h-8 w-[1px] bg-[#e7f3f2] dark:bg-[#2a3c3b] hidden sm:block"></div>
            {/* Notifications */}
            <button className="relative p-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors text-text-main dark:text-white">
              <span className="material-symbols-outlined">notifications</span>
              {/* TODO: Dynamic unread messages count */}
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-surface-light dark:border-surface-dark"></span>
            </button>
            {/* Profile */}
            <div className="flex items-center gap-3 cursor-pointer p-1 pr-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors border border-transparent hover:border-[#e7f3f2]">
              {currentUserAvatar ? (
                <div
                  className="size-9 rounded-full bg-cover bg-center border border-[#e7f3f2]"
                  style={{ backgroundImage: `url('${currentUserAvatar}')` }}
                  aria-label="Retrato profesional de una doctora sonriendo"
                ></div>
              ) : (
                <div className="size-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                  {getInitials(userName)}
                </div>
              )}
              <div className="hidden xl:flex flex-col items-start mr-1">
                <span className="text-sm font-bold text-text-main dark:text-white leading-none">{userName}</span>
                <span className="text-[10px] text-text-secondary font-medium mt-1">{userRole}</span>
              </div>
              <span className="material-symbols-outlined text-text-secondary text-[18px] hidden xl:block">expand_more</span>
            </div>
          </div>
        </header>

        {/* Main Chat Content Area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Panel: Conversations List */}
          <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 border-r border-[#e7f3f2] dark:border-[#2a3c3b] bg-surface-light dark:bg-surface-dark flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-[#e7f3f2] dark:border-[#2a3c3b]">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-background-light dark:bg-background-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
                  placeholder="Buscar conversaciones..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            {conversationsLoading ? (
              renderConversationsLoadingState()
            ) : filteredConversations.length === 0 ? (
              renderConversationsEmptyState()
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-[#f0f7f6] dark:divide-[#2a3c3b]">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-[#f8fcfb] dark:hover:bg-white/5 transition-colors ${selectedConversationId === conv.id ? 'bg-[#e7f3f2] dark:bg-primary/10' : ''}`}
                    onClick={() => setSelectedConversationId(conv.id)}
                  >
                    <div className="relative flex-shrink-0">
                      {conv.participantAvatarUrl ? (
                        <div
                          className="size-10 rounded-full bg-cover bg-center border border-border-light dark:border-border-dark"
                          style={{ backgroundImage: `url('${conv.participantAvatarUrl}')` }}
                          aria-label={`Foto de perfil de ${conv.participantName}`}
                        ></div>
                      ) : (
                        <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {getInitials(conv.participantName)}
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute top-0 right-0 size-3 bg-red-500 rounded-full border-2 border-surface-light dark:border-surface-dark"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-sm font-bold text-text-main dark:text-white truncate">{conv.participantName}</h4>
                        <span className="text-xs text-text-secondary">{conv.lastMessageTimestamp}</span>
                      </div>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-text-main font-medium' : 'text-text-secondary'}`}>
                        {conv.lastMessageContent}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Chat Window */}
          <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex items-center gap-3 bg-surface-light dark:bg-surface-dark">
                  <div className="relative flex-shrink-0">
                    {selectedConversation.participantAvatarUrl ? (
                      <div
                        className="size-10 rounded-full bg-cover bg-center border border-border-light dark:border-border-dark"
                        style={{ backgroundImage: `url('${selectedConversation.participantAvatarUrl}')` }}
                        aria-label={`Foto de perfil de ${selectedConversation.participantName}`}
                      ></div>
                    ) : (
                      <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {getInitials(selectedConversation.participantName)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-main dark:text-white">{selectedConversation.participantName}</h3>
                    <p className="text-xs text-text-secondary">En línea</p>
                  </div>
                  <button className="p-2 text-text-secondary hover:bg-gray-100 dark:hover:bg-white/10 rounded-md">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>

                {/* Messages Area */}
                {messagesLoading ? (
                  renderMessagesLoadingState()
                ) : messages.length === 0 ? (
                  renderMessagesEmptyState()
                ) : (
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.isMine
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-surface-light dark:bg-surface-dark text-text-main rounded-bl-none border border-[#e7f3f2] dark:border-[#2a3c3b]'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <span className={`block text-right text-xs mt-1 ${message.isMine ? 'text-primary-foreground/80' : 'text-text-secondary'}`}>
                            {message.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b] bg-surface-light dark:bg-surface-dark flex items-center gap-3">
                  <input
                    type="text"
                    className="flex-1 p-3 rounded-xl border border-[#e7f3f2] dark:border-[#2a3c3b] bg-background-light dark:bg-background-dark text-text-main dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Escribe un mensaje..."
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="p-3 rounded-xl bg-primary hover:bg-primary-dark text-text-main dark:text-white transition-colors"
                    disabled={!newMessageContent.trim()}
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-secondary">
                <div className="bg-primary/10 text-primary-dark p-4 rounded-full mb-4">
                  <span className="material-symbols-outlined text-4xl">forum</span>
                </div>
                <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">Selecciona una conversación</h3>
                <p className="text-sm">Elige una conversación de la lista para empezar a chatear.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Messages;