# 10. Frontend Web: Dashboards, Gestión de Clubes y Eventos (React)

Este documento describe la arquitectura y comportamiento del panel de gestión general, los mecanismos de integración a clubes, la creación de propuestas deportivas y el portal unificado del club con su respectivo centro de publicación con prioridades.

## 1. Tablero General de Usuario (`GestionDashboard.jsx`)
Pantalla principal para estudiantes y profesores inscritos en el sistema deportivo.
- **Muro de Avisos Priorizados:**
  - Consume `/api/avisos/user/:id`, combinando avisos globales institucionales y avisos específicos de los clubes del usuario.
  - **Jerarquía Visual y Ordenamiento:** Los avisos de alta prioridad se ordenan al inicio y se destacan con borde rojo (`#dc3545`) e insignia distintiva. Los avisos normales muestran borde azul (`#003366`) y los de baja prioridad borde verde (`#28a745`).
  - **Descarte Individual:** Los usuarios pueden descartar avisos leídos, almacenando las claves descartadas en `localStorage` sin alterar la base de datos.
- **Mis Clubes Inscritos:**
  - Lista interactiva de los clubes donde el usuario participa.
  - Distingue roles dentro del club: `👨‍🏫 Profesor Titular`, `🎓 Alumno Encargado` y `🏃 Miembro`.
  - Provee botones directos para acceder a la vista unificada (`/club/:id`) y a la sala de chat en vivo (`/chat/:id`).
- **Explorador de Clubes Activos:** Catálogo de disciplinas deportivas aprobadas para solicitar acceso o unirse.
- **Integración con Calendario:** Incorpora el componente `CalendarioEventos` con vista de las actividades programadas en el mes.

## 2. Acciones del Alumno (`src/components/AccionesAlumno.jsx`)
- **Unión por Código:** Permite al alumno ingresar un código único generado por un club (`/api/clubes/unirse`), vinculándolo automáticamente como miembro activo.
- **Bandeja de Invitaciones Pendientes:** Consulta `/api/clubes/invitaciones/pendientes`. Si un encargado invitó al alumno a sumarse a un club, se despliega una tarjeta con los botones "Aceptar" y "Rechazar", actualizando el padrón en tiempo real.

## 3. Propuesta y Registro de Club (`CrearClubPage.jsx`)
- Vista restringida exclusivamente al Profesor Titular (`role_id: 3`).
- **Datos Recopilados:**
  - Identificación: Nombre del club, disciplina deportiva, lema, misión y objetivos formativos.
  - Logística: Días de entrenamiento, horarios, espacios solicitados dentro de ESCOM y cupo máximo de participantes.
  - Requisitos de Inscripción: Nivel deportivo, equipo necesario y documentación requerida.
  - Imagen de Portada: URL o archivo representativo.
- **Ciclo de Aprobación:** Al enviarse, el club se registra con estatus inicial `pendiente` para su evaluación por el Administrador.

## 4. Portal Unificado del Club (`ClubDetailsPage.jsx`)
Centraliza todas las operaciones de un club deportivo en una sola interfaz con pestañas especializadas:
- **Pestaña 1: Información General (`detalles`):**
  - Ficha técnica completa del club, directivos a cargo, cupos disponibles, horarios de entrenamiento y código de unión para encargados.
- **Pestaña 2: Muro de Avisos (`avisos`):**
  - Muro limpio de comunicados emitidos por los encargados. Muestra autor, fecha formateada, título en negrita y etiquetas de prioridad (`🔴 Alta Prioridad`, `🔵 Prioridad Normal`, `🟢 Baja Prioridad`).
  - Incluye botón directo `✍️ Redactar Nuevo Aviso` para encargados.
- **Pestaña 3: Agenda de Eventos (`eventos`):**
  - Grid de actividades deportivas con insignia de calendario (mes y día).
  - Muestra detalles de sede, horario e indicador de prioridad.
  - **Sistema de RSVP (Asistencia):** Botones interactivos para que alumnos y profesores confirmen si asistirán o no al entrenamiento o partido.
  - Incluye botón directo `➕ Agendar Nuevo Evento` para encargados.
- **Pestaña 4: Directorio de Miembros (`miembros`):**
  - Tabla de integrantes con buscador por nombre/boleta y filtros por rol y estatus.
  - **Acceso a Ficha Médica:** Botón confidencial `🩺 Ficha Médica` disponible para el Profesor Titular y Alumno Encargado para abrir el expediente de contingencia de salud.

## 5. Centro de Creación y Publicación con Prioridades (`activeTab = 'publicar'`)
Apartado desacoplado y exclusivo para los encargados del club (`canManage`):
- **Barra de Herramientas:** Permite alternar la vista entre `📋 Ver Ambos`, `📢 Redactar Aviso` y `📅 Agendar Evento`.
- **Formulario de Publicación de Avisos:**
  - Captura Título/Asunto (opcional) y Mensaje oficial.
  - **Selector de Prioridad:** Botones interactivos con feedback visual para elegir entre:
    - 🔴 **Alta Prioridad:** Ordenado al inicio del muro y tableros con distintivo rojo.
    - 🔵 **Normal:** Publicación informativa general estándar.
    - 🟢 **Baja Prioridad:** Notas secundarias y recordatorios.
- **Formulario de Agendamiento de Eventos:**
  - Título de la actividad, fecha y hora (`datetime-local`), instalación o lugar, y requerimientos de asistencia.
  - **Selector de Prioridad del Evento:** `Alta Prioridad ⭐ (Recomendada)`, `Normal`, `Baja`.
  - **Notificación Automática de Alta Prioridad:** Al crear un evento, el sistema genera automáticamente un comunicado en la tabla de avisos con **Prioridad Alta**, notificando por WebSockets a todos los integrantes para asegurar máxima visibilidad de la fecha programada.
