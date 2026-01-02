import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_type: string;
  status: string;
  doctor_id: string;
  created_at: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
}

interface ReportData {
  appointmentsByDay: { date: string; count: number }[];
  appointmentsByStatus: { name: string; value: number }[];
  appointmentsByDoctor: { name: string; value: number }[];
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
}

const Reports = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchDoctors();
      fetchReportData();
    }
  }, [user, isSessionLoading, navigate, dateRange]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, full_name, specialty')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      showError('Error al cargar los médicos: ' + error.message);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch appointments within date range
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .gte('appointment_date', new Date(dateRange.start).toISOString())
        .lte('appointment_date', new Date(new Date(dateRange.end).setDate(new Date(dateRange.end).getDate() + 1)).toISOString())
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Process data for charts
      const appointmentsByDay: { [key: string]: number } = {};
      const appointmentsByStatus: { [key: string]: number } = {};
      const appointmentsByDoctor: { [key: string]: number } = {};

      appointments?.forEach(appointment => {
        // Group by day
        const date = new Date(appointment.appointment_date).toLocaleDateString();
        appointmentsByDay[date] = (appointmentsByDay[date] || 0) + 1;

        // Group by status
        appointmentsByStatus[appointment.status] = (appointmentsByStatus[appointment.status] || 0) + 1;

        // Group by doctor
        const doctor = doctors.find(d => d.id === appointment.doctor_id);
        const doctorName = doctor ? doctor.full_name : 'Sin asignar';
        appointmentsByDoctor[doctorName] = (appointmentsByDoctor[doctorName] || 0) + 1;
      });

      // Format data for charts
      const formattedAppointmentsByDay = Object.entries(appointmentsByDay).map(([date, count]) => ({
        date,
        count
      }));

      const formattedAppointmentsByStatus = Object.entries(appointmentsByStatus).map(([name, value]) => ({
        name: name === 'confirmed' ? 'Confirmadas' : name === 'pending' ? 'Pendientes' : 'Canceladas',
        value
      }));

      const formattedAppointmentsByDoctor = Object.entries(appointmentsByDoctor).map(([name, value]) => ({
        name,
        value
      }));

      // Calculate totals
      const totalAppointments = appointments?.length || 0;
      const confirmedAppointments = appointmentsByStatus['confirmed'] || 0;
      const pendingAppointments = appointmentsByStatus['pending'] || 0;
      const cancelledAppointments = appointmentsByStatus['cancelled'] || 0;

      setReportData({
        appointmentsByDay: formattedAppointmentsByDay,
        appointmentsByStatus: formattedAppointmentsByStatus,
        appointmentsByDoctor: formattedAppointmentsByDoctor,
        totalAppointments,
        confirmedAppointments,
        pendingAppointments,
        cancelledAppointments
      });
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      setError('Error al cargar los datos del reporte: ' + error.message);
      showError('Error al cargar los datos del reporte: ' + error.message);
    } finally {
      setLoading(false);
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

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    setDateRange(prev => ({
      ...prev,
      [type]: e.target.value
    }));
  };

  const COLORS = ['#13ecda', '#4e9791', '#25bdb1', '#0e1b1a', '#1a2c2b'];

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando...</p>
      </div>
    );
  }

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const userRole = user?.user_metadata?.role || 'Admin';
  const userAvatar = user?.user_metadata?.avatar_url || null;

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main h-screen overflow-hidden flex">
      {/* Side Navigation Bar */}
      <aside className="w-72 bg-surface-light dark:bg-surface-dark border-r border-[#e7f3f2] dark:border-[#2a3c3b] flex flex-col hidden md:flex flex-shrink-0 transition-all z-20">
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
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/dashboard' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/dashboard"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/dashboard' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>dashboard</span>
            <p className={`text-sm font-semibold ${location.pathname === '/dashboard' ? 'text-text-main dark:text-white' : ''}`}>Dashboard</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/messages' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/messages"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/messages' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>chat</span>
            <p className={`text-sm font-medium ${location.pathname === '/messages' ? 'text-text-main dark:text-white' : ''}`}>Mensajes</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/patients' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/patients"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/patients' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>groups</span>
            <p className={`text-sm font-medium ${location.pathname === '/patients' ? 'text-text-main dark:text-white' : ''}`}>Pacientes</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/appointments' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/appointments"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/appointments' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>calendar_month</span>
            <p className={`text-sm font-medium ${location.pathname === '/appointments' ? 'text-text-main dark:text-white' : ''}`}>Citas</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/doctors' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/doctors"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/doctors' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>stethoscope</span>
            <p className={`text-sm font-medium ${location.pathname === '/doctors' ? 'text-text-main dark:text-white' : ''}`}>Médicos</p>
          </Link>
          {isAdmin && (
            <Link
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/users' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
              to="/users"
            >
              <span className={`material-symbols-outlined ${location.pathname === '/users' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>group</span>
              <p className={`text-sm font-medium ${location.pathname === '/users' ? 'text-text-main dark:text-white' : ''}`}>Usuarios</p>
            </Link>
          )}
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/reports' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/reports"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/reports' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>analytics</span>
            <p className={`text-sm font-medium ${location.pathname === '/reports' ? 'text-text-main dark:text-white' : ''}`}>Reportes</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/settings' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
            to="/settings"
          >
            <span className={`material-symbols-outlined ${location.pathname === '/settings' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>settings</span>
            <p className={`text-sm font-medium ${location.pathname === '/settings' ? 'text-text-main dark:text-white' : ''}`}>Configuración</p>
          </Link>
          <div className="mt-auto pt-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b]">
            <Link
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === '/help' ? 'bg-[#e7f3f2] dark:bg-primary/10' : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'}`}
              to="/help"
            >
              <span className={`material-symbols-outlined ${location.pathname === '/help' ? 'text-text-main dark:text-primary' : 'group-hover:text-text-main dark:group-hover:text-white'} transition-colors`}>help_outline</span>
              <p className={`text-sm font-medium ${location.pathname === '/help' ? 'text-text-main dark:text-white' : ''}`}>Ayuda</p>
            </Link>
          </div>
        </nav>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
        {/* Top Header */}
        <header className="h-20 bg-surface-light dark:bg-surface-dark border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-text-main hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden sm:flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary-dark">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight">Reportes</h2>
              <p className="text-text-secondary text-xs hidden sm:block">Estadísticas y análisis de citas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <button className="relative p-2 text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-primary/10">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-surface-light"></span>
            </button>
            <Link
              to="/help"
              className="flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-[#e7f3f2] dark:border-[#2a3c3b] rounded-lg px-3 py-2 text-sm font-medium text-text-main dark:text-white hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">help</span>
              <span>Ayuda</span>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-text-main dark:text-white mb-2">Reportes de Citas</h1>
              <p className="text-text-secondary">Analiza el desempeño de tu clínica con estadísticas detalladas</p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 mb-8 border border-border-light dark:border-border-dark">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-bold text-text-main dark:text-white">Filtrar por rango de fechas</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-text-secondary">Desde:</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange(e, 'start')}
                      className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-text-main dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-text-secondary">Hasta:</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange(e, 'end')}
                      className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-text-main dark:text-white"
                    />
                  </div>
                  <button
                    onClick={fetchReportData}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-text-main font-medium rounded-lg transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p>{error}</p>
                <button
                  onClick={fetchReportData}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            ) : reportData ? (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between">
                      <h3 className="text-text-secondary text-sm font-medium">Total Citas</h3>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <span className="material-symbols-outlined text-primary">event</span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-text-main dark:text-white mt-2">
                      {reportData.totalAppointments}
                    </p>
                  </div>

                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between">
                      <h3 className="text-text-secondary text-sm font-medium">Confirmadas</h3>
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-text-main dark:text-white mt-2">
                      {reportData.confirmedAppointments}
                    </p>
                  </div>

                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between">
                      <h3 className="text-text-secondary text-sm font-medium">Pendientes</h3>
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">pending</span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-text-main dark:text-white mt-2">
                      {reportData.pendingAppointments}
                    </p>
                  </div>

                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between">
                      <h3 className="text-text-secondary text-sm font-medium">Canceladas</h3>
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-text-main dark:text-white mt-2">
                      {reportData.cancelledAppointments}
                    </p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Appointments by Day */}
                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Citas por Día</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.appointmentsByDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e7f3f2" />
                          <XAxis dataKey="date" stroke="#4e9791" />
                          <YAxis stroke="#4e9791" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#f8fcfb',
                              borderColor: '#e7f3f2',
                              borderRadius: '0.5rem'
                            }}
                          />
                          <Bar dataKey="count" fill="#13ecda" name="Citas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Appointments by Status */}
                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Citas por Estado</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.appointmentsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {reportData.appointmentsByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#f8fcfb',
                              borderColor: '#e7f3f2',
                              borderRadius: '0.5rem'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Appointments by Doctor */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                  <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Citas por Médico</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.appointmentsByDoctor}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7f3f2" />
                        <XAxis dataKey="name" stroke="#4e9791" />
                        <YAxis stroke="#4e9791" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#f8fcfb',
                            borderColor: '#e7f3f2',
                            borderRadius: '0.5rem'
                          }}
                        />
                        <Bar dataKey="value" fill="#25bdb1" name="Citas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;