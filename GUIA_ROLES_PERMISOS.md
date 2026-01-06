# 🔐 Guía de Roles y Permisos - E.S.E. Cantagallo

Esta guía explica el sistema de roles implementado en la aplicación Laura AI y las restricciones de acceso para cada tipo de usuario.

---

## 👥 **Tipos de Roles**

La aplicación cuenta con **dos roles principales**:

### 1. 👤 **Usuario (user)**
Rol básico para personal médico o administrativo que necesita gestionar sus propias citas.

### 2. 👨‍💼 **Administrador (admin)**
Rol con acceso completo a todas las funcionalidades del sistema.

---

## 🎯 **Permisos por Rol**

### 👤 **ROL: Usuario**

#### ✅ **Acceso Permitido:**

**Dashboard**
- ✅ Ver sus propias estadísticas
- ✅ Ver sus citas de hoy y mañana
- ✅ Ver sus mensajes sin leer
- ✅ Ver sus próximas citas
- ✅ Recibir insights de Laura AI personalizados

**Citas (Appointments)**
- ✅ Ver **solo sus propias citas**
- ✅ Crear nuevas citas para sus pacientes
- ✅ Confirmar sus citas pendientes
- ✅ Reprogramar sus citas
- ✅ Cancelar sus citas
- ✅ Filtrar por estado (pendiente, confirmada, cancelada, etc.)
- ✅ Buscar en sus citas

**Ayuda (Help)**
- ✅ Acceso completo a la documentación
- ✅ Ver tutoriales y guías

#### ❌ **Acceso Restringido:**

**Módulos NO Visibles en el Menú:**
- ❌ Mensajes (Messages)
- ❌ Pacientes (Patients)
- ❌ Médicos (Doctors)
- ❌ Reportes (Reports)
- ❌ Configuración (Settings)
- ❌ Gestión de Usuarios (Users)
- ❌ Comunicados Internos (Admin)

**Datos Protegidos:**
- ❌ No puede ver citas de otros usuarios
- ❌ No puede ver mensajes de otros usuarios
- ❌ No puede ver pacientes de otros usuarios
- ❌ No puede acceder a reportes globales
- ❌ No puede modificar configuraciones del sistema

---

### 👨‍💼 **ROL: Administrador**

#### ✅ **Acceso Completo:**

**Dashboard**
- ✅ Ver estadísticas **globales de toda la clínica**
- ✅ Ver todas las citas del día (de todos los usuarios)
- ✅ Ver todos los mensajes sin leer
- ✅ Ver todas las próximas citas
- ✅ Insights de Laura AI sobre la operación completa

**Mensajes (Messages)**
- ✅ Ver **todos los mensajes** de todos los pacientes
- ✅ Responder mensajes
- ✅ Marcar como leído/no leído
- ✅ Eliminar conversaciones

**Pacientes (Patients)**
- ✅ Ver **todos los pacientes** del sistema
- ✅ Crear nuevos pacientes
- ✅ Editar información de cualquier paciente
- ✅ Eliminar pacientes
- ✅ Buscar y filtrar pacientes

**Citas (Appointments)**
- ✅ Ver **todas las citas** de todos los usuarios
- ✅ Crear citas para cualquier médico
- ✅ Confirmar, reprogramar o cancelar cualquier cita
- ✅ Vista de calendario completa
- ✅ Gestión total de la agenda

**Médicos (Doctors)**
- ✅ Ver todos los médicos
- ✅ Agregar nuevos médicos
- ✅ Editar información de médicos
- ✅ Gestionar especialidades y horarios
- ✅ Activar/desactivar médicos

**Reportes (Reports)**
- ✅ Acceso a todos los reportes analíticos
- ✅ Estadísticas por médico
- ✅ Métricas de rendimiento
- ✅ Gráficos de actividad
- ✅ Exportar datos

**Configuración (Settings)**
- ✅ Configurar parámetros del sistema
- ✅ Gestionar horarios de atención
- ✅ Configurar tipos de citas
- ✅ Personalizar la aplicación

**Gestión de Usuarios (Users)**
- ✅ Ver todos los usuarios del sistema
- ✅ Cambiar roles (user ↔ admin)
- ✅ Activar/desactivar usuarios
- ✅ Gestionar permisos

**Comunicados Internos (Admin)**
- ✅ Crear anuncios para todo el personal
- ✅ Activar/desactivar comunicados
- ✅ Eliminar anuncios antiguos
- ✅ Gestionar banners informativos

---

## 🔒 **Seguridad Implementada**

### **Nivel 1: Interfaz de Usuario**
- Los módulos restringidos **no aparecen en el menú** para usuarios normales
- Los botones de acciones sensibles están ocultos

### **Nivel 2: Rutas Protegidas**
- Si un usuario intenta acceder directamente a una URL restringida (ej: `/users`), será **redirigido automáticamente** al Dashboard
- Mensaje de error: "Acceso denegado. Se requieren permisos de administrador."

### **Nivel 3: Base de Datos (RLS)**
- **Row Level Security (RLS)** en Supabase garantiza que:
  - Los usuarios solo pueden consultar **sus propios datos**
  - Incluso si manipulan el código del navegador, la base de datos rechazará las consultas no autorizadas
  - Los administradores tienen acceso completo validado por el JWT

---

## 🔄 **Cambio de Roles**

### **¿Quién puede cambiar roles?**
Solo los **Administradores** pueden cambiar el rol de otros usuarios.

### **Restricciones:**
- ❌ Un administrador **NO puede degradarse a sí mismo** a usuario
- ✅ Puede promover usuarios a administrador
- ✅ Puede degradar otros administradores a usuario (si hay más de uno)

### **Cómo cambiar un rol:**
1. Inicia sesión como **Administrador**
2. Ve a **Gestión de Usuarios** (`/users`)
3. Busca el usuario que deseas modificar
4. Usa el selector de rol para cambiar entre "Usuario" y "Administrador"
5. El cambio se aplica **inmediatamente**

---

## 📊 **Comparativa de Acceso**

| Módulo/Función | Usuario | Administrador |
|----------------|---------|---------------|
| Dashboard (datos propios) | ✅ | ✅ |
| Dashboard (datos globales) | ❌ | ✅ |
| Citas propias | ✅ | ✅ |
| Citas de otros | ❌ | ✅ |
| Mensajes | ❌ | ✅ |
| Pacientes | ❌ | ✅ |
| Médicos | ❌ | ✅ |
| Reportes | ❌ | ✅ |
| Configuración | ❌ | ✅ |
| Gestión de Usuarios | ❌ | ✅ |
| Comunicados | ❌ | ✅ |
| Ayuda | ✅ | ✅ |

---

## 🧪 **Crear Usuario de Prueba**

Para validar las restricciones, puedes crear un usuario de prueba:

### **Opción 1: Desde la Aplicación**
1. Ve a `/register`
2. Registra un nuevo usuario:
   - Email: `usuario.prueba@cantagallo.com`
   - Contraseña: `Prueba123!`
   - Nombre: Usuario
   - Apellido: Prueba
3. El usuario se creará automáticamente con rol `user`
4. Inicia sesión con esas credenciales para probar las restricciones

### **Opción 2: Desde Supabase Dashboard**
1. Ve a Authentication → Users
2. Crea un nuevo usuario manualmente
3. En `raw_user_meta_data`, asegúrate de que `role` esté configurado como `"user"`

---

## 🔍 **Verificar Rol Actual**

### **Desde la Interfaz:**
- El rol se muestra en el **menú de perfil** (esquina superior derecha)
- Los módulos visibles en el sidebar indican tu nivel de acceso

### **Desde la Base de Datos:**
```sql
-- Ver todos los usuarios y sus roles
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'first_name' as nombre
FROM auth.users;
```

---

## 🛡️ **Mejores Prácticas de Seguridad**

1. **Principio de Menor Privilegio**: Asigna el rol `user` por defecto y promociona a `admin` solo cuando sea necesario.

2. **Auditoría Regular**: Revisa periódicamente la lista de administradores en `/users`.

3. **Contraseñas Seguras**: Exige contraseñas fuertes para todos los usuarios, especialmente administradores.

4. **Sesiones Activas**: Cierra sesión al terminar de usar la aplicación en dispositivos compartidos.

5. **Múltiples Administradores**: Mantén al menos 2 administradores para evitar bloqueos si uno pierde acceso.

---

## 📞 **Soporte**

Si necesitas:
- Cambiar tu rol
- Recuperar acceso
- Reportar un problema de permisos

Contacta al administrador principal del sistema.

---

**Última actualización:** Enero 2026  
**E.S.E. Centro de Salud con Camas Cantagallo**
