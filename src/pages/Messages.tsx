import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Conversation {
  phone_number: string;
  user_id: string;
  current_step: string;
  temp_data: any;
  updated_at: string;
  patient_name?: string;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  user_id: string;
  phone_number: string;
  message_content: string;
  sender: 'user' | 'assistant';
  received_at: string;
  created_at: string;
}

const Messages = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchConversations();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.phone_number);
      // Mark as read
      markAsRead(selectedConversation.phone_number);
    } else {
      setMessages([]);
    }
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (selectedConversation && newMessage.phone_number === selectedConversation.phone_number) {
            setMessages((prev) => [...prev, newMessage]);
            // If we are looking at this conversation, mark the new message as read immediately
            if (newMessage.sender === 'user') {
              markAsRead(selectedConversation.phone_number);
            }
            // Refresh conversation list to update last activity
            fetchConversations();
          } else {
            // If message is for another conversation, just refresh the list (which will update unread counts)
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  const markAsRead = async (phoneNumber: string) => {
    // Optimistic update of local conversation list to clear badge
    setConversations(prev => prev.map(c =>
      c.phone_number === phoneNumber ? { ...c, unread_count: 0 } : c
    ));

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('phone_number', phoneNumber)
      .eq('is_read', false); // Update only unread messages

    if (error) console.error("Error marking as read", error);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    // Keep loading state mainly for initial load to avoid flickering
    if (conversations.length === 0) {
      setConversationsLoading(true);
    }
    setChatError(null);
    try {
      const { data, error } = await supabase
        .from('conversation_state')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich conversations with patient names
      const enrichedConversations = await Promise.all(
        data.map(async (conv) => {
          // Try to get patient name from patients table
          const { data: patientData, error: _patientError } = await supabase // Renombrado a _patientError
            .from('patients')
            .select('first_name, last_name')
            .eq('phone', conv.phone_number)
            .single();


          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('phone_number', conv.phone_number)
            .eq('is_read', false)
            .eq('sender', 'user'); // Only count user messages as unread

          return {
            ...conv,
            unread_count: unreadCount || 0,
            patient_name: patientData
              ? `${patientData.first_name} ${patientData.last_name}`
              : conv.phone_number
          };
        })
      );

      setConversations(enrichedConversations);
      // Only set initial selected conversation if none selected and not loading
      if (enrichedConversations.length > 0 && !selectedConversation && conversationsLoading) {
        setSelectedConversation(enrichedConversations[0]);
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      setChatError('No se pudieron cargar las conversaciones.');
      showError('Error al cargar conversaciones: ' + error.message);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchMessages = async (phoneNumber: string) => {
    setMessagesLoading(true);
    setChatError(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user?.id)
        .eq('phone_number', phoneNumber)
        .order('received_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
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
    if (!newMessageContent.trim() || !selectedConversation) return;

    const messageToSend = newMessageContent.trim();
    // Optimistic UI Update: Create a temporary message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      user_id: user?.id || '',
      phone_number: selectedConversation.phone_number,
      message_content: messageToSend,
      sender: 'user',
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Update local state immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessageContent('');

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone_number: selectedConversation.phone_number,
          message: messageToSend
        }
      });

      if (error) {
        throw new Error(error.message || 'Error executing Edge Function');
      }

      const responseData = data;
      if (!responseData?.success) {
        throw new Error(responseData?.error || 'Failed to send message');
      }

      // On success, we could replace the temp ID with the real SID if needed, or just refresh
      // For now, refreshing conversations to update "Last activity" timestamp
      fetchConversations();

    } catch (error: any) {
      console.error('Error sending message:', error);
      showError('Error al enviar mensaje: ' + error.message);

      // Revert optimistic update (remove the failed message)
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      // Restore the message content to the input so the user can try again
      setNewMessageContent(messageToSend);
    }
  };


  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      // Delete all messages for this conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user?.id)
        .eq('phone_number', conversationToDelete.phone_number);

      if (messagesError) throw messagesError;

      // Delete conversation state
      const { error: stateError } = await supabase
        .from('conversation_state')
        .delete()
        .eq('user_id', user?.id)
        .eq('phone_number', conversationToDelete.phone_number);

      if (stateError) throw stateError;

      showSuccess('Conversación eliminada correctamente.');

      // Clear selected conversation if it was the one deleted
      if (selectedConversation?.phone_number === conversationToDelete.phone_number) {
        setSelectedConversation(null);
        setMessages([]);
      }

      // Refresh conversations list
      fetchConversations();
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      showError('Error al eliminar la conversación: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleDeleteClick = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    setConversationToDelete(conv);
    setDeleteDialogOpen(true);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone_number.includes(searchQuery)
  );

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
    <div className="flex-1 flex flex-col h-[calc(100vh-theme(spacing.20))] overflow-hidden">
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
                  key={conv.phone_number}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-[#f8fcfb] dark:hover:bg-white/5 transition-colors ${selectedConversation?.phone_number === conv.phone_number ? 'bg-[#e7f3f2] dark:bg-primary/10' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {getInitials(conv.patient_name || conv.phone_number)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-sm font-bold text-text-main dark:text-white truncate">
                        {conv.patient_name || conv.phone_number}
                      </h4>
                      <span className="text-xs text-text-secondary">
                        {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${conv.unread_count && conv.unread_count > 0 ? 'font-bold text-text-main dark:text-white' : 'text-text-secondary'}`}>
                        {conv.current_step === 'completed' ? 'Conversación completada' : 'En progreso'}
                      </p>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 ml-2 text-[10px] font-bold text-white bg-primary rounded-full">
                          {conv.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-[20px] text-text-secondary">more_vert</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark">
                      <DropdownMenuItem
                        className="text-red-600 dark:text-red-400 cursor-pointer"
                        onClick={(e) => handleDeleteClick(conv, e as any)}
                      >
                        <span className="material-symbols-outlined text-[18px] mr-2">delete</span>
                        Eliminar conversación
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {getInitials(selectedConversation.patient_name || selectedConversation.phone_number)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-main dark:text-white">
                    {selectedConversation.patient_name || selectedConversation.phone_number}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Última actividad: {new Date(selectedConversation.updated_at).toLocaleString()}
                  </p>
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
                      className={`flex ${message.sender === 'assistant' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${message.sender === 'assistant'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-surface-light dark:bg-surface-dark text-text-main rounded-bl-none border border-[#e7f3f2] dark:border-[#2a3c3b]'
                          }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                        <span
                          className={`block text-right text-xs mt-1 ${message.sender === 'assistant' ? 'text-primary-foreground/80' : 'text-text-secondary'
                            }`}
                        >
                          {new Date(message.received_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b] bg-surface-light dark:bg-surface-dark flex items-center gap-3"
              >
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-main dark:text-white">¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Esta acción no se puede deshacer. Se eliminarán todos los mensajes de esta conversación con{' '}
              <span className="font-semibold">
                {conversationToDelete?.patient_name || conversationToDelete?.phone_number}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background-light dark:bg-background-dark text-text-main dark:text-white border-border-light dark:border-border-dark">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;