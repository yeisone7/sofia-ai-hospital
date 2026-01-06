import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { showError } from '@/utils/toast';
import { Appointment } from '@/types/common';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import CalendarView from '@/components/appointments/CalendarView';
import { Calendar, List, Plus, Search, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';



const Appointments = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);

  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [doctors, setDoctors] = useState<any[]>([]);

  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchAppointmentsData();
      fetchDoctors();
    }
  }, [user, isSessionLoading, navigate, isAdmin]);

  const fetchDoctors = async () => {
    const { data } = await supabase.from('doctors').select('id, full_name');
    if (data) setDoctors(data);
  };

  useEffect(() => {
    applyFilters();
  }, [allAppointments, filterStatus, searchQuery, currentPage]);



  const fetchAppointmentsData = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      let query = supabase
        .from('appointments')
        .select('*');

      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query.order('appointment_date', { ascending: false });

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

  const handleConfirmAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id);
      if (error) throw error;
      fetchAppointmentsData();
    } catch (err: any) {
      showError('No se pudo confirmar la cita: ' + err.message);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      fetchAppointmentsData();
    } catch (err: any) {
      showError('No se pudo cancelar la cita: ' + err.message);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(allAppointments.length / appointmentsPerPage);
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

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

  // user context

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
      case 'completed':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
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
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };



  // Sub-components moved to local helpers or logic

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <nav className="flex text-sm text-text-secondary">
          <Link className="hover:text-text-main dark:hover:text-white cursor-pointer" to="/dashboard">Panel</Link>
          <span className="mx-2">/</span>
          <span className="text-text-main dark:text-primary font-medium">Citas</span>
        </nav>
        <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Citas</h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Todas', icon: List, color: 'bg-slate-400' },
            { id: 'pending', label: 'Pendiente', icon: Clock, color: 'bg-orange-500' },
            { id: 'confirmed', label: 'Confirmada', icon: CheckCircle2, color: 'bg-green-500' },
            { id: 'cancelled', label: 'Cancelada', icon: XCircle, color: 'bg-red-500' },
            { id: 'rescheduled', label: 'Reprogramada', icon: RotateCcw, color: 'bg-blue-500' }
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterStatus === status.id
                ? 'bg-primary text-text-main shadow-md ring-2 ring-primary/20 scale-105'
                : 'bg-white dark:bg-surface-dark text-text-secondary border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
            >
              <status.icon className={`size-4 ${filterStatus === status.id ? 'text-text-main' : status.id === 'all' ? 'text-slate-400' : status.color.replace('bg-', 'text-')}`} />
              {status.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-1 rounded-xl flex">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-primary-dark' : 'text-text-secondary hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <List className="size-5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-primary/20 text-primary-dark' : 'text-text-secondary hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <Calendar className="size-5" />
              </button>
            </div>
            <button
              onClick={() => setNewAppointmentOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-text-main font-bold px-5 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Plus className="size-5" />
              <span>Nueva Cita</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="relative group w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                className="block w-full pl-10 pr-3 py-2 border-none rounded-xl bg-surface-light dark:bg-surface-dark text-text-main dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all border border-border-light dark:border-border-dark"
                placeholder="Buscar por paciente, tipo o teléfono..."
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha y Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Médico</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                      No se encontraron citas con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-text-main dark:text-white">{appointment.patient_name}</span>
                          <span className="text-xs text-text-secondary">{appointment.phone_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm">
                          <span className="text-text-main dark:text-white capitalize">{new Date(appointment.appointment_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className="text-text-secondary">{new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-main dark:text-white">
                        {appointment.appointment_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-main dark:text-white">
                        {doctors.find(d => d.id === appointment.doctor_id)?.full_name || 'Sin asignar'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {appointment.status === 'pending' && (
                            <button
                              onClick={() => handleConfirmAppointment(appointment.id)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Confirmar Cita"
                            >
                              <CheckCircle2 className="size-5" />
                            </button>
                          )}
                          <button
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Reprogramar"
                          >
                            <Calendar className="size-5" />
                          </button>
                          {appointment.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <XCircle className="size-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <p className="text-sm text-text-secondary">
              Mostrando <span className="font-bold text-text-main dark:text-white">{(currentPage - 1) * appointmentsPerPage + 1}-{Math.min(currentPage * appointmentsPerPage, allAppointments.length)}</span> de <span className="font-bold text-text-main dark:text-white">{allAppointments.length}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-white/5 border border-border-light dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-white/5 border border-border-light dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      ) : (
        <CalendarView
          appointments={allAppointments}
          onSelectDate={() => { }}
        />
      )}

      <NewAppointmentDialog
        open={newAppointmentOpen}
        onOpenChange={setNewAppointmentOpen}
        onSuccess={fetchAppointmentsData}
      />
    </div>
  );
};

export default Appointments;