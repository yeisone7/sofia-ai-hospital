import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

// Interfaces para la estructura de datos esperada
interface Appointment {
  id: string;
  patientName: string;
  service: string;
  time: string;
  date: string; // e.g., "Oct 24"
  status: 'Confirmada' | 'Pendiente' | 'Primera vez' | 'Cancelada';
}

const Appointments = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Confirmada' | 'Pendiente' | 'Primera vez' | 'Cancelada'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchAppointmentsData();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    applyFilters();
  }, [allAppointments, filterStatus, searchQuery]);

  const fetchAppointmentsData = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      // TODO: Fetch all appointments from Supabase
      // Example: const { data, error } = await supabase.from('appointments').select('*').order_by('date', { ascending: true });
      // if (error) throw error;
      // setAllAppointments(data);

      // Placeholder data
      const dummyAppointments: Appointment[] = [
        { id: 'app1', patientName: 'Sofia Lopez', service: 'Ortodoncia', time: '14:00', date: 'Oct 24', status: 'Confirmada' },
        { id: 'app2', patientName: 'Miguel Ángel', service: 'Limpieza', time: '15:30', date: 'Oct 24', status: 'Pendiente' },
        { id: 'app3', patientName: 'Ana Torres', service: 'Consulta General', time: '09:00', date: 'Oct 25', status: 'Primera vez' },
        { id: 'app4', patientName: 'Juan Pérez', service: 'Extracción', time: '10:00', date: 'Oct 25', status: 'Confirmada' },
        { id: 'app5', patientName: 'Laura García', service: 'Revisión', time: '11:00', date: 'Oct 26', status: 'Pendiente' },
        { id: 'app6', patientName: 'Pedro Sánchez', service: 'Blanqueamiento', time: '16:00', date: 'Oct 26', status: 'Cancelada' },
        { id: 'app7', patientName: 'Elena Ruiz', service: 'Endodoncia', time: '10:30', date: 'Oct 27', status: 'Confirmada' },
        { id: 'app8', patientName: 'Ricardo Castro', service: 'Implante', time: '12:00', date: 'Oct 27', status: 'Pendiente' },
        { id: 'app9', patientName: 'Isabel Vargas', service: 'Ortodoncia', time: '17:00', date: 'Oct 28', status: 'Primera vez' },
        { id: 'app10', patientName: 'Fernando Díaz', service: 'Limpieza', time: '09:00', date: 'Oct 28', status: 'Confirmada' },
      ];
      setAllAppointments(dummyAppointments);
      // Para probar el estado vacío, descomenta la siguiente línea y comenta la anterior:
      // setAllAppointments([]);

    } catch (error: any) {
      console.error('Error fetching appointments data:', error);
      setAppointmentsError('No se pudieron cargar las citas.');
      showError('Error al cargar las citas: ' + error.message);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const applyFilters = () => {
    let tempAppointments = [...allAppointments];

    if (filterStatus !== 'all') {
      tempAppointments = tempAppointments.filter(app => app.status === filterStatus);
    }

    if (searchQuery) {
      tempAppointments = tempAppointments.filter(app =>
        app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.service.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAppointments(tempAppointments);
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
    // TODO: Implement logic for creating a new appointment
  };

  const handleViewAppointmentDetails = (appointmentId: string) => {
    showSuccess(`Ver detalles de la cita ${appointmentId} en desarrollo.`);
    // TODO: Implement navigation to appointment details page
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando sesión...</p>
      </div>
    );
  }

  if (appointmentsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
          <p className="text-text-main dark:text-white">{appointmentsError}</p>
          <button
            onClick={fetchAppointmentsData}
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
  const userAvatar = user?.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKGJqOrxKC8dOGnL2B3rcuN8cbystShMdVLZ1f22GeobGXHdn17h731ohnBgSFGJzHSaFFsKSuto3ONj63pIfPpeClcp3tWAb-bclE_Hdvuy0R-QbHkMZiM6WYYc3nXNPjiDH0EMCfTWpN1A8GDrVRx2om-uuCNIMSN-DSrG8z2WZluh5jVJxmObR7BrX_OOftM87dob0SyNkuMtcrKkmQBolg7ESQ8bWASHic7KVtOqf3B-tpEFB-W_Ojbd_zMuoMOU5VqJiH_A'; // Placeholder

  const getStatusBadgeClasses = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmada': return 'bg-green-100 text-green-700';
      case 'Pendiente': return 'bg-orange-100 text-orange-700';
      case 'Primera vez': return 'bg-blue-100 text-blue-700';
      case 'Cancelada': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderLoadingState = () => (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-8 animate-pulse">
      {/* Page Title & Primary Action Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="h-11 w-full sm:w-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>

      {/* Tabs Navigation Skeleton */}
      <div className="border-b border-[#d0e7e5] dark:border-[#2a3c3b]">
        <div className="flex gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg size-10"></div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5 mb-1"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/5"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Appointments List Skeleton */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex justify-between items-center bg-[#fafdfd] dark:bg-white/5">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
        <div className="divide-y divide-[#f0f7f6] dark:divide-[#2a3c3b]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4 items-center">
              <div className="flex flex-col items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-2 min-w-[50px] h-[60px]"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
      {/* Page Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Citas</h3>
          <p className="text-text-secondary mt-1">Aquí puedes ver y gestionar todas las citas de tu clínica.</p>
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
          <Link className="flex items-center gap-2 border-b-[3px] border-transparent pb-3 px-1 min-w-fit group hover:border-primary/30 transition-colors" to="/dashboard">
            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">chat</span>
            <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Mensajes</span>
          </Link>
          <Link className="flex items-center gap-2 border-b-[3px] border-primary pb-3 px-1 min-w-fit" to="/appointments">
            <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
            <span className="text-text-main dark:text-white text-sm font-bold">Citas</span>
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors group text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white" to="/doctors">
            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">stethoscope</span>
            <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Médicos</span>
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors group text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white" to="/settings">
            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">settings</span>
            <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Configuración</span>
          </Link>
        </div>
      </div>
      {/* Empty State Content */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <div className="bg-primary/10 text-primary-dark p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-4xl">event_note</span>
        </div>
        <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">No hay citas programadas</h3>
        <p className="text-text-secondary mb-6 max-w-sm">
          Parece que no tienes citas agendadas para este filtro. ¡Es un buen momento para organizar la semana o crear una nueva cita!
        </p>
        <button
          onClick={handleNewAppointment}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-text-main font-bold px-5 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Agendar Cita Ahora</span>
        </button>
      </div>
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
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/patients' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/patients">
            <span className={`material-symbols-outlined ${location.pathname === '/patients' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>groups</span>
            <p className={`text-sm font-medium ${location.pathname === '/patients' ? 'text-text-main dark:text-white' : ''}`}>Pacientes</p>
          </Link>
          <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/appointments' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/appointments">
            <span className={`material-symbols-outlined ${location.pathname === '/appointments' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>calendar_month</span>
            <p className={`text-sm font-medium ${location.pathname === '/appointments' ? 'text-text-main dark:text-white' : ''}`}>Citas</p>
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
              <input
                className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full text-text-main dark:text-white placeholder:text-text-secondary/70 ml-2"
                placeholder="Buscar cita o paciente..."
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
          {appointmentsLoading ? (
            renderLoadingState()
          ) : filteredAppointments.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
              {/* Page Title & Primary Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Citas</h3>
                  <p className="text-text-secondary mt-1">Aquí puedes ver y gestionar todas las citas de tu clínica.</p>
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
                  <Link className="flex items-center gap-2 border-b-[3px] border-transparent pb-3 px-1 min-w-fit group hover:border-primary/30 transition-colors" to="/dashboard">
                    <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">chat</span>
                    <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Mensajes</span>
                  </Link>
                  <Link className="flex items-center gap-2 border-b-[3px] border-primary pb-3 px-1 min-w-fit" to="/appointments">
                    <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                    <span className="text-text-main dark:text-white text-sm font-bold">Citas</span>
                  </Link>
                  <Link className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors group text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white" to="/doctors">
                    <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">stethoscope</span>
                    <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Médicos</span>
                  </Link>
                  <Link className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors group text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white" to="/settings">
                    <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">settings</span>
                    <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Configuración</span>
                  </Link>
                </div>
              </div>
              {/* Appointments Overview / Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Citas */}
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                      <span className="material-symbols-outlined">event</span>
                    </div>
                    {/* TODO: Make dynamic */}
                    <span className="text-[#078830] bg-[#078830]/10 px-2 py-0.5 rounded-full text-xs font-bold">+15%</span>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm font-medium">Total Citas</p>
                    <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{allAppointments.length}</h4>
                  </div>
                </div>
                {/* Card 2: Citas Confirmadas */}
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    {/* TODO: Make dynamic */}
                    <span className="text-[#078830] bg-[#078830]/10 px-2 py-0.5 rounded-full text-xs font-bold">+8%</span>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm font-medium">Confirmadas</p>
                    <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{allAppointments.filter(app => app.status === 'Confirmada').length}</h4>
                  </div>
                </div>
                {/* Card 3: Citas Pendientes */}
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                      <span className="material-symbols-outlined">pending_actions</span>
                    </div>
                    {/* TODO: Make dynamic */}
                    <span className="text-[#ff9800] bg-[#ff9800]/10 px-2 py-0.5 rounded-full text-xs font-bold">-2%</span>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm font-medium">Pendientes</p>
                    <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{allAppointments.filter(app => app.status === 'Pendiente').length}</h4>
                  </div>
                </div>
                {/* Card 4: Citas Canceladas */}
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                      <span className="material-symbols-outlined">cancel</span>
                    </div>
                    {/* TODO: Make dynamic */}
                    <span className="text-[#f44336] bg-[#f44336]/10 px-2 py-0.5 rounded-full text-xs font-bold">+1%</span>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm font-medium">Canceladas</p>
                    <h4 className="text-2xl font-bold text-text-main dark:text-white mt-1">{allAppointments.filter(app => app.status === 'Cancelada').length}</h4>
                  </div>
                </div>
              </div>

              {/* Appointments List */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex justify-between items-center bg-[#fafdfd] dark:bg-white/5">
                  <h3 className="text-lg font-bold text-text-main dark:text-white">Todas las Citas</h3>
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-transparent border border-[#e7f3f2] dark:border-[#2a3c3b] rounded-md px-3 py-1 text-sm text-text-main dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                    >
                      <option value="all">Todos los estados</option>
                      <option value="Confirmada">Confirmada</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Primera vez">Primera vez</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md">
                      <span className="material-symbols-outlined text-text-secondary text-[20px]">filter_list</span>
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-[#f0f7f6] dark:divide-[#2a3c3b]">
                  {filteredAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 hover:bg-[#f8fcfb] dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-4 items-center" onClick={() => handleViewAppointmentDetails(appointment.id)}>
                      <div className="flex flex-col items-center bg-white dark:bg-black/20 rounded-lg p-2 min-w-[50px] shadow-sm">
                        <span className="text-xs font-bold text-primary-dark uppercase">{appointment.date.split(' ')[0]}</span>
                        <span className="text-xl font-bold text-text-main dark:text-white">{appointment.date.split(' ')[1]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-text-main dark:text-white">{appointment.patientName}</p>
                        <p className="text-xs text-text-secondary">{appointment.service} • {appointment.time}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusBadgeClasses(appointment.status)}`}>
                        {appointment.status}
                      </span>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md text-text-secondary">
                        <span className="material-symbols-outlined text-[20px]">arrow_forward_ios</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Appointments;