import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom'; // Import Link and useLocation
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

// Interfaces para la estructura de datos esperada
interface Message {
  id: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'whatsapp' | 'sms' | 'email'; // Example types
}

interface Appointment {
  id: string;
  patientName: string;
  service: string;
  time: string;
  date: string; // e.g., "Oct 24"
  status: 'Confirmada' | 'Pendiente' | 'Primera vez';
}

const Dashboard = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation(); // Use useLocation hook

  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    unreadMessages: 0,
    dailyRevenue: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionLoading && !user) {
      // If session is not loading and no user, redirect to login
      navigate('/login');
    } else if (user) {
      // User is logged in, fetch dashboard data
      fetchDashboardData();
    }
  }, [user, isSessionLoading, navigate]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      // TODO: Fetch stats from Supabase
      // Example: const { data: statsData, error: statsError } = await supabase.from('dashboard_stats').select('*').single();
      // if (statsError) throw statsError;
      setStats({
        appointmentsToday: 24, // Placeholder
        unreadMessages: 5,     // Placeholder
        dailyRevenue: 1240,    // Placeholder
      });

      // TODO: Fetch recent messages from Supabase
      // Example: const { data: messagesData, error: messagesError } = await supabase.from('messages').select('*').limit(4).order_by('timestamp', { ascending: false });
      // if (messagesError) throw messagesError;
      setRecentMessages([
        {
          id: 'msg1',
          senderName: 'María González',
          senderAvatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOS6Dsw080tA4PGE4aC6QMCLRjikPujnDSLOqtqvKS6iMKEtOZgqRhXQQan2K6yebAyAMPBffTX3xKS7No6Hwfk5e3CYf7_kK1j6CNe1c4o1XyMUmpRliJVxTCoW6_q13r3T6xKStIvZRpaYwlshBVMbMzxSUECSvs2Qj1RCh8-DmztdiUsU9x07YKnqD_yfg8VmIV-kzTuIjRx5nxwzcoMCM8x7LbOVU-7cQ4oIt49j09_LBO-aLyB_o3lZ8XnX8vwnBK2eUj58Y',
          content: 'Hola, quisiera confirmar mi cita para el próximo martes a las...',
          timestamp: '10:42 AM',
          read: false,
          type: 'whatsapp',
        },
        {
          id: 'msg2',
          senderName: 'Carlos Rodriguez',
          senderAvatarUrl: '', // No image, use initials
          content: '¿Tienen disponibilidad para una limpieza dental hoy?',
          timestamp: '09:15 AM',
          read: false,
          type: 'whatsapp',
        },
        {
          id: 'msg3',
          senderName: 'Javier Méndez',
          senderAvatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYLpEj0Yew8nNxSSAmPR4hWNZw8EETw_yykqKxEdXZy09BjlJcwMMp-WF64pcNAdjZCH1JhHou1xV7ndKd2TGy3uTjS2sLHOTdh6g0IwYz1C0f-pgl0D2B5uDY5QFIxRl5A1dnZcCn7kp9F2tbDY0pisCE0pAoItLGDqZo4_YuJWDewfYXkb3n3dA0OgPPyRK1Os5EvHS6Mets-vxQ3CLgY4IfFEJxJ6BubOtEDAH5q1_eR0NiZol1gA5eCcBkYwRsPMgSxoqRTNA',
          content: 'Gracias, nos vemos entonces.',
          timestamp: 'Ayer',
          read: true,
          type: 'sms',
        },
        {
          id: 'msg4',
          senderName: 'Luisa Perez',
          senderAvatarUrl: '', // No image, use initials
          content: 'Necesito cancelar mi cita por motivos personales.',
          timestamp: 'Ayer',
          read: true,
          type: 'sms',
        },
      ]);

      // TODO: Fetch upcoming appointments from Supabase
      // Example: const { data: appointmentsData, error: appointmentsError } = await supabase.from('appointments').select('*').order_by('date', { ascending: true }).limit(3);
      // if (appointmentsError) throw appointmentsError;
      setUpcomingAppointments([
        {
          id: 'app1',
          patientName: 'Sofia Lopez',
          service: 'Ortodoncia',
          time: '14:00',
          date: 'Oct 24',
          status: 'Confirmada',
        },
        {
          id: 'app2',
          patientName: 'Miguel Ángel',
          service: 'Limpieza',
          time: '15:30',
          date: 'Oct 24',
          status: 'Pendiente',
        },
        {
          id: 'app3',
          patientName: 'Ana Torres',
          service: 'Consulta General',
          time: '09:00',
          date: 'Oct 25',
          status: 'Primera vez',
        },
      ]);

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
      // Redirection handled by SessionContextProvider
    }
  };

  const handleNewAppointment = () => {
    // TODO: Implement logic for creating a new appointment
    showSuccess('Funcionalidad "Nueva Cita" en desarrollo.');
  };

  const handleViewAllMessages = () => {
    // TODO: Implement navigation to messages page
    showSuccess('Funcionalidad "Ver todos los mensajes" en desarrollo.');
  };

  const handleReviewAgenda = () => {
    // TODO: Implement navigation to calendar/agenda page
    showSuccess('Funcionalidad "Revisar agenda" en desarrollo.');
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
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

  // Assuming user is logged in and data is loaded
  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const userRole = user?.user_metadata?.role || 'Admin';
  const userAvatar = user?.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKGJqOrxKC8dOGnL2B3rcuN8cbystShMdVLZ1f22GeobGXHdn17h731ohnBgSFGJzHSaFFsKSuto3ONj63pIfPpeClcp3tWAb-bclE_Hdvuy0R-QbHkMZiM6WYYc3nXNPjiDH0EMCfTWpN1A8GDrVRx2om-uuCNIMSN-DSrG8z2WZluh5jVJxmObR7BrX_OOftM87dob0SyNkuMtcrKkmQBolg7ESQ8bWASHic7KVtOqf3B-tpEFB-W_Ojbd_zMuoMOU5VqJiH_A'; // Placeholder

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main h-screen overflow-hidden flex">
      {/* Side Navigation Bar */}
      <aside className="w-72 bg-surface-light dark:bg-surface-dark border-r border-[#e7f3f2] dark:border-[#2a3c3b] flex flex-col hidden md:flex flex-shrink-0 transition-all z-20">
        {/* Logo Area */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              {/* Abstract AI/Medical Logo representation */}
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
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/reports' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/reports">
            <span className={`material-symbols-outlined ${location.pathname === '/reports' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>analytics</span>
            <p className={`text-sm font-medium ${location.pathname === '/reports' ? 'text-text-main dark:text-white' : ''}`}>Reportes</p>
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
            <div className="hidden lg:flex items-center bg-[#f2f8f7] dark:bg-white/5 rounded-xl h-10 px-3 w-64 border border-transparent focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[20px]">search</span>
              <input className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full text-text-main dark:text-white placeholder:text-text-secondary/70 ml-2" placeholder="Buscar paciente..." type="text" />
            </div>
            <div className="h-8 w-[1px] bg-[#e7f3f2] dark:bg-[#2a3c3b] hidden sm:block"></div>
            {/* Notifications */}
            <button className="relative p-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors text-text-main dark:text-white">
              <span className="material-symbols-outlined">notifications</span>
              {stats.unreadMessages > 0 && (
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-surface-light dark:border-surface-dark"></span>
              )}
            </button>
            {/* Profile */}
            <div className="flex items-center gap-3 cursor-pointer p-1 pr-2 rounded-full hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors border border-transparent hover:border-[#e7f3f2]">
              <div
                className="size-9 rounded-full bg-cover bg-center border border-[#e7f3f2]"
                style={{ backgroundImage: `url('${userAvatar}')` }}
                aria-label="Retrato profesional de una doctora sonriendo"
              ></div>
              <div className="hidden xl:flex flex-col items-start mr-1">
                <span className="text-sm font-bold text-text-main dark:text-white leading-none">{userName}</span>
                <span className="text-[10px] text-text-secondary font-medium mt-1">{userRole}</span>
              </div>
              <span className="material-symbols-outlined text-text-secondary text-[18px] hidden xl:block">expand_more</span>
            </div>
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
                  <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/dashboard' ? 'text-primary' : 'text-text-secondary group-hover:text-primary'}`}>chat</span>
                  <span className={`text-sm font-bold ${location.pathname === '/dashboard' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Mensajes</span>
                </Link>
                <Link className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${location.pathname === '/appointments' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`} to="/appointments">
                  <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/appointments' ? 'text-primary' : 'text-text-secondary group-hover:text-primary'}`}>schedule</span>
                  <span className={`text-sm font-bold ${location.pathname === '/appointments' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Citas</span>
                </Link>
                <Link className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${location.pathname === '/doctors' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`} to="/doctors">
                  <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/doctors' ? 'text-primary' : 'text-text-secondary group-hover:text-primary'}`}>stethoscope</span>
                  <span className={`text-sm font-bold ${location.pathname === '/doctors' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Médicos</span>
                </Link>
                <a className="flex items-center gap-2 border-b-[3px] border-transparent pb-3 px-1 min-w-fit group hover:border-primary/30 transition-colors" href="#">
                  <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">settings</span>
                  <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Configuración</span>
                </a>
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
                  <span className="text-[#078830] bg-[#078830]/10 px-2 py-0.5 rounded-full text-xs font-bold">+12%</span> {/* TODO: Make dynamic */}
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
                  <span className="text-[#078830] bg-[#078830]/10 px-2 py-0.5 rounded-full text-xs font-bold">+5%</span> {/* TODO: Make dynamic */}
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
                          {message.senderAvatarUrl ? (
                            <div
                              className="size-10 rounded-full bg-cover bg-center"
                              style={{ backgroundImage: `url('${message.senderAvatarUrl}')` }}
                              aria-label={`Foto de perfil de ${message.senderName}`}
                            ></div>
                          ) : (
                            <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                              {getInitials(message.senderName)}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-white dark:bg-surface-dark rounded-full p-[2px]">
                            {/* Whatsapp Icon simulation */}
                            <div className="bg-[#25D366] text-white rounded-full p-[2px] flex items-center justify-center">
                              <span className="material-symbols-outlined text-[10px]">call</span> {/* Placeholder for whatsapp icon */}
                            </div>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className="text-sm font-bold text-text-main dark:text-white truncate">{message.senderName}</h4>
                            <span className="text-xs text-text-secondary">{message.timestamp}</span>
                          </div>
                          <p className={`text-sm truncate ${message.read ? 'text-text-secondary' : 'text-text-main font-medium'} group-hover:text-text-main transition-colors`}>
                            {message.content}
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
                          <span className="text-xs font-bold text-primary-dark uppercase">{appointment.date.split(' ')[0]}</span>
                          <span className="text-xl font-bold text-text-main dark:text-white">{appointment.date.split(' ')[1]}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-text-main dark:text-white">{appointment.patientName}</p>
                          <p className="text-xs text-text-secondary">{appointment.service} • {appointment.time}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {appointment.status === 'Confirmada' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">Confirmada</span>
                            )}
                            {appointment.status === 'Pendiente' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">Pendiente</span>
                            )}
                            {appointment.status === 'Primera vez' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Primera vez</span>
                            )}
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