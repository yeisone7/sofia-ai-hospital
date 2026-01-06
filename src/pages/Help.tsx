import { useState } from 'react';
import { useSession } from '@/integrations/supabase/session-context';

const Help = () => {
  const { isLoading: isSessionLoading } = useSession();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Primeros Pasos',
      icon: 'rocket_launch',
      content: `
        <h3 class="text-lg font-bold mb-2">Bienvenido a Laura AI - E.S.E. Cantagallo</h3>
        <p class="mb-4">Laura AI es tu asistente virtual inteligente para la gestión integral del Centro de Salud. Aquí tienes una guía rápida para comenzar:</p>
        
        <h4 class="font-bold mb-2">1. Instalación como PWA (Aplicación)</h4>
        <p class="mb-4">Puedes instalar Laura AI en tu dispositivo móvil o computadora como una aplicación nativa. Busca el botón "Instalar" en tu navegador (Chrome/Edge) o usa el menú "Agregar a pantalla de inicio" en Safari (iOS).</p>
        
        <h4 class="font-bold mb-2">2. Roles de Usuario</h4>
        <p class="mb-4">Existen dos tipos de usuarios:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Usuario:</strong> Puede gestionar sus propias citas y ver su dashboard personal.</li>
          <li><strong>Administrador:</strong> Acceso completo a todos los módulos y datos del sistema.</li>
        </ul>
        
        <h4 class="font-bold mb-2">3. Navegación</h4>
        <p class="mb-4">Usa el menú lateral izquierdo para acceder a las diferentes secciones. Los módulos visibles dependen de tu rol en el sistema.</p>
      `
    },
    {
      id: 'roles',
      title: 'Sistema de Roles',
      icon: 'admin_panel_settings',
      content: `
        <h3 class="text-lg font-bold mb-2">Roles y Permisos</h3>
        <p class="mb-4">Laura AI implementa un sistema de control de acceso basado en roles para garantizar la seguridad de los datos:</p>
        
        <h4 class="font-bold mb-2">👤 Rol: Usuario</h4>
        <p class="mb-4">Los usuarios con este rol tienen acceso limitado:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Dashboard:</strong> Solo ven sus propias estadísticas y citas</li>
          <li><strong>Citas:</strong> Pueden crear, ver y gestionar únicamente sus propias citas</li>
          <li><strong>Ayuda:</strong> Acceso completo a la documentación</li>
        </ul>
        
        <h4 class="font-bold mb-2">👨‍💼 Rol: Administrador</h4>
        <p class="mb-4">Los administradores tienen acceso completo:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Dashboard:</strong> Estadísticas globales de toda la clínica</li>
          <li><strong>Mensajes:</strong> Todas las conversaciones con pacientes</li>
          <li><strong>Pacientes:</strong> Base de datos completa de pacientes</li>
          <li><strong>Citas:</strong> Todas las citas del sistema</li>
          <li><strong>Médicos:</strong> Gestión del equipo médico</li>
          <li><strong>Reportes:</strong> Análisis y estadísticas avanzadas</li>
          <li><strong>Configuración:</strong> Parámetros del sistema</li>
          <li><strong>Usuarios:</strong> Gestión de roles y permisos</li>
          <li><strong>Comunicados:</strong> Anuncios internos para el personal</li>
        </ul>
        
        <h4 class="font-bold mb-2">🔒 Seguridad</h4>
        <p class="mb-4">El sistema implementa múltiples capas de seguridad para proteger los datos de los pacientes, incluyendo políticas de seguridad a nivel de base de datos (RLS) que impiden el acceso no autorizado.</p>
      `
    },
    {
      id: 'pwa',
      title: 'Instalación PWA',
      icon: 'install_mobile',
      content: `
        <h3 class="text-lg font-bold mb-2">Instalar como Aplicación</h3>
        <p class="mb-4">Laura AI es una Progressive Web App (PWA) que puedes instalar en cualquier dispositivo:</p>
        
        <h4 class="font-bold mb-2">📱 Android (Chrome/Edge)</h4>
        <ol class="list-decimal pl-6 mb-4">
          <li>Abre la aplicación en Chrome o Edge</li>
          <li>Toca el banner "Agregar a pantalla de inicio" que aparece abajo</li>
          <li>O usa el menú (⋮) → "Agregar a pantalla de inicio"</li>
          <li>Confirma la instalación</li>
        </ol>
        
        <h4 class="font-bold mb-2">🍎 iPhone/iPad (Safari)</h4>
        <ol class="list-decimal pl-6 mb-4">
          <li>Abre la aplicación en Safari</li>
          <li>Toca el botón Compartir (□↑)</li>
          <li>Selecciona "Agregar a pantalla de inicio"</li>
          <li>Personaliza el nombre y toca "Agregar"</li>
        </ol>
        
        <h4 class="font-bold mb-2">💻 Windows/Mac (Chrome/Edge)</h4>
        <ol class="list-decimal pl-6 mb-4">
          <li>Busca el ícono de instalación (⊕) en la barra de direcciones</li>
          <li>Haz clic en "Instalar"</li>
          <li>La app se agregará a tu sistema como cualquier programa</li>
        </ol>
        
        <h4 class="font-bold mb-2">✅ Ventajas de Instalar</h4>
        <ul class="list-disc pl-6 mb-4">
          <li>Icono en tu pantalla de inicio</li>
          <li>Se abre en pantalla completa (sin barra del navegador)</li>
          <li>Acceso más rápido</li>
          <li>Actualizaciones automáticas</li>
        </ul>
      `
    },
    {
      id: 'appointments',
      title: 'Gestión de Citas',
      icon: 'event',
      content: `
        <h3 class="text-lg font-bold mb-2">Cómo gestionar tus citas</h3>
        <p class="mb-4">El módulo de citas te permite administrar las consultas médicas de forma eficiente:</p>
        
        <h4 class="font-bold mb-2">📅 Crear una Cita</h4>
        <p class="mb-4">Haz clic en el botón "Nueva Cita" y completa el formulario con:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Datos del paciente (nombre, teléfono, cédula)</li>
          <li>Tipo de cita (consulta, control, procedimiento)</li>
          <li>Médico asignado</li>
          <li>Fecha y hora (solo se permiten citas para mañana en adelante)</li>
        </ul>
        
        <h4 class="font-bold mb-2">🔍 Filtros y Búsqueda</h4>
        <p class="mb-4">Usa los filtros por estado para ver:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Todas:</strong> Todas las citas</li>
          <li><strong>Pendiente:</strong> Citas sin confirmar</li>
          <li><strong>Confirmada:</strong> Citas confirmadas</li>
          <li><strong>Cancelada:</strong> Citas canceladas</li>
          <li><strong>Reprogramada:</strong> Citas que fueron movidas</li>
        </ul>
        
        <h4 class="font-bold mb-2">⚡ Acciones Rápidas</h4>
        <p class="mb-4">Desde la tabla de citas puedes:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Confirmar:</strong> Marca una cita pendiente como confirmada</li>
          <li><strong>Reprogramar:</strong> Cambia la fecha/hora de una cita</li>
          <li><strong>Cancelar:</strong> Cancela una cita</li>
        </ul>
        
        <h4 class="font-bold mb-2">📊 Vista de Calendario</h4>
        <p class="mb-4">Alterna entre vista de lista y calendario usando los botones en la parte superior para visualizar mejor la agenda.</p>
      `
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      content: `
        <h3 class="text-lg font-bold mb-2">Panel de Control</h3>
        <p class="mb-4">El Dashboard es tu centro de comando con información en tiempo real:</p>
        
        <h4 class="font-bold mb-2">📊 Métricas Principales</h4>
        <p class="mb-4">Visualiza rápidamente:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Citas Hoy:</strong> Número de consultas programadas para hoy</li>
          <li><strong>Citas Mañana:</strong> Consultas del día siguiente</li>
          <li><strong>Mensajes sin leer:</strong> Conversaciones pendientes de atención</li>
        </ul>
        
        <h4 class="font-bold mb-2">🤖 Laura AI Insights</h4>
        <p class="mb-4">La tarjeta de insights inteligentes te muestra sugerencias automáticas basadas en el estado actual:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Optimización de agenda si hay huecos libres</li>
          <li>Alertas sobre mensajes pendientes</li>
          <li>Recordatorios de confirmaciones pendientes</li>
        </ul>
        
        <h4 class="font-bold mb-2">📨 Mensajes Recientes</h4>
        <p class="mb-4">Ve las últimas 4 conversaciones con pacientes y accede rápidamente a responderlas.</p>
        
        <h4 class="font-bold mb-2">📅 Próximas Citas</h4>
        <p class="mb-4">Lista de las siguientes 3 citas programadas con estado y detalles del paciente.</p>
        
        <h4 class="font-bold mb-2">📢 Comunicados</h4>
        <p class="mb-4">Si hay anuncios activos del administrador, aparecerán en un banner destacado en la parte superior.</p>
      `
    },
    {
      id: 'messages',
      title: 'Mensajes (Solo Admin)',
      icon: 'chat',
      content: `
        <h3 class="text-lg font-bold mb-2">Comunicación con Pacientes</h3>
        <p class="mb-4"><em>Nota: Este módulo solo está disponible para administradores.</em></p>
        
        <h4 class="font-bold mb-2">💬 Conversaciones</h4>
        <p class="mb-4">Visualiza todas las conversaciones activas con pacientes a través de WhatsApp. Cada conversación muestra:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Nombre del paciente</li>
          <li>Último mensaje recibido</li>
          <li>Estado de lectura</li>
          <li>Hora del último mensaje</li>
        </ul>
        
        <h4 class="font-bold mb-2">🤖 Respuestas Automáticas</h4>
        <p class="mb-4">Laura AI responde automáticamente a:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Solicitudes de citas</li>
          <li>Consultas sobre horarios</li>
          <li>Información de servicios</li>
          <li>Preguntas frecuentes</li>
        </ul>
        
        <h4 class="font-bold mb-2">✍️ Intervención Manual</h4>
        <p class="mb-4">Puedes tomar el control de cualquier conversación y responder directamente cuando sea necesario.</p>
        
        <h4 class="font-bold mb-2">🗑️ Gestión de Conversaciones</h4>
        <p class="mb-4">Elimina conversaciones antiguas o irrelevantes para mantener tu bandeja organizada.</p>
      `
    },
    {
      id: 'patients',
      title: 'Pacientes (Solo Admin)',
      icon: 'groups',
      content: `
        <h3 class="text-lg font-bold mb-2">Base de Datos de Pacientes</h3>
        <p class="mb-4"><em>Nota: Este módulo solo está disponible para administradores.</em></p>
        
        <h4 class="font-bold mb-2">➕ Agregar Pacientes</h4>
        <p class="mb-4">Registra nuevos pacientes con:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Información personal (nombre, apellido, cédula)</li>
          <li>Datos de contacto (teléfono, email)</li>
          <li>Fecha de nacimiento</li>
        </ul>
        
        <h4 class="font-bold mb-2">🔍 Búsqueda Avanzada</h4>
        <p class="mb-4">Encuentra pacientes rápidamente por nombre, cédula, teléfono o email usando la barra de búsqueda.</p>
        
        <h4 class="font-bold mb-2">✏️ Editar Información</h4>
        <p class="mb-4">Actualiza los datos de contacto y personales de los pacientes cuando sea necesario.</p>
        
        <h4 class="font-bold mb-2">📋 Historial</h4>
        <p class="mb-4">Cada paciente muestra su historial de citas y comunicaciones con el centro de salud.</p>
      `
    },
    {
      id: 'doctors',
      title: 'Médicos (Solo Admin)',
      icon: 'stethoscope',
      content: `
        <h3 class="text-lg font-bold mb-2">Gestión del Equipo Médico</h3>
        <p class="mb-4"><em>Nota: Este módulo solo está disponible para administradores.</em></p>
        
        <h4 class="font-bold mb-2">👨‍⚕️ Agregar Médicos</h4>
        <p class="mb-4">Registra a los profesionales de salud con:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Nombre completo</li>
          <li>Especialidad</li>
          <li>Foto de perfil</li>
          <li>Estado (activo/inactivo)</li>
        </ul>
        
        <h4 class="font-bold mb-2">🔄 Activar/Desactivar</h4>
        <p class="mb-4">Controla la disponibilidad de cada médico para recibir citas. Los médicos inactivos no aparecen en el formulario de nueva cita.</p>
        
        <h4 class="font-bold mb-2">✏️ Editar Información</h4>
        <p class="mb-4">Actualiza la especialidad, foto o cualquier dato del médico cuando sea necesario.</p>
        
        <h4 class="font-bold mb-2">📊 Estadísticas</h4>
        <p class="mb-4">En la sección de Reportes puedes ver cuántas citas ha atendido cada médico.</p>
      `
    },
    {
      id: 'reports',
      title: 'Reportes (Solo Admin)',
      icon: 'analytics',
      content: `
        <h3 class="text-lg font-bold mb-2">Análisis y Estadísticas</h3>
        <p class="mb-4"><em>Nota: Este módulo solo está disponible para administradores.</em></p>
        
        <h4 class="font-bold mb-2">📊 Dashboard Analítico</h4>
        <p class="mb-4">Visualiza métricas clave del centro de salud:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Citas Totales:</strong> Con comparativa del período anterior</li>
          <li><strong>Pacientes Totales:</strong> Con indicador de nuevos pacientes</li>
          <li><strong>Mensajes AI:</strong> Interacciones con Laura AI</li>
          <li><strong>Tasa de Confirmación:</strong> Porcentaje de citas confirmadas</li>
        </ul>
        
        <h4 class="font-bold mb-2">📈 Gráficos Interactivos</h4>
        <p class="mb-4">Pestañas con diferentes vistas:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Citas:</strong> Volumen diario y distribución por estado</li>
          <li><strong>Médicos:</strong> Rendimiento comparativo del equipo</li>
          <li><strong>Actividad:</strong> Eficiencia de Laura AI y tiempos de respuesta</li>
        </ul>
        
        <h4 class="font-bold mb-2">📅 Filtros de Fecha</h4>
        <p class="mb-4">Selecciona rangos de fechas personalizados para análisis específicos.</p>
        
        <h4 class="font-bold mb-2">💾 Exportar Datos</h4>
        <p class="mb-4">Usa el botón de descarga para exportar los reportes (función próximamente).</p>
      `
    },
    {
      id: 'admin-features',
      title: 'Funciones de Admin',
      icon: 'verified_user',
      content: `
        <h3 class="text-lg font-bold mb-2">Herramientas Administrativas</h3>
        <p class="mb-4">Funcionalidades exclusivas para administradores:</p>
        
        <h4 class="font-bold mb-2">👥 Gestión de Usuarios</h4>
        <p class="mb-4">En el módulo "Usuarios" puedes:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Ver todos los usuarios del sistema</li>
          <li>Cambiar roles (Usuario ↔ Administrador)</li>
          <li>Activar o desactivar cuentas</li>
          <li>Buscar usuarios por nombre o email</li>
        </ul>
        
        <h4 class="font-bold mb-2">📢 Comunicados Internos</h4>
        <p class="mb-4">Crea anuncios que aparecen en el dashboard de todos los usuarios:</p>
        <ul class="list-disc pl-6 mb-4">
          <li><strong>Tipos:</strong> Info, Advertencia, Éxito, Error</li>
          <li><strong>Activar/Desactivar:</strong> Controla cuándo se muestran</li>
          <li><strong>Múltiples anuncios:</strong> Se muestran en carrusel</li>
        </ul>
        
        <h4 class="font-bold mb-2">⚙️ Configuración del Sistema</h4>
        <p class="mb-4">Personaliza parámetros del centro de salud:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Información de la clínica</li>
          <li>Horarios de atención</li>
          <li>Tipos de citas disponibles</li>
          <li>Configuración de WhatsApp</li>
        </ul>
        
        <h4 class="font-bold mb-2">🔒 Seguridad</h4>
        <p class="mb-4">Recuerda:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>No puedes degradar tu propio rol de administrador</li>
          <li>Mantén al menos 2 administradores activos</li>
          <li>Revisa periódicamente los permisos de usuarios</li>
        </ul>
      `
    }
  ];

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase())
  );


  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-text-main dark:text-white">Cargando...</p>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-main dark:text-white mb-2">Centro de Ayuda</h1>
            <p className="text-text-secondary">Encuentra respuestas a preguntas frecuentes y guías de uso</p>
          </div>

          <div className="mb-8">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Buscar en la ayuda..."
                className="w-full px-4 py-3 pl-12 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">
                search
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/4">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm">
                <h2 className="text-lg font-bold text-text-main dark:text-white mb-4 px-2">Temas de Ayuda</h2>
                <ul className="space-y-1">
                  {filteredSections.map((section) => (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeSection === section.id
                          ? 'bg-primary/10 text-primary-dark dark:text-primary font-bold'
                          : 'text-text-secondary dark:text-slate-400 hover:bg-[#f2f8f7] dark:hover:bg-white/5 hover:text-text-main dark:hover:text-white'
                          }`}
                      >
                        <span className="material-symbols-outlined">{section.icon}</span>
                        <span className="text-sm">{section.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:w-3/4">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-sm min-h-[400px]">
                {filteredSections
                  .filter((section) => section.id === activeSection)
                  .map((section) => (
                    <div key={section.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-3 mb-8 border-b border-border-light dark:border-border-dark pb-6">
                        <div className="bg-primary/10 p-3 rounded-2xl">
                          <span className="material-symbols-outlined text-primary-dark dark:text-primary text-3xl">
                            {section.icon}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-white">
                          {section.title}
                        </h2>
                      </div>
                      <div
                        className="prose prose-slate dark:prose-invert max-w-none prose-h3:text-xl prose-h3:font-bold prose-h4:text-lg prose-h4:font-bold prose-p:text-text-secondary dark:prose-p:text-slate-400"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </div>
                  ))}

                {filteredSections.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-full mb-4">
                      <span className="material-symbols-outlined text-slate-400 text-4xl">search_off</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No se encontraron resultados</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Intenta con otros términos de búsqueda.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 bg-surface-light dark:bg-surface-dark rounded-2xl p-8 border border-border-light dark:border-border-dark shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">
                      ¿Necesitas más ayuda?
                    </h3>
                    <p className="text-text-secondary dark:text-slate-400">
                      Si no encuentras lo que buscas, nuestro equipo de soporte está aquí para ayudarte.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-teal-950 font-bold shadow-lg shadow-primary/20 transition-all">
                      <span className="material-symbols-outlined text-[20px]">email</span>
                      <span>Correo</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white font-bold hover:bg-[#f2f8f7] dark:hover:bg-white/5 transition-all">
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;