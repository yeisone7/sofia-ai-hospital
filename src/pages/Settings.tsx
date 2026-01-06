import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import BlockedSlotsManager from '@/components/BlockedSlotsManager';
import { ModeToggle } from '@/components/mode-toggle';

// Interfaces for clinic settings data structure
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

interface ClinicSettingsData {
  id?: string;
  clinic_name: string;
  clinic_address: string | null;
  clinic_phone: string | null;
  clinic_email: string | null;
  working_hours: OperatingHours;
  services: string[];
  about_clinic: string | null;
  whatsapp_webhook_url: string | null;
  timezone: string | null;
  logo_url: string | null;
  scheduling_enabled: boolean;
  updated_at?: string;
}

const Settings = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<ClinicSettingsData>({
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    working_hours: {
      timezone: 'America/Mexico_City',
      weekdays: { open: true, startTime: '09:00', endTime: '18:00' },
      saturday: { open: true, startTime: '09:00', endTime: '14:00' },
      sunday: { open: false, startTime: '09:00', endTime: '14:00' },
    },
    services: [],
    about_clinic: '',
    whatsapp_webhook_url: `https://stojculenbcdvzggyscb.supabase.co/functions/v1/twilio-webhook-whatsapp`,
    timezone: 'America/Mexico_City',
    logo_url: null,
    scheduling_enabled: true,
  });

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [initialSettings, setInitialSettings] = useState<ClinicSettingsData | null>(null);

  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchSettingsData();
    }
  }, [user, isSessionLoading, navigate]);

  const fetchSettingsData = async () => {
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const parsedSettings: ClinicSettingsData = {
          ...data,
          working_hours: data.working_hours || {
            timezone: 'America/Mexico_City',
            weekdays: { open: true, startTime: '09:00', endTime: '18:00' },
            saturday: { open: true, startTime: '09:00', endTime: '14:00' },
            sunday: { open: false, startTime: '09:00', endTime: '14:00' },
          },
          services: data.services || [],
          whatsapp_webhook_url: data.whatsapp_webhook_url || `https://stojculenbcdvzggyscb.supabase.co/functions/v1/twilio-webhook-whatsapp`,
          scheduling_enabled: data.scheduling_enabled !== false,
        };
        setSettings(parsedSettings);
        setInitialSettings(parsedSettings);
      } else if (user) {
        const defaultSettings: ClinicSettingsData = {
          id: user.id,
          clinic_name: '',
          clinic_address: '',
          clinic_phone: '',
          clinic_email: '',
          working_hours: {
            timezone: 'America/Mexico_City',
            weekdays: { open: true, startTime: '09:00', endTime: '18:00' },
            saturday: { open: true, startTime: '09:00', endTime: '14:00' },
            sunday: { open: false, startTime: '09:00', endTime: '14:00' },
          },
          services: [],
          about_clinic: '',
          whatsapp_webhook_url: `https://stojculenbcdvzggyscb.supabase.co/functions/v1/twilio-webhook-whatsapp`,
          timezone: 'America/Mexico_City',
          logo_url: null,
          scheduling_enabled: true,
        };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      }
    } catch (error: any) {
      console.error('Error fetching settings data:', error);
      showError('Error al cargar ajustes: ' + error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return null;
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const filePath = `clinic_logos/${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('clinic-logos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('clinic-logos').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    if (!user) {
      showError('Usuario no autenticado.');
      setIsSaving(false);
      return;
    }
    try {
      let newLogoUrl = settings.logo_url;
      if (logoFile) {
        newLogoUrl = await handleLogoUpload(logoFile);
      }
      const settingsToSave = {
        id: user.id,
        clinic_name: settings.clinic_name,
        clinic_address: settings.clinic_address,
        clinic_phone: settings.clinic_phone,
        clinic_email: settings.clinic_email,
        working_hours: settings.working_hours,
        services: settings.services,
        about_clinic: settings.about_clinic,
        whatsapp_webhook_url: settings.whatsapp_webhook_url,
        timezone: settings.timezone,
        logo_url: newLogoUrl,
        scheduling_enabled: settings.scheduling_enabled,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('clinic_settings')
        .upsert(settingsToSave, { onConflict: 'id' });
      if (error) throw error;
      setSettings(prev => ({ ...prev, logo_url: newLogoUrl }));
      setInitialSettings(settingsToSave);
      setLogoFile(null);
      showSuccess('Ajustes guardados correctamente.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showError('Error al guardar ajustes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (initialSettings) {
      setSettings(initialSettings);
      setLogoFile(null);
      showSuccess('Cambios cancelados.');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    field: keyof ClinicSettingsData
  ) => {
    setSettings(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleOperatingHoursTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({
      ...prev,
      working_hours: { ...prev.working_hours, timezone: e.target.value },
    }));
  };

  const handleOperatingHoursToggle = (day: 'weekdays' | 'saturday' | 'sunday', value: boolean) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: { ...prev.working_hours[day], open: value },
      },
    }));
  };

  const handleOperatingHoursTimeChange = (day: 'weekdays' | 'saturday' | 'sunday', timeType: 'startTime' | 'endTime', value: string) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: { ...prev.working_hours[day], [timeType]: value },
      },
    }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setSettings(prev => ({ ...prev, logo_url: initialSettings?.logo_url || null }));
    }
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (newServiceInput.trim() && !settings.services.some(s => s.toLowerCase() === newServiceInput.trim().toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        services: [...prev.services, newServiceInput.trim()],
      }));
      setNewServiceInput('');
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter(s => s !== serviceToRemove),
    }));
  };

  const handleCopyWebhook = async () => {
    try {
      if (settings.whatsapp_webhook_url) {
        await navigator.clipboard.writeText(settings.whatsapp_webhook_url);
        showSuccess('URL del Webhook copiada al portapapeles.');
      } else {
        showError('No hay URL de webhook para copiar.');
      }
    } catch (err) {
      showError('Error al copiar la URL.');
      console.error('Failed to copy: ', err);
    }
  };

  if (isSessionLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark pb-24">
      <main className="max-w-[1000px] mx-auto w-full px-6 py-8 md:px-12 md:py-10">
        <form onSubmit={handleSaveSettings}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-main dark:text-white">Configuración</h1>
            <p className="text-text-secondary">Administra los detalles de tu clínica y la conexión con Laura AI</p>
          </div>

          {/* General Information */}
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border-light dark:border-border-dark pb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary-dark">domain</span>
              </div>
              <h3 className="text-lg font-bold">Información General</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-3 flex flex-col items-center gap-4">
                <div className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-4xl">add_photo_alternate</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <p className="text-xs text-text-secondary text-center">Logo de la clínica</p>
              </div>

              <div className="md:col-span-9 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-text-secondary">Nombre de la Clínica</label>
                    <input type="text" value={settings.clinic_name} onChange={(e) => handleInputChange(e, 'clinic_name')} className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-transparent focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Nombre" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-text-secondary">Teléfono</label>
                    <input type="tel" value={settings.clinic_phone || ''} onChange={(e) => handleInputChange(e, 'clinic_phone')} className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-transparent focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Teléfono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary">Correo Electrónico</label>
                  <input type="email" value={settings.clinic_email || ''} onChange={(e) => handleInputChange(e, 'clinic_email')} className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-transparent focus:ring-2 focus:ring-primary/50 outline-none" placeholder="email@clinica.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary">Dirección</label>
                  <textarea value={settings.clinic_address || ''} onChange={(e) => handleInputChange(e, 'clinic_address')} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-transparent focus:ring-2 focus:ring-primary/50 outline-none resize-none" placeholder="Dirección física" />
                </div>
              </div>
            </div>
          </section>

          {/* Theme/Appearance */}
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border-light dark:border-border-dark pb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <span className="material-symbols-outlined text-purple-600">palette</span>
              </div>
              <h3 className="text-lg font-bold">Apariencia</h3>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30">
              <div>
                <span className="font-bold">Tema de la Interfaz</span>
                <p className="text-xs text-text-secondary">Cambia entre modo claro y oscuro</p>
              </div>
              <ModeToggle />
            </div>
          </section>

          {/* Scheduling Rules */}
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border-light dark:border-border-dark pb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="material-symbols-outlined text-blue-600">calendar_month</span>
              </div>
              <h3 className="text-lg font-bold">Reglas de Agendamiento</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <div>
                  <span className="font-bold">Agendamiento Automático (IA)</span>
                  <p className="text-xs text-text-secondary">Permitir que Laura AI agende citas automáticamente</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.scheduling_enabled} onChange={(e) => setSettings(prev => ({ ...prev, scheduling_enabled: e.target.checked }))} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div>
                <h4 className="font-bold mb-2">Bloqueos Manuales</h4>
                <p className="text-sm text-text-secondary mb-4">Evita que la IA agende en horarios específicos</p>
                {user && <BlockedSlotsManager userId={user.id} />}
              </div>
            </div>
          </section>

          {/* Operating Hours */}
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border-light dark:border-border-dark pb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary-dark">schedule</span>
              </div>
              <h3 className="text-lg font-bold">Horarios de Atención</h3>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-secondary">Zona Horaria</label>
                <select value={settings.working_hours.timezone} onChange={handleOperatingHoursTimezoneChange} className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-transparent focus:ring-2 focus:ring-primary/50 outline-none">
                  <option value="America/Mexico_City">México (GMT-6)</option>
                  <option value="America/Bogota">Bogotá (GMT-5)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                </select>
              </div>
              {(['weekdays', 'saturday', 'sunday'] as const).map((day) => (
                <div key={day} className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-xl">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={settings.working_hours[day].open} onChange={(e) => handleOperatingHoursToggle(day, e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="font-semibold capitalize">{day === 'weekdays' ? 'Lunes a Viernes' : day === 'saturday' ? 'Sábado' : 'Domingo'}</span>
                  </div>
                  {settings.working_hours[day].open && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={settings.working_hours[day].startTime} onChange={(e) => handleOperatingHoursTimeChange(day, 'startTime', e.target.value)} className="px-2 py-1 rounded border border-border-light dark:border-border-dark bg-transparent text-sm" />
                      <span className="text-text-secondary">-</span>
                      <input type="time" value={settings.working_hours[day].endTime} onChange={(e) => handleOperatingHoursTimeChange(day, 'endTime', e.target.value)} className="px-2 py-1 rounded border border-border-light dark:border-border-dark bg-transparent text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Services */}
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border-light dark:border-border-dark pb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary-dark">medical_information</span>
              </div>
              <h3 className="text-lg font-bold">Servicios</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" value={newServiceInput} onChange={(e) => setNewServiceInput(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-transparent outline-none focus:ring-2 focus:ring-primary/50" placeholder="Nuevo servicio" />
                <button type="button" onClick={handleAddService} className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.services.map((service, i) => (
                  <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border border-border-light dark:border-border-dark">
                    {service}
                    <button type="button" onClick={() => handleRemoveService(service)} className="text-gray-400 hover:text-red-500">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Webhook */}
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border-light dark:border-border-dark pb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="material-symbols-outlined text-green-600">webhook</span>
              </div>
              <h3 className="text-lg font-bold">WhatsApp Webhook</h3>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex items-center gap-3">
              <code className="text-xs break-all flex-1 text-text-secondary">{settings.whatsapp_webhook_url}</code>
              <button type="button" onClick={handleCopyWebhook} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg shrink-0">
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </section>

          {/* Floating Actions */}
          <div className="fixed bottom-0 right-0 left-0 md:left-72 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark p-4 flex items-center justify-end gap-3 z-30">
            <button type="button" onClick={handleCancel} disabled={isSaving} className="px-6 py-2.5 rounded-xl border border-border-light text-text-main font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="px-10 py-2.5 bg-primary text-teal-950 font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center gap-2">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Settings;