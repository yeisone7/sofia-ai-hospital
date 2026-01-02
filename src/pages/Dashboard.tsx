import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import { getInitials } from '@/lib/utils'; // Importado

// Interfaces para la estructura de datos esperada
interface Message {
  id: string;
  phone_number: string;
  message_content: string;
  sender: 'user' | 'assistant';
  received_at: string;
  read: boolean;
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
  const location = useLocation();

  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    unreadMessages: 0,
    dailyRevenue: 0, // Placeholder, as revenue is not in DB schema
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

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
    setDashboardError(null);
    try {
      // Fetch recent messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('received_at', { ascending: false })
        .limit(4); // Get last 4 messages

      if (messagesError) throw messagesError;

      const unreadMessagesCount = messagesData?.filter(msg => msg.sender === 'user' && !msg.read).length || 0;

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

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, patient_name, appointment_type, appointment_date, status')
        .eq('user_id', user?.id)
        .gte('appointment_date', today.toISOString())
        .order('appointment_date', { ascending: true })
        .limit(3); // Get next 3 appointments

      if (appointmentsError) throw appointmentsError;
      setUpcomingAppointments(appointmentsData || []);

      // Calculate stats
      const { count: appointmentsTodayCount, error: countError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id)
        .gte('appointment_date', today.toISOString())
        .lt('appointment_date', tomorrow.toISOString());

      if (countError) throw countError;

      setStats({
        appointmentsToday: appointmentsTodayCount || 0,
        unreadMessages: unreadMessagesCount,
        dailyRevenue: 1240, // Still placeholder
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setDashboardError('No se pudieron cargar los datos del dashboard.');
      showError('Error al cargar el dashboard: ' + error.message);
    } finally {
      setDashboardLoading(false);
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

  const handleNewAppointment = () => {
    showSuccess('Funcionalidad "Nueva Cita" en desarrollo.');
  };

  const handleViewAllMessages = () => {
    navigate('/messages');
  };

  const handleReviewAgenda = () => {
    showSuccess('Funcionalidad "Revisar agenda" en desarrollo.');
  };

  const handlePatientSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientSearchQuery(e.target.value);
    // Implement actual search logic or navigate to patients page with query
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (patientSearchQuery.trim()) {
      navigate(`/patients?search=${encodeURIComponent(patientSearchQuery.trim())}`);
    }
  };

  if (isSessionLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando dashboard...</p>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
          <p className="text-text-main dark:text-white">{dashboardError}</p>
          <button
            onClick={fetchDashboardData}
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
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url || null;

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
              <span className="material-symbols-outlined">dentistry</span>
            </div>
            <div>
              <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight">Clínica Dental Sonrisas</h2>
              <p className="text-text-secondary text-xs hidden sm:block">Sucursal Centro</p>
            </div>
          </div>
          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center bg-[#f2f8f7] dark:bg-white/5 rounded-xl h-10 px-3 w-64 border border-transparent focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[20px]">search</span>
              <input
                className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full text-text-main dark:text-white placeholder:text-text-secondary/70 ml-2"
                placeholder="Buscar paciente..."
                type="text"
                value={patientSearchQuery}
                onChange={handlePatientSearch}
              />
            </form>
            <div className="h-8 w-[1px] bg-[#e7f3f2] dark:bg-[#2a3c3b] hidden sm:block"></div>
            {/* Notifications */}
            <button onClick={handleViewAllMessages} className="relative p-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors text-text-main dark:text-white">
              <span className="material-symbols-outlined">notifications</span>
              {stats.unreadMessages > 0 && (
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-surface-light dark:border-surface-dark"></span>
              )}
            </button>
            {/* Profile */}
            <ProfileDropdown
              userName={userName}
              userRole={userRole}
              userEmail={userEmail}
              userAvatar={userAvatar}
            />
          </div>
        </header>
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
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
            {/* Tabs Navigation */}
            <div className="border-b border-[#d0e7e5] dark:border-[#2a3c3b]">
              <div className="flex gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
                <Link className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${location.pathname === '/dashboard' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`} to="/dashboard">
                  <span className={`material-symbols-outlined ${location.pathname === '/dashboard' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>dashboard</span>
                  <span className={`text-sm font-bold ${location.pathname === '/dashboard' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Dashboard</span>
                </Link>
                <Link className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${location.pathname === '/messages' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`} to="/messages">
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
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
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
              {/* Card 3 */}
              <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <span className="text-[#078830] bg-[#078830]/10 px-2 py-0.5 rounded-full text-xs font-bold">+5%</span>
                </div>
                <div>
                  <p className="text-text-secondary text-sm font-medium">Ingresos del día</p>
                  <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">${stats.dailyRevenue.toLocaleString()}</h4>
                </div>
              </div>
              {/* Card 4 */}
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-5 rounded-2xl border border-primary/20 shadow-sm flex flex-col justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-text-main rounded-full p-1">
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  </div>
                  <p className="text-text-main font-bold text-sm">Laura AI Sugerencia</p>
                </div>
                <p className="text-text-secondary text-sm leading-snug">Tienes 3 huecos libres mañana por la mañana. ¿Deseas enviar recordatorios?</p>
                <button onClick={handleReviewAgenda} className="text-xs font-bold text-primary-dark self-start hover:underline mt-1">Revisar agenda →</button>
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
                          <p className={`text-sm truncate ${message.read ? 'text-text-secondary' : 'text-text-main font-medium'} group-hover:text-text-main transition-colors`}>
                            {message.message_content}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {!message.read && <span className="size-2 bg-primary rounded-full"></span>}
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
                  <button className="w-full py-2 text-sm text-text-secondary font-medium hover:text-primary transition-colors border border-dashed border-[#d0e7e5] rounded-lg mt-2">
                    Ver calendario completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;