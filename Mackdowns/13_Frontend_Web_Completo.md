# 13. Arquitectura Frontend Web Completa (React & Vite)

Este documento centraliza y consolida la estructura, componentes, servicios y vistas de la aplicación web del Sistema Gestor de Clubes Deportivos de ESCOM. La plataforma está construida utilizando React 19, empaquetada con Vite y conectada en tiempo real mediante WebSockets.

## 1. Configuración Core, Red y Estado Global
- **`src/main.jsx`**: Punto de montaje en el DOM utilizando `createRoot` de React 19 envuelto en `StrictMode`.
- **`src/App.jsx`**: Enrutador central (`BrowserRouter`) que declara la tabla completa de rutas y define las guardias de seguridad basadas en roles (RBAC) con `ProtectedRoute`.
- **`src/services/api.js`**: Cliente Axios centralizado con interceptor de peticiones (inyección automática del token JWT en `Authorization: Bearer <token>`) e interceptor de respuestas (purga de sesión y redirección automática ante errores HTTP 401).
- **`src/context/AuthContext.jsx`**: Proveedor del estado global de autenticación (`useAuth()`), responsable de persistir las claves `user_data` y `token` en `localStorage` y gestionar los métodos `loginUser` y `logout`.

## 2. Flujo de Autenticación, Registro y Perfil
- **`Login.jsx`**: Captura de credenciales institucionales, control visual de errores por tasa de peticiones o bloqueo temporal de cuenta, y enrutamiento inteligente por rol (`/admin` para administradores; `/gestion` para alumnos y profesores).
- **`Register.jsx`**: Formulario dinámico por rol. Aplica validaciones estrictas:
  - Alumnos (Rol 2): Correo `@alumno.ipn.mx`, boleta de 10 dígitos, NSS de 11 dígitos y carrera.
  - Profesores (Rol 3): Correo `@ipn.mx` y número de empleado.
  - Validación de contraseña con expresión regular y aceptación obligatoria del Aviso de Privacidad.
- **`VerificarCuentaPage.jsx`**: Activación de cuenta mediante código OTP numérico de 6 dígitos con temporizador de reenvío.
- **`RecuperarPasswordPage.jsx` & `CambiarPasswordPage.jsx`**: Restablecimiento y actualización de contraseñas.
- **`PerfilPage.jsx`**: Inspección de datos institucionales protegidos y edición de la Ficha Médica de Emergencia (tipo de sangre, alergias/condiciones y contactos familiares).

## 3. Dashboards, Clubes y Centro de Creación con Prioridades
- **`GestionDashboard.jsx`**: Tablero general de alumnos y docentes. Integra el muro de avisos ordenados por prioridad (Alta en rojo `#dc3545`, Normal en azul, Baja en verde), catálogo de clubes inscritos, explorador de clubes y calendario mensual integrado.
- **`AccionesAlumno.jsx`**: Módulo interactivo para unirse a un club mediante código alfanumérico y bandeja de confirmación de invitaciones pendientes.
- **`CrearClubPage.jsx`**: Propuesta de fundación de nuevos clubes para profesores titulares, definiendo cronograma, objetivos, cupos e instalaciones.
- **`ClubDetailsPage.jsx`**: Portal unificado del club deportivo con pestañas especializadas (Información técnica, Muro de avisos, Agenda de eventos con RSVP y Directorio de miembros con ficha médica).
- **Centro de Creación y Publicación del Club:** Apartado desacoplado para encargados con:
  - Selector de prioridad en avisos (`Alta`, `Normal`, `Baja`).
  - Agendamiento de eventos con **notificación automática de Alta Prioridad** al muro de todos los integrantes vía WebSockets.

## 4. Módulos de Administración y Auditoría Institucional
- **`AdminDashboard.jsx`**: Panel de control general para el Administrador (`role_id: 1`). Incluye métricas globales, bandeja de aprobación de clubes (generando código de unión), rechazo justificado con motivo, y control de ciclo de vida (pausar, reactivar, eliminar).
- **`AdminUsersPage.jsx` & `AdminEditUserPage.jsx`**: Padrón general de usuarios con filtros por rol y estado de verificación, buscador predictivo y edición administrativa de perfiles.
- **`AdminCalendarioPage.jsx`**: Calendario institucional con todas las actividades y entrenamientos de la escuela.
- **`AvisosAdminPage.jsx`**: Emisor de comunicados oficiales a nivel escuela con prioridad configurable y auditoría de avisos.
- **`ClubDetailsAdminPage.jsx`**: Auditoría detallada de integrantes y estructura de un club específico.

## 5. Emergencias Médicas y Comunicación en Tiempo Real
- **`ClubEmergenciasPage.jsx`**: Directorio médico confidencial reservado para encargados y administradores. Muestra tipos de sangre, alergias, NSS y contactos de emergencia con botón ampliado de copiado rápido al portapapeles.
- **`ClubChatPage.jsx`**: Sala de conversación en vivo del club deportivo basada en WebSockets (`Socket.IO`), con conexión a sala `club_${id}`, carga de historial y scroll automático.
- **`CanalesChatPage.jsx`**: Canales institucionales privados para Directivos (`sala_directivos`) y Encargados (`sala_encargados`), con etiquetas dinámicas de club de procedencia para cada mensaje.
