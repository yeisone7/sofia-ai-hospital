import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import DoctorDialog from '@/components/DoctorDialog';
import { getInitials } from '@/lib/utils'; // Importar getInitials

// Interfaces para la estructura de datos esperada
interface Doctor {
  id: string;
  user_id?: string; // Optional, if linked to auth.users
  avatar_url: string | null; // Puede ser null
  full_name: string;
  specialty: string;
  status: boolean; // true for Activo, false for Inactivo
  created_at: string;
  updated_at: string;
}

const Doctors = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const doctorsPerPage = 4;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchDoctorsData();
    }
  }, [user, isSessionLoading, navigate]);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [allDoctors, searchQuery, currentPage]);

  const fetchDoctorsData = async () => {
    setDoctorsLoading(true);
    setDoctorsError(null);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAllDoctors(data as Doctor[]);

    } catch (error: any) {
      console.error('Error fetching doctors data:', error);
      setDoctorsError('No se pudieron cargar los datos de los médicos.');
      showError('Error al cargar los médicos: ' + error.message);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const applyFiltersAndPagination = () => {
    let tempDoctors = [...allDoctors];

    if (searchQuery) {
      tempDoctors = tempDoctors.filter(doctor =>
        doctor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const startIndex = (currentPage - 1) * doctorsPerPage;
    const endIndex = startIndex + doctorsPerPage;
    setFilteredDoctors(tempDoctors.slice(startIndex, endIndex));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
    }
  };

  const handleAddDoctor = () => {
    setEditingDoctor(null); // Clear any previous editing state
    setIsDialogOpen(true);
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsDialogOpen(true);
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este médico?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;

      showSuccess('Médico eliminado correctamente.');
      fetchDoctorsData(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting doctor:', error);
      showError('Error al eliminar el médico: ' + error.message);
    }
  };

  const handleToggleStatus = async (doctor: Doctor) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ status: !doctor.status })
        .eq('id', doctor.id);

      if (error) throw error;

      showSuccess(`Estado de ${doctor.full_name} actualizado a ${!doctor.status ? 'Activo' : 'Inactivo'}.`);
      fetchDoctorsData(); // Refresh the list
    } catch (error: any) {
      console.error('Error toggling doctor status:', error);
      showError('Error al cambiar el estado del médico: ' + error.message);
    }
  };

  const handleSaveDoctor = async (doctorData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>, id?: string) => {
    try {
      if (id) {
        // Update existing doctor
        const { error } = await supabase
          .from('doctors')
          .update({ ...doctorData, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        showSuccess('Médico actualizado correctamente.');
      } else {
        // Add new doctor
        const { error } = await supabase
          .from('doctors')
          .insert({ ...doctorData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (error) throw error;
        showSuccess('Médico agregado correctamente.');
      }
      setIsDialogOpen(false);
      fetchDoctorsData(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      showError('Error al guardar el médico: ' + error.message);
    }
  };

  const totalPages = Math.ceil(allDoctors.length / doctorsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando sesión...</p>
      </div>
    );
  }

  if (doctorsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
          <p className="text-text-main dark:text-white">{doctorsError}</p>
          <button
            onClick={fetchDoctorsData}
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
  const userAvatar = user?.user_metadata?.avatar_url || null; // Ahora puede ser null

  const getSpecialtyBadgeClasses = (specialty: string) => {
    switch (specialty) {
      case 'Cardiología': return 'bg-badge-blue-light text-badge-blue-light-text dark:bg-badge-blue-dark-bg dark:text-badge-blue-dark-text';
      case 'Pediatría': return 'bg-badge-emerald-light text-badge-emerald-light-text dark:bg-badge-emerald-dark-bg dark:text-badge-emerald-dark-text';
      case 'Dermatología': return 'bg-badge-purple-light text-badge-purple-light-text dark:bg-badge-purple-dark-bg dark:text-badge-purple-dark-text';
      case 'Neurología': return 'bg-badge-amber-light text-badge-amber-light-text dark:bg-badge-amber-dark-bg dark:text-badge-amber-dark-text';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
    }
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
      {/* Doctors Table Skeleton */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {[...Array(doctorsPerPage)].map((_, i) => (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
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
          <input className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all" placeholder="Buscar por nombre, especialidad o ID..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-bold border border-transparent hover:border-border-light dark:hover:border-border-dark shadow-sm hover:shadow transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <span>Filtros</span>
          </button>
          <button onClick={handleAddDoctor} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Agregar Médico</span>
          </button>
        </div>
      </div>
      {/* Empty State Content */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-dashed border-border-light dark:border-border-dark p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-slate-400 text-4xl">person_off</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay médicos registrados</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Comienza agregando al primer miembro de tu equipo médico.</p>
        <button onClick={handleAddDoctor} className="mt-5 text-primary font-bold hover:underline text-sm">Agregar Médico ahora</button>
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
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {appointmentsLoading ? (
            renderLoadingState()
          ) : filteredAppointments.length === 0 && !searchQuery ? (
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
              {/* Appointments Overview / Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Citas */}
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-[#e7f3f2] dark:border-[#2a3c3b] shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#e7f3f2] dark:bg-white/5 rounded-lg text-text-main dark:text-white">
                      <span className="material-symbols-outlined">event</span>
                    </div>
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
                  {filteredAppointments.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary">No hay citas que coincidan con los filtros.</div>
                  ) : (
                    filteredAppointments.map((appointment) => (
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
                    ))
                  )}
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