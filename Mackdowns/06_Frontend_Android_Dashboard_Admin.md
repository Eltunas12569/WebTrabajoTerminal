# 05. Frontend Móvil: Dashboard, Administración y Modelos (Kotlin / Android)

Este documento detalla la estructura y el comportamiento de las pantallas de administración, el panel de control interno del club, y los modelos de datos que sirven de interfaz con el backend.

## 1. Pantalla de Administración (`AdminHomeActivity.kt`)
- Esta pantalla es exclusiva para usuarios con rol de administrador [cite: 35].
- Obtiene y muestra la lista completa de clubes usando `RetrofitClient.instance.getAllClubes` [cite: 35].
- **Filtros y Búsqueda:** Implementa un buscador por texto y pestañas (chips) para filtrar por estado: "Revisiones" (`en_revision` o `rechazado`), "Activos" y "Pausados" (`inactivo`) [cite: 35].
- **Gestión de Estados:**
  - **Aprobar / Rechazar:** Permite cambiar el estado de clubes en revisión. Al rechazar, requiere ingresar un motivo justificado [cite: 35].
  - **Pausar / Reactivar:** Permite cambiar la visibilidad de clubes activos/inactivos [cite: 35].
  - **Eliminar:** Proporciona la opción de eliminar permanentemente un club a través de `RetrofitClient.instance.eliminarClub` [cite: 35].
  - **Editar:** Da acceso a `EditarClubActivity` para corregir detalles y asignaciones de encargados si es necesario [cite: 35, 38].

## 2. Edición y Revisión de Clubes (`EditarClubActivity.kt`)
- Recibe los datos actuales del club a través de extras en el `Intent` (nombre, objetivo, cronograma, encargados, etc.) y los inicializa en la vista [cite: 38].
- Permite modificar la información general, el plan de trabajo (cronograma dinámico de meses y actividades) y los detalles logísticos [cite: 38].
- **Reasignación de Liderazgo:** Contiene buscadores para asignar un nuevo Profesor Titular (filtrando por número de empleado o nombre) y un nuevo Alumno Representante (filtrando por boleta o nombre) consumiendo la lista de usuarios [cite: 38].
- Al guardar, emite los cambios mediante `RetrofitClient.instance.editarClub` dejando el estatus en `en_revision` y muestra una animación de éxito antes de regresar [cite: 38].

## 3. Panel de Control del Club (`ClubDashboardActivity.kt`)
- Pantalla principal al acceder a un club específico. Muestra el título, rol del usuario, y se divide en 4 pestañas navegables mediante un `BottomNavigationBar`: Chat, Avisos, Eventos y Recursos (este último oculto para miembros regulares) [cite: 37].
- **Integración Socket.io:**
  - Conecta a WebSockets (`io.socket.client.IO`) para tiempo real [cite: 37].
  - Al unirse, emite `unirse_club` con el ID correspondiente [cite: 37].
  - Escucha el evento `nuevo_mensaje` para actualizar el historial del chat [cite: 37].
  - Escucha el evento `notificacion_interna` para mostrar alertas (badges) visuales en las pestañas de "Avisos" y "Eventos" si hay nuevas publicaciones [cite: 37].
- **Gestión de Notificaciones (`SessionManager`):** Utiliza `setUltimoIdVisto` y `getUltimoIdVisto` para llevar un registro del último mensaje/aviso/evento visto y añadir un separador de "NUEVOS MENSAJES" en el chat y mostrar insignias [cite: 31, 37].

### 3.1 Pestaña: Chat (`ViewChatRealTime`)
- Carga el historial inicial desde `RetrofitClient.instance.getHistorialChat` [cite: 37].
- Usa `LazyColumn` con estado recordando la posición para animar el *scroll* hacia abajo tras la carga [cite: 37].
- Diferencia visualmente las burbujas propias de las ajenas [cite: 37].
- Los envíos se hacen a través de Socket.io (`socket.emit("enviar_mensaje")`) en lugar de peticiones HTTP POST [cite: 37].

### 3.2 Pestaña: Avisos (`ViewAvisosClub`)
- Obtiene la lista a través de `RetrofitClient.instance.getAvisosInternos` [cite: 37].
- Los encargados (alumno/profesor) pueden crear nuevos avisos que serán enviados al servidor y emitirán notificaciones push mediante Socket.io en el backend [cite: 37].

### 3.3 Pestaña: Eventos (`ViewEventosClub`)
- Recupera los eventos programados (`RetrofitClient.instance.getEventos`) que incluyen información de lugar, fecha, descripción, número de asistentes y respuesta previa del usuario [cite: 37].
- Los miembros pueden responder a la invitación ("¡Sí!" o "No voy"), llamando a `RetrofitClient.instance.responderAsistencia` (enviando 1 o 0, respectivamente) [cite: 36, 37].
- Permite a los encargados programar nuevos eventos [cite: 37].

### 3.4 Pestaña: Recursos (`ViewRecursosForm`)
- Exclusiva para encargados.
- Formulario detallado para pedir materiales o espacios (cantidad, marca, motivo, especificaciones) a la administración usando `RetrofitClient.instance.solicitarRecurso` [cite: 37].

## 4. Definición de Contratos (Modelos en `ApiService.kt`)
- Contiene todas las estructuras de datos (`data classes`) utilizadas por Gson para serializar y deserializar el JSON de las llamadas de Retrofit [cite: 36].
- **Modelos Destacados:**
  - `LoginResponse`, `RegisterRequest` (maneja campos nulables opcionales según el rol) [cite: 36].
  - `Club`, `CrearClubRequest`, `EditarClubRequest` [cite: 36].
  - `ChatMessage`, `EventoClub`, `AvisoInterno`, `MiembroClub` [cite: 36].
- Expone la interfaz completa de llamadas HTTP (`@GET`, `@POST`, `@PUT`, `@DELETE`) para los módulos descritos a lo largo de la arquitectura, conectando las vistas de Kotlin con los controladores de Node.js de forma tipada [cite: 36].
