import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils';

interface Appointment {
  id: string;
  user_id: string;
  phone_number: string;
  patient_name: string;
  appointment_date: string;
  appointment_type: string;
  doctor_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  reminder_sent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

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

  const handleRescheduleAppointment = async (appointmentId: string) => {
    // In a real implementation, this would open a modal to select a new date/time
    showSuccess('Funcionalidad de reprogramación en desarrollo.');
  };

  const handleChangeDoctor = async (appointmentId: string) => {
    // In a real implementation, this would open a modal to select a new doctor
    showSuccess('Funcionalidad de cambio de médico en desarrollo.');
  };

  const handleViewAppointmentDetails = (appointmentId: string) => {
    showSuccess(`Ver detalles de la cita ${appointmentId} en desarrollo.`);
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
  const userRole = user?.user_metadata?.role || 'Admin';
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
};

export default Appointments;