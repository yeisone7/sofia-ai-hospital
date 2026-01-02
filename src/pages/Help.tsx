import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils';

const Help = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = user?.user_metadata?.role === 'admin';

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Primeros Pasos',
      icon: 'rocket_launch',
      content: `
        <h3 className="text-lg font-bold mb-2">Bienvenido a Laura AI</h3>
        <p className="mb-4">Laura AI es tu asistente virtual para la gestión de citas médicas. Aquí tienes una guía rápida para comenzar:</p>
        
        <h4 className="font-bold mb-2">1. Configura tu clínica</h4>
        <p className="mb-4">Ve a la sección "Configuración" para ingresar los datos de tu clínica, horarios de atención y servicios ofrecidos.</p>
        
        <h4 className="font-bold mb-2">2. Agrega médicos</h4>
        <p className="mb-4">En la sección "Médicos", registra a todos los profesionales de tu equipo con sus especialidades.</p>
        
        <h4 className="font-bold mb-2">3. Conecta con WhatsApp</h4>
        <p className="mb-4">Configura el webhook de WhatsApp para que Laura AI pueda recibir y responder mensajes de tus pacientes.</p>
      `
    },
    {
      id: 'appointments',
      title: 'Gestión de Citas',
      icon: 'event',
      content: `
        <h3 className="text-lg font-bold mb-2">Cómo gestionar tus citas</h3>
        <p className="mb-4">Laura AI te permite gestionar citas de forma eficiente:</p>
        
        <h4 className="font-bold mb-2">Crear una cita</h4>
        <p className="mb-4">Puedes crear citas manualmente desde la sección "Citas" o permitir que los pacientes las programen a través de WhatsApp.</p>
        
        <h4 className="font-bold mb-2">Confirmar citas</h4>
        <p className="mb-4">Las citas programadas a través de WhatsApp se marcan como "Pendientes" hasta que las confirmes manualmente.</p>
        
        <h4 className="font-bold mb-2">Cancelar o reprogramar</h4>
        <p className="mb-4">Puedes cancelar o reprogramar citas desde la tabla de citas. Los pacientes también pueden hacerlo a través de WhatsApp.</p>
      `
    },
    {
      id: 'patients',
      title: 'Gestión de Pacientes',
      icon: 'groups',
      content: `
        <h3 className="text-lg font-bold mb-2">Administra tu base de pacientes</h3>
        <p className="mb-4">La sección "Pacientes" te permite mantener un registro de todos tus pacientes:</p>
        
        <h4 className="font-bold mb-2">Agregar pacientes</h4>
        <p className="mb-4">Puedes agregar pacientes manualmente o se crearán automáticamente cuando programen una cita a través de WhatsApp.</p>
        
        <h4 className="font-bold mb-2">Buscar pacientes</h4>
        <p className="mb-4">Utiliza la barra de búsqueda para encontrar pacientes por nombre, correo o teléfono.</p>
        
        <h4 className="font-bold mb-2">Editar información</h4>
        <p className="mb-4">Mantén actualizada la información de contacto de tus pacientes para facilitar la comunicación.</p>
      `
    },
    {
      id: 'messages',
      title: 'Mensajes',
      icon: 'chat',
      content: `
        <h3 className="text-lg font-bold mb-2">Comunicación con pacientes</h3>
        <p className="mb-4">La sección "Mensajes" te permite interactuar con tus pacientes:</p>
        
        <h4 className="font-bold mb-2">Conversaciones activas</h4>
        <p className="mb-4">Aquí verás todas las conversaciones en curso con tus pacientes a través de WhatsApp.</p>
        
        <h4 className="font-bold mb-2">Respuestas automáticas</h4>
        <p className="mb-4">Laura AI responde automáticamente a las solicitudes comunes como programación de citas, horarios y servicios.</p>
        
        <h4 className="font-bold mb-2">Intervención manual</h4>
        <p className="mb-4">Puedes tomar el control de cualquier conversación y responder directamente como usuario.</p>
      `
    },
    {
      id: 'doctors',
      title: 'Gestión de Médicos',
      icon: 'stethoscope',
      content: `
        <h3 className="text-lg font-bold mb-2">Administra tu equipo médico</h3>
        <p className="mb-4">En la sección "Médicos" puedes gestionar a los profesionales de tu clínica:</p>
        
        <h4 className="font-bold mb-2">Agregar médicos</h4>
        <p className="mb-4">Registra a cada médico con su nombre completo, especialidad y foto de perfil.</p>
        
        <h4 className="font-bold mb-2">Activar/Desactivar</h4>
        <p className="mb-4">Puedes activar o desactivar médicos según su disponibilidad.</p>
        
        <h4 className="font-bold mb-2">Editar información</h4>
        <p className="mb-4">Actualiza la información de los médicos cuando sea necesario.</p>
      `
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: 'settings',
      content: `
        <h3 className="text-lg font-bold mb-2">Configura tu clínica</h3>
        <p className="mb-4">La sección "Configuración" es fundamental para el funcionamiento de Laura AI:</p>
        
        <h4 className="font-bold mb-2">Información básica</h4>
        <p className="mb-4">Ingresa el nombre, especialidad y descripción de tu clínica.</p>
        
        <h4 className="font-bold mb-2">Contacto y ubicación</h4>
        <p className="mb-4">Registra la dirección, teléfono y correo electrónico de tu clínica.</p>
        
        <h4 className="font-bold mb-2">Horarios de atención</h4>
        <p className="mb-4">Configura los horarios de atención para cada día de la semana.</p>
        
        <h4 className="font-bold mb-2">Servicios ofrecidos</h4>
        <p className="mb-4">Define qué servicios ofrece tu clínica para que Laura AI pueda mencionarlos.</p>
        
        <h4 className="font-bold mb-2">Webhook de WhatsApp</h4>
        <p className="mb-4">Copia la URL del webhook y configúrala en tu cuenta de Facebook Business para recibir mensajes.</p>
      `
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: 'analytics',
      content: `
        <h3 className="text-lg font-bold mb-2">Analiza el desempeño de tu clínica</h3>
        <p className="mb-4">La sección "Reportes" te proporciona estadísticas valiosas:</p>
        
        <h4 className="font-bold mb-2">Citas por día</h4>
        <p className="mb-4">Visualiza la cantidad de citas programadas por día en un gráfico.</p>
        
        <h4 className="font-bold mb-2">Estado de citas</h4>
        <p className="mb-4">Consulta la distribución de citas confirmadas, pendientes y canceladas.</p>
        
        <h4 className="font-bold mb-2">Citas por médico</h4>
        <p className="mb-4">Analiza cuántas citas ha atendido cada médico de tu equipo.</p>
        
        <h4 className="font-bold mb-2">Filtros de fecha</h4>
        <p className="mb-4">Filtra los reportes por rangos de fechas específicos para análisis personalizados.</p>
      `
    }
  ];

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
    }
  };

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
              <span className="material-symbols-outlined">help</span>
            </div>
            <div>
              <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight">Ayuda</h2>
              <p className="text-text-secondary text-xs hidden sm:block">Guía de uso de Laura AI</p>
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
              <h1 className="text-2xl font-bold text-text-main dark:text-white mb-2">Centro de Ayuda</h1>
              <p className="text-text-secondary">Encuentra respuestas a preguntas frecuentes y guías de uso</p>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-2xl">
                <input
                  type="text"
                  placeholder="Buscar en la ayuda..."
                  className="w-full px-4 py-3 pl-12 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">
                  search
                </span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar with Sections */}
              <div className="lg:w-1/4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-border-light dark:border-border-dark">
                  <h2 className="text-lg font-bold text-text-main dark:text-white mb-4">Temas de Ayuda</h2>
                  <ul className="space-y-2">
                    {filteredSections.map((section) => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                            activeSection === section.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-[#f2f8f7] dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined">{section.icon}</span>
                          <span>{section.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Content Area */}
              <div className="lg:w-3/4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                  {filteredSections
                    .filter((section) => section.id === activeSection)
                    .map((section) => (
                      <div key={section.id}>
                        <div className="flex items-center gap-3 mb-6">
                          <span className="material-symbols-outlined text-primary text-3xl">
                            {section.icon}
                          </span>
                          <h2 className="text-2xl font-bold text-text-main dark:text-white">
                            {section.title}
                          </h2>
                        </div>
                        <div
                          className="prose prose-lg max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </div>
                    ))}
                </div>

                {/* Contact Support */}
                <div className="mt-8 bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                  <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">
                    ¿Necesitas más ayuda?
                  </h3>
                  <p className="text-text-secondary mb-4">
                    Si no encuentras lo que buscas, nuestro equipo de soporte está aquí para ayudarte.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-text-main font-bold shadow-lg shadow-primary/20 transition-all">
                      <span className="material-symbols-outlined">email</span>
                      <span>Contactar por correo</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white font-bold hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-all">
                      <span className="material-symbols-outlined">chat</span>
                      <span>Chat en vivo</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Help;