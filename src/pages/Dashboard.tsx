import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { getInitials } from '@/lib/utils';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';


// Interfaces para la estructura de datos esperada
interface Message {
  id: string;
  phone_number: string;
  message_content: string;
  sender: 'user' | 'assistant';
  received_at: string;
  is_read: boolean;
  patient_name?: string;
}

interface Appointment {
  id: string;
  patient_name: string;
  appointment_type: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
}

const Dashboard = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    appointmentsTomorrow: 0,
    unreadMessages: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activeInsight, setActiveInsight] = useState(0);
  const [insights, setInsights] = useState<any[]>([]);
  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, isSessionLoading, navigate]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      // Fetch recent messages
      let messagesQuery = supabase
        .from('messages')
        .select('*');

      if (!isAdmin) {
        messagesQuery = messagesQuery.eq('user_id', user?.id);
      }

      const { data: messagesData, error: messagesError } = await messagesQuery
        .order('received_at', { ascending: false })
        .limit(4);

      if (messagesError) throw messagesError;

      // Fetch unread messages count separately
      let unreadQuery = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender', 'user')
        .eq('is_read', false);

      if (!isAdmin) {
        unreadQuery = unreadQuery.eq('user_id', user?.id);
      }

      const { count: unreadCount, error: _unreadError } = await unreadQuery;


      const enrichedMessages = await Promise.all(
        messagesData.map(async (msg: Message) => { // Tipado explícito para msg
          const { data: patientData } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('phone', msg.phone_number)
            .single();
          return {
            ...msg,
            patient_name: patientData ? `${patientData.first_name} ${patientData.last_name}` : msg.phone_number,
          };
        })
      );
      setRecentMessages(enrichedMessages);

      // Fetch upcoming appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

      let upcomingQuery = supabase
        .from('appointments')
        .select('id, patient_name, appointment_type, appointment_date, status');

      if (!isAdmin) {
        upcomingQuery = upcomingQuery.eq('user_id', user?.id);
      }

      const { data: appointmentsData, error: appointmentsError } = await upcomingQuery
        .gte('appointment_date', today.toISOString())
        .order('appointment_date', { ascending: true })
        .limit(3);

      if (appointmentsError) throw appointmentsError;
      setUpcomingAppointments(appointmentsData || []);

      // Calculate stats
      let todayStatsQuery = supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .gte('appointment_date', today.toISOString())
        .lt('appointment_date', tomorrow.toISOString());

      if (!isAdmin) {
        todayStatsQuery = todayStatsQuery.eq('user_id', user?.id);
      }

      const { count: appointmentsTodayCount, error: countError } = await todayStatsQuery;

      if (countError) throw countError;

      let tomorrowStatsQuery = supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .gte('appointment_date', tomorrow.toISOString())
        .lt('appointment_date', dayAfterTomorrow.toISOString());

      if (!isAdmin) {
        tomorrowStatsQuery = tomorrowStatsQuery.eq('user_id', user?.id);
      }

      const { count: appointmentsTomorrowCount, error: countTomorrowError } = await tomorrowStatsQuery;

      if (countTomorrowError) throw countTomorrowError;

      setStats({
        appointmentsToday: appointmentsTodayCount || 0,
        appointmentsTomorrow: appointmentsTomorrowCount || 0,
        unreadMessages: unreadCount || 0,
      });

      // Generate Insights
      const newInsights = [];

      if (appointmentsTomorrowCount && appointmentsTomorrowCount < 10) {
        newInsights.push({
          title: "Optimización de Agenda",
          text: `Tienes ${18 - appointmentsTomorrowCount} huecos libres mañana. ¿Deseas que activemos una campaña de rellamada?`,
          icon: "magic_button",
          cta: "Ver disponibilidad",
          link: "/appointments"
        });
      }

      if (unreadCount && unreadCount > 0) {
        newInsights.push({
          title: "Atención al Paciente",
          text: `Tienes ${unreadCount} mensajes pendientes de respuesta. Priorizar los de hoy mejorará tu tasa de conversión.`,
          icon: "chat_bubble",
          cta: "Ir a mensajes",
          link: "/messages"
        });
      }

      const pendingConfirmations = appointmentsData?.filter(a => a.status === 'pending').length || 0;
      if (pendingConfirmations > 0) {
        newInsights.push({
          title: "Confirmaciones Pendientes",
          text: `Hay ${pendingConfirmations} citas esperando confirmación. ¿Quieres que Laura AI envíe recordatorios ahora?`,
          icon: "verified",
          cta: "Gestionar citas",
          link: "/appointments"
        });
      }

      // Default Insight if empty
      if (newInsights.length === 0) {
        newInsights.push({
          title: "Todo al día",
          text: "Tu agenda está organizada y tus mensajes están al día. ¡Excelente trabajo!",
          icon: "check_circle",
          cta: "Ver reportes",
          link: "/reports"
        });
      }

      setInsights(newInsights);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      showError('Error al cargar datos: ' + error.message);
    } finally {
      setDashboardLoading(false);
    }
  };
  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setActiveInsight(prev => (prev + 1) % insights.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [insights]);

  // handleLogout and ProfileDropdown moved to DashboardLayout

  const handleNewAppointment = () => {
    navigate('/appointments');
  };

  const handleViewAllMessages = () => {
    navigate('/messages');
  };



  // Unused search logic moved to DashboardLayout

  if (isSessionLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando dashboard...</p>
      </div>
    );
  }


  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';

  const getAppointmentStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'rescheduled': return 'Reprogramada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getAppointmentStatusBadgeClasses = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'rescheduled': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-4">
        {/* Page Title & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Bienvenido de nuevo, {userName}</h3>
            <p className="text-text-secondary mt-1">Aquí está lo que está sucediendo en tu clínica hoy.</p>
          </div>
          <button
            onClick={handleNewAppointment}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-text-main font-bold px-5 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nueva Cita</span>
          </button>
        </div>

        {/* Global Announcements */}
        <AnnouncementBanner />

        {/* Stats Cards */}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Laura AI Sugerencia Dinámica */}
          <div className="bg-[#e7f8f6] dark:bg-[#e7f8f6]/10 p-6 pb-12 rounded-2xl border border-[#d0e7e5] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-4 group transition-all cursor-default col-span-1 min-w-0 relative overflow-hidden h-[240px]">
            {insights.length > 0 && (
              <div
                key={activeInsight}
                className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col"
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-[#00d4c8] p-2 rounded-full shadow-lg shadow-primary/20 flex-shrink-0">
                      <span className="material-symbols-outlined text-white text-[18px]">
                        {insights[activeInsight].icon || 'smart_toy'}
                      </span>
                    </div>
                    <h4 className="font-bold text-text-main dark:text-white text-[11px] uppercase tracking-widest leading-none">
                      {insights[activeInsight].title}
                    </h4>
                  </div>
                  {insights.length > 1 && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      {insights.map((_, i) => (
                        <div key={i} className={`size-1 rounded-full transition-all ${i === activeInsight ? 'bg-primary w-4' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-text-main dark:text-slate-200 text-sm leading-relaxed mt-3 font-medium">
                  {insights[activeInsight].text}
                </p>

                <div className="mt-auto pt-4">
                  <Link
                    to={insights[activeInsight].link}
                    className="inline-flex items-center gap-2 bg-white dark:bg-white/5 px-5 py-2.5 rounded-xl text-[#00d4c8] font-bold text-xs hover:bg-[#00d4c8] hover:text-white transition-all shadow-sm border border-[#d0e7e5] dark:border-transparent group/btn"
                  >
                    {insights[activeInsight].cta}
                    <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Citas Hoy */}
          <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                <span className="material-symbols-outlined">event_available</span>
              </div>
              <span className="text-[#078830] bg-[#078830]/10 px-2 py-0.5 rounded-full text-xs font-bold">+12%</span>
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium">Citas Hoy</p>
              <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{stats.appointmentsToday}</h4>
            </div>
          </div>

          {/* Card 3: Citas Mañana */}
          <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                <span className="material-symbols-outlined">calendar_month</span>
              </div>
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium">Citas Mañana</p>
              <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{stats.appointmentsTomorrow}</h4>
            </div>
          </div>

          {/* Card 4: Mensajes sin leer */}
          {/* Card 2 */}
          <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                <span className="material-symbols-outlined">mark_chat_unread</span>
              </div>
              {/* No badge */}
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium">Mensajes sin leer</p>
              <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{stats.unreadMessages}</h4>
            </div>
          </div>
        </div>
        {/* Main Section: Messages & Upcoming */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Recent Messages (Takes 2/3 space on large screens) */}
          <div className="xl:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex justify-between items-center bg-[#fafdfd] dark:bg-white/5">
              <h3 className="text-lg font-bold text-text-main dark:text-white">Mensajes Recientes</h3>
              <button onClick={handleViewAllMessages} className="text-sm font-bold text-primary-dark hover:text-primary">Ver todos</button>
            </div>
            <div className="divide-y divide-[#f0f7f6] dark:divide-[#2a3c3b]">
              {recentMessages.length === 0 ? (
                <div className="p-4 text-center text-text-secondary">No hay mensajes recientes.</div>
              ) : (
                recentMessages.map((message) => (
                  <div key={message.id} className="p-4 hover:bg-[#f8fcfb] dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-4 items-start group">
                    <div className="relative flex-shrink-0">
                      {/* No avatar_url in messages table, use initials */}
                      <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {getInitials(message.patient_name || message.phone_number)}
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-white dark:bg-surface-dark rounded-full p-[2px]">
                        <div className="bg-[#25D366] text-white rounded-full p-[2px] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[10px]">call</span>
                        </div>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-text-main dark:text-white truncate">{message.patient_name || message.phone_number}</h4>
                        <span className="text-xs text-text-secondary">{new Date(message.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className={`text-sm truncate ${message.is_read ? 'text-text-secondary' : 'text-text-main font-medium'} group-hover:text-text-main transition-colors`}>
                        {message.message_content}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!message.is_read && <span className="size-2 bg-primary rounded-full"></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Right Column: Next Appointments (Takes 1/3 space) */}
          <div className="xl:col-span-1 bg-surface-light dark:bg-surface-dark rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col">
            <div className="p-5 border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex justify-between items-center bg-[#fafdfd] dark:bg-white/5">
              <h3 className="text-lg font-bold text-text-main dark:text-white">Próximas Citas</h3>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md">
                <span className="material-symbols-outlined text-text-secondary text-[20px]">more_horiz</span>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {upcomingAppointments.length === 0 ? (
                <div className="p-4 text-center text-text-secondary">No hay citas próximas.</div>
              ) : (
                upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-start gap-3 p-3 bg-background-light dark:bg-white/5 rounded-xl border border-transparent hover:border-primary/30 transition-colors">
                    <div className="flex flex-col items-center bg-white dark:bg-black/20 rounded-lg p-2 min-w-[50px] shadow-sm">
                      <span className="text-xs font-bold text-primary-dark uppercase">{new Date(appointment.appointment_date).toLocaleString('es-ES', { month: 'short' })}</span>
                      <span className="text-xl font-bold text-text-main dark:text-white">{new Date(appointment.appointment_date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-text-main dark:text-white">{appointment.patient_name}</p>
                      <p className="text-xs text-text-secondary">{appointment.appointment_type} • {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getAppointmentStatusBadgeClasses(appointment.status)}`}>
                          {getAppointmentStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                onClick={() => navigate('/appointments')}
                className="w-full py-2 text-sm text-text-secondary font-medium hover:text-primary transition-colors border border-dashed border-[#d0e7e5] rounded-lg mt-2"
              >
                Ver calendario completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;