import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import DoctorDialog from '@/components/DoctorDialog';
import { getInitials } from '@/lib/utils';
import { Doctor } from '@/types/common'; // Importar Doctor desde el archivo compartido

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
    setEditingDoctor(null);
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
      fetchDoctorsData();
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
      fetchDoctorsData();
    } catch (error: any) {
      console.error('Error toggling doctor status:', error);
      showError('Error al cambiar el estado del médico: ' + error.message);
    }
  };

  const handleSaveDoctor = async (doctorData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>, id?: string) => {
    try {
      if (id) {
        const { error } = await supabase
          .from('doctors')
          .update({
            ...doctorData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        if (error) throw error;
        showSuccess('Médico actualizado correctamente.');
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert({
            ...doctorData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
        showSuccess('Médico agregado correctamente.');
      }
      setIsDialogOpen(false);
      fetchDoctorsData();
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

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  // const userRole = user?.user_metadata?.role || 'Admin'; // Eliminado, no se usa directamente aquí
  const userAvatar = user?.user_metadata?.avatar_url || null;

  const getSpecialtyBadgeClasses = (specialty: string) => {
    switch (specialty) {
      case 'Cardiología':
        return 'bg-badge-blue-light text-badge-blue-light-text dark:bg-badge-blue-dark-bg dark:text-badge-blue-dark-text';
      case 'Pediatría':
        return 'bg-badge-emerald-light text-badge-emerald-light-text dark:bg-badge-emerald-dark-bg dark:text-badge-emerald-dark-text';
      case 'Dermatología':
        return 'bg-badge-purple-light text-badge-purple-light-text dark:bg-badge-purple-dark-bg dark:text-badge-purple-dark-text';
      case 'Neurología':
        return 'bg-badge-amber-light text-badge-amber-light-text dark:bg-badge-amber-dark-bg dark:text-badge-amber-dark-text';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  const renderLoadingState = () => (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-10 w-full md:max-w-md bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="flex items-center gap-3">
          <div className="h-11 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl hidden md:block"></div>
          <div className="h-11 w-full sm:w-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
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
                  </td> {/* FIX: Added closing </td> tag here */}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
            placeholder="Buscar por nombre, especialidad o ID..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-bold border border-transparent hover:border-border-light dark:hover:border-border-dark shadow-sm hover:shadow transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <span>Filtros</span>
          </button>
          <button
            onClick={handleAddDoctor}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Agregar Médico</span>
          </button>
        </div>
      </div>
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-dashed border-border-light dark:border-border-dark p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-4xl">person_off</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay médicos registrados</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Comienza agregando al primer miembro de tu equipo médico.</p>
        <button
          onClick={handleAddDoctor}
          className="mt-5 text-primary font-bold hover:underline text-sm"
        >
          Agregar Médico ahora
        </button>
      </div>
    </div>
  );

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

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main h-screen overflow-hidden flex">
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
              <span className="text-text-main dark:text-primary font-medium">Médicos</span>
            </nav>
            <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Gestión de Médicos</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-primary/10">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-background-light"></span>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {doctorsLoading ? (
            renderLoadingState()
          ) : allDoctors.length === 0 && !searchQuery ? (
            renderEmptyState()
          ) : (
            <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm text-sm transition-all"
                    placeholder="Buscar por nombre, especialidad o ID..."
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
                  <button
                    onClick={handleAddDoctor}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>Agregar Médico</span>
                  </button>
                </div>
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-white/5">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Médico</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Especialidad</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                      {filteredDoctors.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-text-secondary">
                            No se encontraron médicos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredDoctors.map((doctor) => (
                          <tr key={doctor.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {doctor.avatar_url ? (
                                  <img
                                    src={doctor.avatar_url}
                                    alt={doctor.full_name}
                                    className="size-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {getInitials(doctor.full_name)}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white">{doctor.full_name}</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">ID: {doctor.id.substring(0, 8)}...</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSpecialtyBadgeClasses(doctor.specialty)}`}>
                                {doctor.specialty}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doctor.status ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                {doctor.status ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditDoctor(doctor)} className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button onClick={() => handleToggleStatus(doctor)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title={doctor.status ? 'Desactivar' : 'Activar'}>
                                  <span className="material-symbols-outlined text-[20px]">{doctor.status ? 'toggle_on' : 'toggle_off'}</span>
                                </button>
                                <button onClick={() => handleDeleteDoctor(doctor.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-hover-red-light-bg dark:hover:bg-hover-red-dark-bg rounded-lg transition-colors" title="Eliminar">
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
                <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Mostrando <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * doctorsPerPage + 1}-{Math.min(currentPage * doctorsPerPage, allDoctors.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{allDoctors.length}</span> resultados
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
      <DoctorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveDoctor}
        doctor={editingDoctor}
      />
    </div>
  );
};

export default Doctors;