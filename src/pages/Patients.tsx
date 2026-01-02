import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils'; // Reintroducido

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  created_at: string;
}

const Patients = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 5;

  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchPatientsData();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [allPatients, searchQuery, currentPage]);

  const fetchPatientsData = async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user?.id) // Filter by current user's ID
        .order('last_name', { ascending: true });

      if (error) throw error;
      setAllPatients(data as Patient[]);

    } catch (error: any) {
      console.error('Error fetching patients data:', error);
      setPatientsError('No se pudieron cargar los datos de los pacientes.');
      showError('Error al cargar los pacientes: ' + error.message);
    } finally {
      setPatientsLoading(false);
    }
  };

  const applyFiltersAndPagination = () => {
    let tempPatients = [...allPatients];

    if (searchQuery) {
      tempPatients = tempPatients.filter(patient =>
        patient.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const startIndex = (currentPage - 1) * patientsPerPage;
    const endIndex = startIndex + patientsPerPage;
    setFilteredPatients(tempPatients.slice(startIndex, endIndex));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
    }
  };

  const handleAddPatient = () => {
    showSuccess('Funcionalidad "Agregar Paciente" en desarrollo.');
    // navigate('/patients/new'); // Example for a dedicated add page
  };

  const handleEditPatient = (patientId: string) => {
    showSuccess(`Editar paciente ${patientId} en desarrollo.`);
    // navigate(`/patients/edit/${patientId}`); // Example for a dedicated edit page
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este paciente?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      showSuccess('Paciente eliminado correctamente.');
      fetchPatientsData(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      showError('Error al eliminar el paciente: ' + error.message);
    }
  };

  const totalPages = Math.ceil(allPatients.length / patientsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const renderLoadingState = () => (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4 animate-pulse">
      {/* Action Bar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-10 w-full md:max-w-md bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="flex items-center gap-3">
          <div className="h-11 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl hidden md:block"></div>
          <div className="h-11 w-full sm:w-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
      {/* Patients Table Skeleton */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {[...Array(patientsPerPage)].map((_, i) => (
                <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="size-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      <div className="size-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Skeleton */}
        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all" placeholder="Buscar por nombre, email o teléfono..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-bold border border-transparent hover:border-border-light dark:hover:border-border-dark shadow-sm hover:shadow transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <span>Filtros</span>
          </button>
          <button onClick={handleAddPatient} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Agregar Paciente</span>
          </button>
        </div>
      </div>
      {/* Empty State Content */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-dashed border-border-light dark:border-border-dark p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-slate-400 text-4xl">person_add</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay pacientes registrados</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Comienza agregando a tu primer paciente.</p>
        <button onClick={handleAddPatient} className="mt-5 text-primary font-bold hover:underline text-sm">Agregar Paciente ahora</button>
      </div>
    </div>
  );

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const userRole = user?.user_metadata?.role || 'Admin';
  const userAvatar = user?.user_metadata?.avatar_url || null;

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
              <span className="text-text-main dark:text-primary font-medium">Pacientes</span>
            </nav>
            <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Pacientes</h2>
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
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-10">
          {patientsLoading ? (
            renderLoadingState()
          ) : allPatients.length === 0 && !searchQuery ? (
            renderEmptyState()
          ) : (
            <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4">
              {/* Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
                    placeholder="Buscar por nombre, email o teléfono..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-bold border border-transparent hover:border-border-light dark:hover:border-border-dark shadow-sm hover:shadow transition-all">
                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                    <span>Filtros</span>
                  </button>
                  <button onClick={handleAddPatient} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>Agregar Paciente</span>
                  </button>
                </div>
              </div>
              {/* Patients Table Card */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
                {/* Table Wrapper */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Nombre Completo
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Contacto
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Fecha de Nacimiento
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-text-secondary">
                            No se encontraron pacientes que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((patient) => (
                          <tr key={patient.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{patient.first_name} {patient.last_name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">ID: {patient.id.substring(0, 8)}...</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700 dark:text-white">{patient.email}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{patient.phone}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-slate-700 dark:text-white">{patient.date_of_birth}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditPatient(patient.id)} className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button onClick={() => handleDeletePatient(patient.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-hover-red-light-bg dark:hover:bg-hover-red-dark-bg rounded-lg transition-colors" title="Eliminar">
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
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
                    Mostrando <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * patientsPerPage + 1}-{Math.min(currentPage * patientsPerPage, allPatients.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{allPatients.length}</span> resultados
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

export default Patients;