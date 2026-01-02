import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils'; // Importar getInitials

// Interfaces para la estructura de datos esperada
interface ClinicInfo {
  name: string;
  specialty: string;
  description: string;
  logoUrl: string;
}

interface OperatingDayHours {
  open: boolean;
  startTime: string;
  endTime: string;
}

interface OperatingHours {
  timezone: string;
  weekdays: OperatingDayHours;
  saturday: OperatingDayHours;
  sunday: OperatingDayHours;
}

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
}

interface Service {
  id: string;
  name: string;
}

interface ClinicSettingsData {
  clinicInfo: ClinicInfo;
  contactInfo: ContactInfo;
  operatingHours: OperatingHours;
  services: Service[];
  whatsappWebhookUrl: string;
}

const Settings = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState<ClinicSettingsData>({
    clinicInfo: {
      name: '',
      specialty: '',
      description: '',
      logoUrl: '',
    },
    contactInfo: {
      address: '',
      phone: '',
      email: '',
    },
    operatingHours: {
      timezone: 'America/Mexico_City',
      weekdays: { open: true, startTime: '09:00', endTime: '18:00' },
      saturday: { open: true, startTime: '09:00', endTime: '14:00' },
      sunday: { open: false, startTime: '09:00', endTime: '14:00' },
    },
    services: [],
    whatsappWebhookUrl: 'https://api.laura.ai/v1/hooks/wa/cli_892301', // Placeholder
  });

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const isAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchSettingsData();
    }
  }, [user, isSessionLoading, navigate]);

  const fetchSettingsData = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      // TODO: Fetch clinic settings from Supabase
      // Example: const { data, error } = await supabase.from('clinic_settings').select('*').single();
      // if (error) throw error;
      // setSettings(data);

      // Placeholder data
      setSettings({
        clinicInfo: {
          name: 'Centro Médico Vida Sana',
          specialty: 'Medicina General',
          description: 'Centro médico comprometido con la salud integral de las familias, ofreciendo atención personalizada y tecnología de vanguardia.',
          logoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqTjqYS7bZF9UDf3Gqf4OzV3l-OK2I74o8hTRUjco_eiyyacb9QNClEqJ5OvwomIFmzJ-SwRcDNrVuYGA8ktqIowJgZqQ9vkuqJmauVmspaoDbTHcm7tZjodbPumN6sgBGxYNWX9ELn2NmPHEYJmmQ',
        },
        contactInfo: {
          address: 'Av. Reforma 222, Piso 4, Ciudad de México',
          phone: '+52 55 1234 5678',
          email: 'contacto@vidasana.mx',
        },
        operatingHours: {
          timezone: 'America/Mexico_City',
          weekdays: { open: true, startTime: '09:00', endTime: '18:00' },
          saturday: { open: true, startTime: '09:00', endTime: '14:00' },
          sunday: { open: false, startTime: '09:00', endTime: '14:00' },
        },
        services: [
          { id: 's1', name: 'Medicina General' },
          { id: 's2', name: 'Pediatría' },
          { id: 's3', name: 'Ginecología' },
        ],
        whatsappWebhookUrl: 'https://api.laura.ai/v1/hooks/wa/cli_892301',
      });
    } catch (error: any) {
      console.error('Error fetching settings data:', error);
      setSettingsError('No se pudieron cargar los ajustes de la clínica.');
      showError('Error al cargar ajustes: ' + error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSettingsError(null);
    try {
      // TODO: Upload logo to Supabase Storage if changed
      // Example: if (logoFile) { const { data, error } = await supabase.storage.from('logos').upload(...); }

      // TODO: Update clinic settings in Supabase
      // Example: const { error } = await supabase.from('clinic_settings').update(settings).eq('id', user.id);
      // if (error) throw error;

      showSuccess('Ajustes guardados correctamente.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setSettingsError('Error al guardar los ajustes: ' + error.message);
      showError('Error al guardar ajustes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Revert to initial state or refetch data
    fetchSettingsData();
    showSuccess('Cambios cancelados.');
  };

  // Handler para campos de texto/textarea/select dentro de objetos anidados (clinicInfo, contactInfo)
  const handleNestedObjectInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section: 'clinicInfo' | 'contactInfo', // Restringido a secciones que son objetos
    field: string
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section], // Ahora prev[section] está garantizado de ser un objeto
        [field]: e.target.value,
      },
    }));
  };

  // Handler específico para el campo timezone dentro de operatingHours
  const handleOperatingHoursTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        timezone: e.target.value,
      },
    }));
  };

  // Handler para el toggle de apertura/cierre de días
  const handleOperatingHoursToggle = (
    day: 'weekdays' | 'saturday' | 'sunday', // Restringido a días que son objetos
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day], // Ahora prev.operatingHours[day] está garantizado de ser un objeto
          open: value,
        },
      },
    }));
  };

  // Handler para los cambios de hora de inicio/fin de días
  const handleOperatingHoursTimeChange = (
    day: 'weekdays' | 'saturday' | 'sunday', // Restringido a días que son objetos
    timeType: 'startTime' | 'endTime',
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day], // Ahora prev.operatingHours[day] está garantizado de ser un objeto
          [timeType]: value,
        },
      },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      // Optionally, show a preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({
          ...prev,
          clinicInfo: {
            ...prev.clinicInfo,
            logoUrl: reader.result as string,
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (newServiceInput.trim() && !settings.services.some(s => s.name.toLowerCase() === newServiceInput.trim().toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        services: [...prev.services, { id: `s${Date.now()}`, name: newServiceInput.trim() }],
      }));
      setNewServiceInput('');
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== serviceId),
    }));
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(settings.whatsappWebhookUrl);
      showSuccess('URL del Webhook copiada al portapapeles.');
    } catch (err) {
      showError('Error al copiar la URL.');
      console.error('Failed to copy: ', err);
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

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const userRole = user?.user_metadata?.role || 'Admin';
  const userAvatar = user?.user_metadata?.avatar_url || null; // Ahora puede ser null

  const renderLoadingState = () => (
    <div className="max-w-[1000px] mx-auto w-full px-6 py-8 md:px-12 md:py-10 pb-24 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="mb-8 md:mb-10">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>

      {/* Form Sections Skeleton */}
      {[...Array(4)].map((_, sectionIndex) => (
        <div key={sectionIndex} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800 mb-8">
          <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
            <div className="p-2 bg-primary/10 rounded-lg size-8"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {sectionIndex === 0 && ( // Basic Info section
              <div className="md:col-span-3 flex flex-col gap-3 items-center md:items-start">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
            )}
            <div className={`${sectionIndex === 0 ? 'md:col-span-9' : 'md:col-span-12'} flex flex-col gap-5`}>
              {[...Array(sectionIndex === 0 ? 3 : sectionIndex === 1 ? 3 : sectionIndex === 2 ? 4 : 2)].map((_, fieldIndex) => (
                <div key={fieldIndex} className="flex flex-col gap-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (settingsLoading) {
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
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2"></div>
            <div className="h-10 bg-primary/10 dark:bg-primary/20 rounded-xl mb-2"></div> {/* Active state for settings */}
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2"></div>
          </nav>
          <div className="p-4 border-t border-[#e7f3f2] dark:border-[#2a3c3b]">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </aside>
        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
          {/* Top Header Skeleton */}
          <header className="h-20 bg-surface-light dark:bg-surface-dark border-b border-[#e7f3f2] dark:border-[#2a3c3b] flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex flex-col gap-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </header>
          {renderLoadingState()}
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
          <p className="text-text-main dark:text-white">{settingsError}</p>
          <button
            onClick={fetchSettingsData}
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
              <span className="text-text-main dark:text-primary font-medium">Configuración</span>
            </nav>
            <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Ajustes de Clínica</h2>
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
          <div className="max-w-[1000px] mx-auto w-full px-6 py-8 md:px-12 md:py-10 pb-24">
            {/* Page Header */}
            <div className="mb-8 md:mb-10">
              <div className="flex flex-col gap-2">
                <h1 className="text-text-main dark:text-white text-3xl md:text-4xl font-extrabold tracking-tight">Ajustes de Clínica</h1>
                <p className="text-text-secondary dark:text-gray-400 text-base md:text-lg">Gestiona la información pública y operativa de tu centro médico.</p>
              </div>
            </div>
            {/* Form Container */}
            <form id="settings-form" className="flex flex-col gap-8" onSubmit={handleSaveSettings}>
              {/* Section: Basic Info */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary-dark dark:text-primary">
                    <span className="material-symbols-outlined">id_card</span>
                  </div>
                  <h2 className="text-lg font-bold text-text-main dark:text-white">Información Básica</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Logo Upload */}
                  <div className="md:col-span-3 flex flex-col gap-3 items-center md:items-start">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Logo de la Clínica</span>
                    <label className="relative group w-32 h-32 rounded-full bg-background-light dark:bg-slate-800 border-2 border-dashed border-border-color dark:border-slate-600 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-primary">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-40"
                        style={{ backgroundImage: `url('${settings.clinicInfo.logoUrl}')` }}
                        aria-label="Default clinic logo placeholder with medical cross icon"
                      ></div>
                      <div className="z-10 flex flex-col items-center text-text-secondary group-hover:text-primary-dark transition-colors">
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <span className="text-xs font-medium mt-1">Cambiar</span>
                      </div>
                      <input className="hidden" type="file" onChange={handleLogoUpload} accept="image/*" />
                    </label>
                  </div>
                  {/* Fields */}
                  <div className="md:col-span-9 flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-text-main dark:text-gray-300">Nombre de la clínica</span>
                        <input
                          className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                          placeholder="Ej. Clínica Salud Total"
                          type="text"
                          value={settings.clinicInfo.name}
                          onChange={(e) => handleNestedObjectInputChange(e, 'clinicInfo', 'name')}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-text-main dark:text-gray-300">Especialidad Principal</span>
                        <input
                          className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                          placeholder="Ej. Pediatría, Odontología"
                          type="text"
                          value={settings.clinicInfo.specialty}
                          onChange={(e) => handleNestedObjectInputChange(e, 'clinicInfo', 'specialty')}
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-text-main dark:text-gray-300">Descripción</span>
                      <textarea
                        className="w-full min-h-[100px] p-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60 resize-y"
                        placeholder="Describe brevemente los servicios y valores de tu clínica..."
                        value={settings.clinicInfo.description}
                        onChange={(e) => handleNestedObjectInputChange(e, 'clinicInfo', 'description')}
                      ></textarea>
                    </label>
                  </div>
                </div>
              </div>
              {/* Section: Contact */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary-dark dark:text-primary">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <h2 className="text-lg font-bold text-text-main dark:text-white">Contacto y Ubicación</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Dirección Física</span>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">map</span>
                      <input
                        className="w-full h-12 pl-12 pr-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                        type="text"
                        value={settings.contactInfo.address}
                        onChange={(e) => handleNestedObjectInputChange(e, 'contactInfo', 'address')}
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Teléfono de Contacto</span>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">call</span>
                      <input
                        className="w-full h-12 pl-12 pr-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                        type="tel"
                        value={settings.contactInfo.phone}
                        onChange={(e) => handleNestedObjectInputChange(e, 'contactInfo', 'phone')}
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Correo Electrónico</span>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">mail</span>
                      <input
                        className="w-full h-12 pl-12 pr-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                        type="email"
                        value={settings.contactInfo.email}
                        onChange={(e) => handleNestedObjectInputChange(e, 'contactInfo', 'email')}
                      />
                    </div>
                  </label>
                </div>
              </div>
              {/* Section: Operations */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary-dark dark:text-primary">
                    <span className="material-symbols-outlined">schedule</span>
                  </div>
                  <h2 className="text-lg font-bold text-text-main dark:text-white">Operativa y Horarios</h2>
                </div>
                <div className="flex flex-col gap-6">
                  <label className="flex flex-col gap-2 max-w-md">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Zona Horaria</span>
                    <div className="relative">
                      <select
                        className="w-full h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow appearance-none"
                        value={settings.operatingHours.timezone}
                        onChange={handleOperatingHoursTimezoneChange} // Usar el nuevo handler específico
                      >
                        <option value="America/Mexico_City">(GMT-6) Ciudad de México</option>
                        <option value="America/Bogota">(GMT-5) Bogotá</option>
                        <option value="America/Buenos_Aires">(GMT-3) Buenos Aires</option>
                        <option value="Europe/Madrid">(GMT+1) Madrid</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">expand_more</span>
                    </div>
                  </label>
                  <div className="flex flex-col gap-4">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Horarios de Atención</span>
                    {/* Schedule Row: Weekdays */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-background-light dark:bg-slate-900/50 border border-border-color/50 dark:border-slate-800">
                      <div className="w-40 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium text-text-main dark:text-white">Lunes a Viernes</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          className="h-10 px-3 rounded-md border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          type="time"
                          value={settings.operatingHours.weekdays.startTime}
                          onChange={(e) => handleOperatingHoursTimeChange('weekdays', 'startTime', e.target.value)}
                          disabled={!settings.operatingHours.weekdays.open}
                        />
                        <span className="text-text-secondary">-</span>
                        <input
                          className="h-10 px-3 rounded-md border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          type="time"
                          value={settings.operatingHours.weekdays.endTime}
                          onChange={(e) => handleOperatingHoursTimeChange('weekdays', 'endTime', e.target.value)}
                          disabled={!settings.operatingHours.weekdays.open}
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.operatingHours.weekdays.open}
                            onChange={(e) => handleOperatingHoursToggle('weekdays', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          <span className="ml-2 text-sm text-text-secondary dark:text-gray-400">{settings.operatingHours.weekdays.open ? 'Abierto' : 'Cerrado'}</span>
                        </label>
                      </div>
                    </div>
                    {/* Schedule Row: Saturday */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-background-light dark:bg-slate-900/50 border border-border-color/50 dark:border-slate-800">
                      <div className="w-40 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="font-medium text-text-main dark:text-white">Sábados</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          className="h-10 px-3 rounded-md border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          type="time"
                          value={settings.operatingHours.saturday.startTime}
                          onChange={(e) => handleOperatingHoursTimeChange('saturday', 'startTime', e.target.value)}
                          disabled={!settings.operatingHours.saturday.open}
                        />
                        <span className="text-text-secondary">-</span>
                        <input
                          className="h-10 px-3 rounded-md border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          type="time"
                          value={settings.operatingHours.saturday.endTime}
                          onChange={(e) => handleOperatingHoursTimeChange('saturday', 'endTime', e.target.value)}
                          disabled={!settings.operatingHours.saturday.open}
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.operatingHours.saturday.open}
                            onChange={(e) => handleOperatingHoursToggle('saturday', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          <span className="ml-2 text-sm text-text-secondary dark:text-gray-400">{settings.operatingHours.saturday.open ? 'Abierto' : 'Cerrado'}</span>
                        </label>
                      </div>
                    </div>
                    {/* Schedule Row: Sunday */}
                    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-background-light dark:bg-slate-900/50 border border-border-color/50 dark:border-slate-800 ${!settings.operatingHours.sunday.open ? 'opacity-60' : ''}`}>
                      <div className="w-40 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${settings.operatingHours.sunday.open ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="font-medium text-text-main dark:text-white">Domingos</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          className="h-10 px-3 rounded-md border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          type="time"
                          value={settings.operatingHours.sunday.startTime}
                          onChange={(e) => handleOperatingHoursTimeChange('sunday', 'startTime', e.target.value)}
                          disabled={!settings.operatingHours.sunday.open}
                        />
                        <span className="text-text-secondary">-</span>
                        <input
                          className="h-10 px-3 rounded-md border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          type="time"
                          value={settings.operatingHours.sunday.endTime}
                          onChange={(e) => handleOperatingHoursTimeChange('sunday', 'endTime', e.target.value)}
                          disabled={!settings.operatingHours.sunday.open}
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.operatingHours.sunday.open}
                            onChange={(e) => handleOperatingHoursToggle('sunday', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          <span className="ml-2 text-sm text-text-secondary dark:text-gray-400">{settings.operatingHours.sunday.open ? 'Abierto' : 'Cerrado'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Section: Services */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary-dark dark:text-primary">
                    <span className="material-symbols-outlined">medical_services</span>
                  </div>
                  <h2 className="text-lg font-bold text-text-main dark:text-white">Servicios Ofrecidos</h2>
                </div>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Selecciona las especialidades para habilitar en el asistente</span>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-background-light dark:bg-slate-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow placeholder:text-text-secondary/60"
                        placeholder="Escribe un servicio (ej. Nutrición)"
                        type="text"
                        value={newServiceInput}
                        onChange={(e) => setNewServiceInput(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="h-12 px-6 rounded-lg bg-text-main dark:bg-slate-700 text-white font-medium hover:bg-opacity-90 transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  </label>
                  {/* Tags Container */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.services.map((service) => (
                      <div key={service.id} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-primary/20 dark:bg-primary/10 border border-primary/30 rounded-full">
                        <span className="text-sm font-semibold text-primary-dark dark:text-primary">{service.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(service.id)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-primary/20 text-primary-dark dark:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                    {/* Example of an inactive service tag */}
                    {/* <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-background-light dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-full border-dashed">
                      <span className="text-sm font-medium text-text-secondary">Laboratorio</span>
                      <button className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-text-secondary transition-colors">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div> */}
                  </div>
                </div>
              </div>
              {/* Section: Integration */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-color/50 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-border-color/50 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary-dark dark:text-primary">
                    <span className="material-symbols-outlined">webhook</span>
                  </div>
                  <h2 className="text-lg font-bold text-text-main dark:text-white">Integraciones</h2>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-main dark:text-gray-300">Webhook de WhatsApp (Meta Business)</span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          className="w-full h-12 pl-4 pr-10 rounded-lg border border-border-color dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-text-secondary font-mono text-sm focus:ring-0 outline-none"
                          readOnly
                          type="text"
                          value={settings.whatsappWebhookUrl}
                        />
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-[18px]">lock</span>
                      </div>
                      <button
                        className="h-12 px-4 rounded-lg border border-border-color dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-text-main dark:text-white transition-colors flex items-center gap-2"
                        title="Copiar URL"
                        type="button"
                        onClick={handleCopyWebhook}
                      >
                        <span className="material-symbols-outlined text-[20px]">content_copy</span>
                        <span className="hidden sm:inline text-sm font-medium">Copiar</span>
                      </button>
                    </div>
                  </label>
                  <p className="text-xs text-text-secondary mt-1">Utiliza esta URL para configurar los eventos entrantes en tu consola de Meta Developers.</p>
                </div>
              </div>
            </form>
          </div>
          {/* Sticky Footer for Actions */}
          <div className="fixed bottom-0 right-0 w-full lg:w-[calc(100%-18rem)] z-20 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-border-color dark:border-slate-800 p-4 md:px-12">
            <div className="max-w-[1000px] mx-auto flex items-center justify-end gap-3">
              <button
                className="px-6 py-2.5 rounded-lg border border-border-color dark:border-slate-700 text-text-main dark:text-white font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                className="px-6 py-2.5 rounded-lg bg-primary text-text-main font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all"
                type="submit"
                form="settings-form" // Link to the form
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;