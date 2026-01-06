import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

// Interfaces para la estructura de datos esperada de clinic_settings
interface ClinicSettings {
  id: string;
  clinic_name: string;
  clinic_address: string | null;
  clinic_phone: string | null;
  clinic_email: string | null;
  working_hours: {
    timezone: string;
    weekdays: { open: boolean; startTime: string; endTime: string };
    saturday: { open: boolean; startTime: string; endTime: string };
    sunday: { open: boolean; startTime: string; endTime: string };
  } | null;
  services: string[] | null;
  about_clinic: string | null;
  whatsapp_webhook_url: string | null;
  timezone: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

const LandingPage = () => {
  const navigate = useNavigate();
  const availabilityRef = useRef<HTMLDivElement>(null);

  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchClinicSettings = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        // Fetch the first clinic settings available. In a multi-tenant app,
        // you might need a specific ID or a way to identify the public clinic.
        const { data, error } = await supabase
          .from('clinic_settings')
          .select('*')
          .limit(1) // Get the first available clinic settings
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          throw error;
        }

        if (data) {
          setClinicSettings(data as ClinicSettings);
        } else {
          // If no configuration found, use default placeholder values
          setClinicSettings({
            id: 'default-clinic-id', // Placeholder ID
            clinic_name: 'Laura AI Clinic',
            clinic_address: '123 Main St, City, Country',
            clinic_phone: '+1234567890',
            clinic_email: 'info@lauraai.com',
            working_hours: {
              timezone: 'America/Mexico_City',
              weekdays: { open: true, startTime: '09:00', endTime: '18:00' },
              saturday: { open: true, startTime: '09:00', endTime: '14:00' },
              sunday: { open: false, startTime: '09:00', endTime: '14:00' },
            },
            services: ['Medicina General', 'Odontología'],
            about_clinic: 'Somos una clínica dedicada a tu bienestar.',
            whatsapp_webhook_url: 'https://wa.me/1234567890?text=Hola%2C%20quiero%20agendar%20una%20cita.', // Placeholder de WhatsApp
            timezone: 'America/Mexico_City',
            logo_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.error('Error fetching clinic settings:', err);
        showError('Error al cargar la configuración de la clínica.');
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinicSettings();
  }, []);



  const handleViewHours = () => {
    availabilityRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderLoadingState = () => (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <p className="text-text-main dark:text-white text-lg">Cargando información de la clínica...</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center p-8 bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cargar</h2>
        <p className="text-text-main dark:text-gray-300 mb-6">No pudimos cargar la información de la clínica. Por favor, inténtalo de nuevo más tarde.</p>
        <button
          onClick={() => window.location.reload()}
          className="h-12 px-6 rounded-lg bg-primary hover:bg-primary-hover text-[#0d1b1a] text-base font-bold shadow-lg shadow-primary/25 transition-all"
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  if (isError) {
    return renderErrorState();
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root">
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary-dark">
                <span className="material-symbols-outlined text-primary dark:text-primary">smart_toy</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-text-main dark:text-white">{clinicSettings?.clinic_name || 'Laura AI'}</h2>
            </div>
            <div className="hidden md:flex flex-1 justify-center gap-8">
              <a className="text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors" onClick={handleViewHours}>Cómo funciona</a>
              <a className="text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors" onClick={handleViewHours}>Horarios</a>
            </div>
            <div className="flex items-center gap-3">
              <Link className="flex h-9 items-center justify-center rounded-lg bg-primary hover:bg-primary-hover px-4 text-sm font-bold text-[#0d1b1a] transition-all shadow-sm hover:shadow-md gap-2" to="/login">
                <span className="material-symbols-outlined text-[18px]">login</span>
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex flex-col flex-grow">
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-24 lg:pb-32">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5"></div>
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-400/5"></div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6 text-left max-w-2xl">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
                  <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                  <span className="text-xs font-bold text-teal-800 dark:text-primary">Asistente Virtual Inteligente</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-text-main dark:text-white sm:text-5xl lg:text-6xl leading-[1.15]">
                  Agenda tus citas médicas por <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-600">WhatsApp</span>
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  Bienvenido a la forma más sencilla de cuidar tu salud. Laura AI te ayuda a programar, reprogramar o cancelar tus consultas médicas al instante, sin llamadas ni esperas.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-2">

                  <button onClick={handleViewHours} className="h-12 px-6 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-main dark:text-white text-base font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center">
                    Ver Horarios
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-lg">verified</span>
                    <span>Seguro y Confidencial</span>
                  </div>
                  <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  <div>
                    <span>Sin descargar apps</span>
                  </div>
                </div>
              </div>
              <div className="relative lg:h-auto w-full flex justify-center lg:justify-end">
                <div className="relative w-full max-w-md aspect-square lg:aspect-auto lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-surface-dark bg-gray-100">
                  <div className="absolute inset-0 bg-cover bg-center" data-alt="Doctor smiling while holding a smartphone in a modern medical clinic setting" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBPKs-g6TY5zlyAXyPEu7sqweOrzKLPylfv9ph4nyE7xhUEUQUmaUaTRmoXifnA-YFANUCpRkbPn8VtUfAwDUg7KBnBEHsNBWnEi9t-Pd_ZHE0I5PwIGhCvJ1vvNjVzcJThkTPBJ6HL9u2Pimjp3IxuWTAIgWu0Hfk5e3CYf7_kK1j6CNe1c4o1XyMUmpRliJVxTCoW6_q13r3T6xKStIvZRpaYwlshBVMbMzxSUECSvs2Qj1RCh8-DmztdiUsU9x07YKnqD_yfg8VmIV-kzTuIjRx5nxwzcoMCM8x7LbOVU-7cQ4oIt49j09_LBO-aLyB_o3lZ8XnX8vwnBK2eUj58Y')" }}>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/95 dark:bg-surface-dark/95 backdrop-blur rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">smart_toy</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Laura AI</p>
                        <p className="text-xs text-primary font-medium">En línea para ayudarte</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-xs text-gray-700 dark:text-gray-300 w-fit max-w-[85%] shadow-sm">
                        ¡Hola! 👋 Soy Laura. ¿Te gustaría agendar una cita con el Dr. Pérez hoy?
                      </div>
                      <div className="bg-primary/20 p-3 rounded-lg rounded-tr-none text-xs text-gray-800 dark:text-white w-fit max-w-[85%] ml-auto shadow-sm">
                        Sí, por favor. ¿Qué horarios tiene disponibles?
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-xs text-gray-700 dark:text-gray-300 w-fit max-w-[85%] shadow-sm">
                        Tengo un espacio a las 4:00 PM y otro a las 5:30 PM.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-16 bg-white dark:bg-surface-dark border-y border-gray-100 dark:border-gray-800" id="availability" ref={availabilityRef}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
              <div className="flex flex-col justify-center rounded-3xl bg-background-light dark:bg-background-dark p-8 lg:p-12 border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-[120px] text-primary">verified_user</span>
                </div>
                <h3 className="text-2xl font-bold text-text-main dark:text-white mb-4 relative z-10">Simplificamos tus trámites médicos</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 relative z-10">
                  Laura AI se conecta directamente con la agenda de la clínica para ofrecerte disponibilidad real. Olvídate de los formularios complicados o de esperar en línea telefónica. Todo el proceso es tan natural como chatear con un amigo.
                </p>
                <ul className="space-y-3 relative z-10">
                  <li className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Confirmación inmediata de tu cita
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Recordatorios automáticos por WhatsApp
                  </li>
                </ul>
              </div>
              <div className="flex flex-col justify-center rounded-3xl bg-surface-dark text-white p-8 lg:p-12 border border-gray-800 relative overflow-hidden shadow-xl shadow-teal-900/20">
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
                  </div>
                  <h3 className="text-2xl font-bold">Horarios de Atención</h3>
                </div>
                <p className="text-gray-300 mb-8 border-b border-white/10 pb-6">
                  Puedes interactuar con Laura AI para gestionar tus citas en cualquier momento.
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-medium text-gray-200">Solicitud de citas</span>
                    <span className="px-3 py-1 rounded-full bg-primary text-teal-950 text-xs font-bold uppercase tracking-wider">24/7 Disponible</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-medium text-gray-200">Atención Lunes a Viernes</span>
                    <span className="text-primary font-bold">
                      {clinicSettings?.working_hours?.weekdays.open
                        ? `${clinicSettings.working_hours.weekdays.startTime} - ${clinicSettings.working_hours.weekdays.endTime}`
                        : 'Cerrado'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-medium text-gray-200">Sábados</span>
                    <span className="text-primary font-bold">
                      {clinicSettings?.working_hours?.saturday.open
                        ? `${clinicSettings.working_hours.saturday.startTime} - ${clinicSettings.working_hours.saturday.endTime}`
                        : 'Cerrado'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-medium text-gray-200">Domingos</span>
                    <span className="text-primary font-bold">
                      {clinicSettings?.working_hours?.sunday.open
                        ? `${clinicSettings.working_hours.sunday.startTime} - ${clinicSettings.working_hours.sunday.endTime}`
                        : 'Cerrado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 lg:py-28" id="how-it-works">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 mb-16 max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-text-main dark:text-white sm:text-4xl">
                ¿Por qué usar Laura AI?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Diseñada pensando en tu comodidad. Tecnología avanzada que hace tu experiencia médica más humana y accesible.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-8 shadow-sm transition-all hover:shadow-lg hover:border-primary/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-text-main transition-colors">
                  <span className="material-symbols-outlined text-3xl">sentiment_satisfied</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Fácil de Usar</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    No necesitas aprender a usar una nueva plataforma. Si sabes usar WhatsApp, ya sabes usar Laura AI.
                  </p>
                </div>
              </div>
              <div className="group flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-8 shadow-sm transition-all hover:shadow-lg hover:border-primary/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-text-main transition-colors">
                  <span className="material-symbols-outlined text-3xl">bolt</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Respuesta Inmediata</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Olvídate de las esperas telefónicas. Laura te responde al instante y encuentra el hueco perfecto en segundos.
                  </p>
                </div>
              </div>
              <div className="group flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-8 shadow-sm transition-all hover:shadow-lg hover:border-primary/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-text-main transition-colors">
                  <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Privado y Seguro</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Tus datos médicos y conversaciones están protegidos con los más altos estándares de seguridad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 px-6 py-16 text-center shadow-2xl sm:px-12 sm:py-24">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"></div>
              <div className="relative z-10 flex flex-col items-center gap-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-text-main dark:text-white sm:text-4xl md:text-5xl max-w-3xl">
                  ¿Listo para agendar tu cita?
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                  Inicia una conversación con Laura AI ahora y deja de preocuparte por la gestión de tus consultas médicas.
                </p>
                <div className="mt-4 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">

                </div>
                <p className="mt-4 text-sm text-gray-500">Servicio gratuito para pacientes</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">smart_toy</span>
                <span className="text-lg font-bold text-text-main dark:text-white">{clinicSettings?.clinic_name || 'Laura AI'}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left max-w-sm">
                Simplificando la conexión entre pacientes y clínicas mediante inteligencia artificial.
              </p>
            </div>
            <div className="flex gap-8">
              <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors" href="#">Privacidad</a>
              <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors" href="#">Términos</a>
              <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors" href="#">Ayuda</a>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-center flex flex-col justify-center items-center gap-4">
            <p className="text-sm text-gray-500">© 2024 {clinicSettings?.clinic_name || 'Laura AI'} Inc. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;