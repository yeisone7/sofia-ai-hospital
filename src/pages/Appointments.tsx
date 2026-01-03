import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { showError, showSuccess } from '@/utils/toast';
import { Appointment } from '@/types/common'; // Importar Appointment desde el archivo compartido
import { getInitials } from '@/lib/utils'; // Reintroducido
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar as CalendarIcon, User as UserIcon, CheckCircle, XCircle } from 'lucide-react';
// import Sidebar from '@/components/Sidebar'; // Assuming these are not yet created or needed for this fix
// import Header from '@/components/Header'; // Assuming these are not yet created or needed for this fix


interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  status: boolean;
}

const Appointments = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'rescheduled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;
  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchAppointmentsData();
      fetchDoctors();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    applyFilters();
  }, [allAppointments, filterStatus, searchQuery, currentPage]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, status')
        .eq('user_id', user?.id)
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      showError('Error al cargar los médicos: ' + error.message);
    }
  };

  const fetchAppointmentsData = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .order('appointment_date', { ascending: false });
      
      if (error) throw error;
      setAllAppointments(data || []);
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
        app.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.appointment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.phone_number.includes(searchQuery)
      );
    }
    
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    setFilteredAppointments(tempAppointments.slice(startIndex, endIndex));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
      
      if (error) throw error;
      showSuccess('Cita confirmada correctamente.');
      fetchAppointmentsData();
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      showError('Error al confirmar la cita: ' + error.message);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
      
      if (error) throw error;
      showSuccess('Cita cancelada correctamente.');
      fetchAppointmentsData();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      showError('Error al cancelar la cita: ' + error.message);
    }
  };

  const handleRescheduleAppointment = async (_appointmentId: string) => {
    showSuccess('Funcionalidad de reprogramación en desarrollo.');
  };

  const handleChangeDoctor = async (_appointmentId: string) => {
    showSuccess('Funcionalidad de cambio de médico en desarrollo.');
  };

  const handleViewAppointmentDetails = (_appointmentId: string) => {
    showSuccess(`Ver detalles de la cita ${_appointmentId} en desarrollo.`);
  };

  const totalPages = Math.ceil(allAppointments.length / appointmentsPerPage);
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (isSessionLoading || appointmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando citas...</p>
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
  const _userRole = user?.user_metadata?.role || 'Admin'; // Fix 12: Prefixed with '_'
  const userAvatar = user?.user_metadata?.avatar_url || null;

  const getStatusBadgeClasses = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'rescheduled':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'rescheduled':
        return 'Reprogramada';
      default:
        return status;
    }
  };

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return 'Sin asignar';
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? doctor.full_name : 'Médico no encontrado';
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
          onClick={() => showSuccess('Funcionalidad "Nueva Cita" en desarrollo.')}
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
            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">dashboard</span>
            <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Dashboard</span>
          </Link>
          <Link className="flex items-center gap-2 border-b-[3px] border-transparent pb-3 px-1 min-w-fit group hover:border-primary/30 transition-colors" to="/messages">
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
          {isAdmin && (
            <Link className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/users' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`} to="/users">
              <span className={`material-symbols-outlined ${location.pathname === '/users' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>group</span>
              <span className={`text-sm font-medium ${location.pathname === '/users' ? 'text-text-main dark:text-white' : ''}`}>Usuarios</span>
            </Link>
          )}
          <Link className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors group text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white" to="/settings">
            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[20px]">settings</span>
            <span className="text-text-secondary group-hover:text-primary dark:text-gray-400 text-sm font-bold">Configuración</span>
          </Link>
        </div>
      </div>
      {/* Empty State Content */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-dashed border-border-light dark:border-border-dark p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-primary/10 text-primary-dark p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-4xl">event_note</span>
        </div>
        <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">No hay citas programadas</h3>
        <p className="text-text-secondary mb-6 max-w-sm">
          Parece que no tienes citas agendadas para este filtro. ¡Es un buen momento para organizar la semana o crear una nueva cita!
        </p>
        <button
          onClick={() => showSuccess('Funcionalidad "Nueva Cita" en desarrollo.')}
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
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-light dark:bg-surface-dark border-b border-[#e7f3f2] dark:border-[#2a3c3b]">
          <div className="flex items-center gap-2">
            <button className="p-2 text-text-main hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="font-bold text-text-main dark:text-white">Laura AI</span>
          </div>
          {userAvatar ? (
            <div
              className="size-8 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url('${userAvatar}')` }}
              aria-label="User profile picture"
            ></div>
          ) : (
            <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
              {getInitials(userName)}
            </div>
          )}
        </header>
        {/* Top Bar Desktop */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-transparent">
          <div>
            <nav className="flex text-sm text-text-secondary mb-1">
              <Link className="hover:text-text-main dark:hover:text-white cursor-pointer" to="/dashboard">Panel</Link>
              <span className="mx-2">/</span>
              <span className="text-text-main dark:text-primary font-medium">Citas</span>
            </nav>
            <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Citas</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-primary/10">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-background-light"></span>
            </button>
            <Link to="/help" className="flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-[#e7f3f2] dark:border-[#2a3c3b] rounded-lg px-3 py-2 text-sm font-medium text-text-main dark:text-white hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[20px]">help</span>
              <span>Ayuda</span>
            </Link>
          </div>
        </header>
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:px-8 pb-10">
          {appointmentsLoading ? (
            renderLoadingState()
          ) : allAppointments.length === 0 && !searchQuery && filterStatus === 'all' ? (
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
                  onClick={() => showSuccess('Funcionalidad "Nueva Cita" en desarrollo.')}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-text-main font-bold px-5 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Nueva Cita</span>
                </button>
              </div>
              {/* Tabs Navigation */}
              <div className="border-b border-[#d0e7e5] dark:border-[#2a3c3b]">
                <div className="flex gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${filterStatus === 'all' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`}
                  >
                    <span className={`material-symbols-outlined ${filterStatus === 'all' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>event_note</span>
                    <span className={`text-sm font-bold ${filterStatus === 'all' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Todas</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${filterStatus === 'pending' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`}
                  >
                    <span className={`material-symbols-outlined ${filterStatus === 'pending' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>pending</span>
                    <span className={`text-sm font-bold ${filterStatus === 'pending' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Pendientes</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('confirmed')}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${filterStatus === 'confirmed' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`}
                  >
                    <span className={`material-symbols-outlined ${filterStatus === 'confirmed' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>check_circle</span>
                    <span className={`text-sm font-bold ${filterStatus === 'confirmed' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Confirmadas</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('cancelled')}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${filterStatus === 'cancelled' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`}
                  >
                    <span className={`material-symbols-outlined ${filterStatus === 'cancelled' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>cancel</span>
                    <span className={`text-sm font-bold ${filterStatus === 'cancelled' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Canceladas</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('rescheduled')}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 px-1 min-w-fit ${filterStatus === 'rescheduled' ? 'border-primary' : 'border-transparent group hover:border-primary/30 transition-colors'}`}
                  >
                    <span className={`material-symbols-outlined ${filterStatus === 'rescheduled' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>update</span>
                    <span className={`text-sm font-bold ${filterStatus === 'rescheduled' ? 'text-text-main dark:text-white' : 'text-text-secondary group-hover:text-primary dark:text-gray-400'}`}>Reprogramadas</span>
                  </button>
                </div>
              </div>
              {/* Search Bar */}
              <div className="relative group w-full max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
                  placeholder="Buscar por paciente, tipo de cita o teléfono..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              {/* Appointments Table Card */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
                {/* Table Wrapper */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Fecha y Hora
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tipo de Cita
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Médico
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-text-secondary">
                            No se encontraron citas que coincidan con la búsqueda o los filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <tr key={appointment.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{appointment.patient_name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{appointment.phone_number}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700 dark:text-white">{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-slate-700 dark:text-white">{appointment.appointment_type}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-slate-700 dark:text-white">{getDoctorName(appointment.doctor_id)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(appointment.status)}`}>
                                {getStatusText(appointment.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {appointment.status === 'pending' && (
                                  <button
                                    onClick={() => handleConfirmAppointment(appointment.id)}
                                    className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title="Confirmar Cita"
                                  >
                                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                  </button>
                                )}
                                {appointment.status !== 'cancelled' && (
                                  <>
                                    <button
                                      onClick={() => handleRescheduleAppointment(appointment.id)}
                                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                      title="Reprogramar Cita"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
                                    </button>
                                    <button
                                      onClick={() => handleChangeDoctor(appointment.id)}
                                      className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                      title="Cambiar Médico"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                                    </button>
                                    <button
                                      onClick={() => handleCancelAppointment(appointment.id)}
                                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-hover-red-light-bg dark:hover:bg-hover-red-dark-bg rounded-lg transition-colors"
                                      title="Cancelar Cita"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">cancel</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleViewAppointmentDetails(appointment.id)}
                                  className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Ver Detalles"
                                >
                                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Mostrando <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * appointmentsPerPage + 1}-{Math.min(currentPage * appointmentsPerPage, allAppointments.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{allAppointments.length}</span> resultados
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm text-slate-500 bg-white dark:bg-white/10 border border-border-light dark:border-transparent rounded-lg hover:bg-slate-50 dark:hover:bg-white/20 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm text-slate-500 bg-white dark:bg-white/10 border border-border-light dark:border-transparent rounded-lg hover:bg-slate-50 dark:hover:bg-white/20 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
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