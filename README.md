# SOFIA AI / E.S.E. Cantagallo - Laura AI

Sistema de Gestión Hospitalaria integral desarrollado para la E.S.E. Centro de Salud con Camas Cantagallo. Esta aplicación combina gestión de citas, control de pacientes, mensajería interna y capacidades de IA en una plataforma moderna, segura y accesible como PWA (Progressive Web App).

## 🚀 Tecnologías

El proyecto está construido con un stack moderno y eficiente:

- **Frontend:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Estado & Data Fetching:** [TanStack Query](https://tanstack.com/query/latest)
- **Routing:** [React Router](https://reactrouter.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)

## ✨ Características Principales

### 🔐 Control de Acceso Basado en Roles (RBAC)
- **Administradores:** Acceso total a todos los módulos, gestión global de citas, usuarios y pacientes.
- **Usuarios:** Acceso restringido a su propia información, citas y mensajes.
- **Seguridad:** Implementada tanto en frontend (protección de rutas) como en backend (Row Level Security - RLS).

### 📅 Gestión de Citas
- Programación visual de citas.
- Validación de disponibilidad en tiempo real.
- Reprogramación y cancelación con gestión de estados.

### 👥 Gestión de Pacientes
- Expedientes electrónicos de pacientes.
- Historial de consultas y datos personales.

### 💬 Mensajería Interna
- Sistema de chat seguro entre personal.
- Mensajes en tiempo real (vía Supabase Realtime).

### 📱 Progressive Web App (PWA)
- Instalable como aplicación nativa en dispositivos móviles y escritorio.
- Branding personalizado para E.S.E. Cantagallo.
- Iconos y manifest configurados para una experiencia integrada.

## 🛠️ Requisitos Previos

- Node.js (versión 18 o superior recomendada)
- npm o pnpm
- Una cuenta y proyecto configurado en Supabase

## 📥 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd SOFIA-AI
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   # o
   pnpm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en un ejemplo (o solicítalo al administrador) con las siguientes claves:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo local.
- `npm run build`: Compila la aplicación para producción.
- `npm run preview`: Vista previa local de la build de producción.
- `npm run lint`: Ejecuta el linter para buscar errores de código.

## 🔒 Seguridad y Roles

La seguridad es el núcleo de la aplicación:

1. **Frontend:** El `DashboardLayout` y las rutas protegidas (`Admin.tsx`, `Users.tsx`) verifican dinámicamente el rol del usuario (`user_metadata.role`) para mostrar u ocultar componentes.
2. **Backend (RLS):** Policies estrictas en la base de datos aseguran que **incluso si se salta el frontend**, un usuario sin permisos no puede leer ni escribir datos que no le corresponden.

## 📚 Documentación Adicional

Para detalles técnicos y guías específicas, consulta los documentos en la raíz del proyecto:

- [📄 Resumen de Implementación](./RESUMEN_IMPLEMENTACION.md) - Detalles técnicos profundos sobre RBAC y PWA.
- [📄 Guía de Roles y Permisos](./GUIA_ROLES_PERMISOS.md) - Explicación detallada de la lógica de seguridad.
- [📄 Guía de Instalación PWA](./GUIA_INSTALACION_PWA.md) - Instrucciones para instalar la app en dispositivos.

---
**Desarrollado para E.S.E. Centro de Salud con Camas Cantagallo**
