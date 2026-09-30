# 11. Frontend Web: Administración, Auditoría y Gestión Global (React)

Este documento detalla las pantallas y herramientas exclusivas del Administrador del Sistema (`role_id: 1`), diseñadas para la supervisión institucional, el padrón de usuarios, el control del ciclo de vida de los clubes y la emisión de comunicados generales.

## 1. Panel Maestro del Administrador (`AdminDashboard.jsx`)
Vista central de gestión deportiva institucional accesible desde la ruta protegida `/admin`:
- **Tarjetas de Estadísticas del Sistema:**
  - Contador de Clubes Activos en la escuela.
  - Solicitudes de Clubes Pendientes de Aprobación.
  - Total de Usuarios Registrados (desglosado por alumnos y profesores).
  - Volumen de Avisos y Eventos activos.
- **Bandeja de Aprobación de Clubes:**
  - Lista de clubes con estatus `pendiente` o `en_revision`.
  - **Aprobar Club:** Invoca `/api/clubes/:id/aprobar`. Genera automáticamente un código de unión alfanumérico único de 6 caracteres (ej. `AB12CD`) y cambia el estado a `activo`.
  - **Rechazar Club:** Despliega una ventana modal obligatoria donde el administrador redacta el motivo formal del rechazo (`motivo_rechazo`), notificando al profesor solicitante para sus respectivas correcciones.
- **Control de Ciclo de Vida de Clubes Existentes:**
  - **Pausar Club (`/api/clubes/:id/pausar`):** Cambia el estado a `inactivo` para suspender temporalmente actividades.
  - **Reactivar Club (`/api/clubes/:id/reactivar`):** Restaura el club a estado `activo`.
  - **Eliminar Club (`/api/clubes/:id`):** Elimina permanentemente el registro del club y gestiona la liberación o actualización de roles de los encargados.

## 2. Padrón y Gestión de Usuarios (`AdminUsersPage.jsx` y `AdminEditUserPage.jsx`)
- **`AdminUsersPage.jsx` (Padrón General):**
  - Muestra la tabla completa de usuarios registrados consumiendo `/api/users`.
  - **Filtros por Rol:** Permite segmentar por Administradores, Profesores Titulares, Alumnos Encargados y Miembros Alumnos.
  - **Buscador en Tiempo Real:** Filtra instantáneamente por nombre, apellidos, correo institucional, boleta o número de empleado.
  - **Indicador de Verificación:** Muestra insignias visuales para cuentas verificadas mediante OTP y cuentas pendientes.
  - Botón de acceso directo para la edición individual de cada cuenta.
- **`AdminEditUserPage.jsx` (Edición Administrativa):**
  - Permite al administrador corregir datos de cuenta (`/admin/usuarios/:id/editar`).
  - Habilita la reasignación de roles institucionales (promover a profesor o administrador).
  - Actualización de boletas, número de empleado y correo electrónico con validación de duplicados.

## 3. Calendario Institucional de Eventos (`AdminCalendarioPage.jsx`)
- Visor global de actividades deportivas en toda la ESCOM.
- Integra el componente `CalendarioEventos` en modo administrativo (`modo='admin'`).
- Permite filtrar por disciplina o club específico para auditar la ocupación de espacios deportivos, canchas y gimnasios de la escuela en fechas y horarios determinados.

## 4. Emisión y Supervisión de Avisos (`AvisosAdminPage.jsx`)
- Módulo de comunicación oficial institucional.
- **Publicador Oficial:** Formulario para redactar comunicados dirigidos a toda la comunidad estudiantil y docente, permitiendo seleccionar nivel de prioridad (`Alta Prioridad`, `Normal`, `Baja Prioridad`).
- **Auditoría de Avisos:** Muestra el listado de todos los avisos publicados en el sistema (tanto institucionales como internos de clubes), con opciones para consultar detalles y archivar o dar de baja comunicados obsoletos.

## 5. Auditoría Específica de Clubes (`ClubDetailsAdminPage.jsx`)
- Vista de inspección profunda accesible desde `/admin/club/:id`.
- Permite al administrador revisar la estructura interna de un club específico:
  - Lista completa de miembros inscritos y sus roles internos.
  - Información de contacto del Profesor Titular y Alumno Encargado.
  - Historial de solicitudes de material y equipamiento deportivo.
