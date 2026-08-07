Arquitectura Frontend Android (Kotlin & Jetpack Compose)

Este documento detalla la estructura completa, patrones de diseño, componentes UI y flujo de datos de la aplicación móvil nativa desarrollada en Kotlin utilizando Jetpack Compose. Está diseñada para proveer un contexto profundo sobre el funcionamiento de cada archivo y su comunicación con el backend de Node.js.

1. Núcleo, Red y Seguridad

AndroidManifest.xml

Propósito: Es el archivo de configuración base de la aplicación Android.

Detalles técnicos: Configura los permisos esenciales (android.permission.INTERNET) para la comunicación con la API. Habilita el tráfico HTTP local (android:usesCleartextTraffic="true") crítico para pruebas de desarrollo. Declara a SplashActivity como la vista de lanzamiento (Launcher).

RetrofitClient.kt

Propósito: Singleton que configura el cliente HTTP global de la aplicación.

Detalles técnicos: Instancia Retrofit utilizando GsonConverterFactory. Configura un interceptor de logs de OkHttp para depurar las respuestas en modo debug y establece timeouts estrictos de 15 segundos para conexión y lectura. La URL base se inyecta dinámicamente desde BuildConfig.API_BASE_URL (definida en el build.gradle.kts).

ApiService.kt

Propósito: Define los contratos (Endpoints) de la API y los Modelos de Datos (Data Classes).

Detalles técnicos:

Modelos: Estructuras inmutables usadas por Gson (ej. LoginResponse, Club, CrearClubRequest, EventoClub, ChatMessage). Maneja propiedades nulables para campos que no siempre existen en la DB.

Endpoints: Mapea las rutas exactas del backend usando anotaciones de Retrofit (@GET, @POST, @PUT, @DELETE). Las rutas protegidas exigen el parámetro @Header("Authorization") token: String para inyectar el JWT.

SessionManager.kt

Propósito: Administra el estado de autenticación y datos del usuario de forma local y segura.

Detalles técnicos: Implementa EncryptedSharedPreferences (con encriptación AES-256 en llaves y valores) asegurando que el token JWT, el ID de usuario y el rol no puedan ser extraídos aunque el dispositivo esté rooteado. Contiene métodos adicionales (setUltimoIdVisto, getUltimoIdVisto) para llevar memoria del último mensaje o aviso visto, vital para la lógica de insignias (badges).

2. Autenticación y Punto de Entrada

SplashActivity.kt

Propósito: Pantalla inicial de carga y enrutador inteligente.

Detalles técnicos: Renderiza un diseño centrado con el logo/texto del IPN usando Jetpack Compose. A través de un LaunchedEffect, espera 1.8 segundos y consulta SessionManager.isLoggedIn(). Si hay sesión, lee el rol y redirige silenciosamente a AdminHomeActivity (Rol 1) o HomeActivity (Roles 2 y 3). Si no, manda al usuario logueado como invitado a HomeActivity.

MainActivity.kt

Propósito: Vista de Inicio de Sesión (Login).

Detalles técnicos: Captura correo institucional y contraseña mediante componentes Compose reactivos (OutlinedTextField). Llama a loginUser en ApiService. Si la API responde con un 200, guarda el token y el rol en SessionManager y enruta al dashboard correspondiente. En caso de error (ej. 401 por cuenta bloqueada o contraseña incorrecta), procesa el JSON de error (errorBody()) para mostrar un Toast con la causa exacta.

RegisterActivity.kt

Propósito: Formulario complejo de registro de usuarios.

Detalles técnicos:

UI Reactiva: El formulario muta dependiendo del RadioButton seleccionado. Si es Alumno (Rol 2), exige NSS y Boleta; si es Profesor (Rol 3), exige Número de Empleado.

Validaciones Locales: Utiliza Regex para asegurar contraseñas fuertes, restringe correos al dominio del IPN según el rol y valida longitudes estrictas.

Encadenamiento: Si el registro (registerUser) tiene éxito, invoca automáticamente el login (loginUser) usando las mismas credenciales para generar la sesión, mostrando una animación Lottie (anim_success) antes de navegar al sistema.

3. Dashboards Principales y Perfil

HomeActivity.kt

Propósito: Dashboard principal para roles Alumno, Profesor e Invitados (no autenticados).

Detalles técnicos:

Tablón Mixto: Condiciona el renderizado. Si no hay sesión, obtiene el listado de avisos públicos (getAvisos). Si hay sesión activa, pide el tablón consolidado (getAvisosParaUsuario), integrando avisos globales e internos de sus clubes. Renderiza una lista moderna (LazyColumn con tarjetas ElevatedCard).

Centro de Notificaciones: Despliega un modal (Dialog) si el usuario interactúa con la campana (que incluye un badge reactivo). Permite aceptar o rechazar invitaciones a clubes mediante responderInvitacion.

BottomBar Dinámica: Muestra botones de login/registro si es visitante, o botones de perfil/mis clubes si tiene sesión.

AdminHomeActivity.kt

Propósito: Panel de control de uso exclusivo para Administradores (Rol 1).

Detalles técnicos:

Ciclo de vida reactivo: Se acopla al LocalLifecycleOwner con LifecycleEventObserver para ejecutar cargarDatos() (traer la lista completa de clubes) cada vez que la vista entra en estado ON_RESUME.

Filtros de Estado: Usa una barra de búsqueda y componentes FilterChip ("Revisiones", "Activos", "Pausados") que recalculan la colección visualizada dinámicamente (clubesFiltrados).

Gestión de Clubes: Las tarjetas permiten lanzar operaciones críticas con modales de confirmación (AlertDialog) para eliminar, pausar, reactivar, aprobar o rechazar (capturando el motivo del rechazo en un campo de texto extra).

PerfilActivity.kt

Propósito: Pantalla para actualizar datos de usuario, salud y contactos de emergencia.

Detalles técnicos:

Hidratación de Datos: En el LaunchedEffect inicial, consume getPerfil y mapea los datos a variables mutableStateOf.

Bussines Logic UI: El tipo de sangre está confinado a un ExposedDropdownMenuBox para evitar errores de escritura. Implementa una lista dinámica reactiva mutableStateListOf<EstadoContactoFormulario> que permite al usuario agregar o remover múltiples contactos, bloqueando la acción de guardado si hay menos de dos contactos válidos (según la regla ACID del backend).

GeneralActivity.kt

Propósito: Actividad contenedora de prueba o placeholder.

Detalles técnicos: Componente mínimo de Compose que imprime "Pantalla General en Construcción". Usada como plantilla para futuras vistas secundarias.

4. Gestión de Clubes (CRUD de Entidades)

MisClubesActivity.kt

Propósito: Lista los clubes en los que el usuario tiene participación (como miembro o encargado).

Detalles técnicos:

Dependiendo del estatus del club y el rol del usuario, se renderizan interfaces diferentes.

Si un club está en esperando_firmas y el usuario es el Profesor, pinta una barra de progreso (LinearProgressIndicator animada) de firmas de miembros. Si se llega a 20, habilita el botón enviar-revision.

Incluye un ExtendedFloatingActionButton múltiple para solicitar crear clubes (si es profesor) o unirse a un club mediante código alfanumérico (unirseClubPorCodigo).

NuevoClubActivity.kt

Propósito: Mega-formulario para proponer la creación de un nuevo club.

Detalles técnicos:

Recopila campos de texto libre (objetivos, espacios, impacto) y ensambla un cronograma mensual como una lista de objetos ActividadCronograma.

Buscadores con Debounce: La selección del alumno representante y los 19 miembros restantes se hace mediante busquedas asíncronas (searchUsers). Para no saturar el servidor, los bloques LaunchedEffect usan un delay(400) que pospone la llamada a la API hasta que el usuario deja de tipear.

Ensambla un objeto gigante (CrearClubRequest), que serializa el cronograma en formato JSON y extrae una lista de enteros (IDs) de los miembros antes de llamar a la API.

EditarClubActivity.kt

Propósito: Vista reactiva pre-cargada para subsanar motivos de rechazo administrativo.

Detalles técnicos: Extrae todos los datos actuales del Intent.extras enviados desde las pantallas de lista y los inyecta en los TextFields. Deserializa el cronograma en JSON a objetos para manipular la vista. Cuenta con la misma lógica de "Debounce Search" para permitir la reasignación de los líderes (Profesor/Alumno Encargado). Llama a editarClub (PUT).

5. Panel Interno de Clubes y Tiempo Real (Sockets)

ClubDashboardActivity.kt

Propósito: Panel operativo interno exclusivo para miembros activos de un club. Integra un Scaffold con un Bottom Navigation de 4 módulos (Chat, Avisos, Eventos y Recursos).

Sockets y Conexión (Core):

Instancia IO.socket pasando el JWT en el mapa de autenticación (opcionesSocket.auth = mapOf("token" to token)). Emite el evento inicial unirse_club pasando el clubId.

Escucha eventos globales asíncronos (nuevo_mensaje y notificacion_interna). Actualiza banderas booleanas para renderizar Badges (puntos rojos de notificación) en la barra de navegación inferior si el usuario no tiene la pestaña activa.

Pestaña 0: Chat Tiempo Real (VistaChatTiempoReal)

Consume la ruta REST getHistorialChat para la carga inicial. Escucha el socket para inyectar nuevos mensajes al estado (mensajes = mensajes + mensaje).

Detecta automáticamente cuál es el último mensaje que vio el usuario (usando SessionManager.getUltimoIdVisto) e inyecta dinámicamente el divisor visual "MENSAJES NUEVOS".

Usa estadoLista.animateScrollToItem(mensajes.size - 1) para el autoscroll inferior.

Pestaña 1: Avisos (VistaAvisosClub)

Pinta una lista (LazyColumn) mediante la llamada getAvisosInternos. Permite a los encargados enviar alertas llamando a crearAvisoInterno, lo que a su vez dispara los sockets desde el backend.

Pestaña 2: Eventos (VistaEventosClub)

Lista los eventos próximos e integra lógica condicional para que el usuario confirme si asistirá o no (Sí/No) llamando a responderAsistencia (ON DUPLICATE KEY UPDATE en backend).

Usa librerías M3 experimentales (DatePickerDialog, TimePicker) para armar manualmente el String estricto en formato "YYYY-MM-DD HH:mm:ss" antes de emitirlo.

Pestaña 3: Recursos (VistaFormularioRecursos)

Exclusivo para encargados. Recopila cantidades, especificaciones, y justificación (Material/Espacio) para enviarlo mediante solicitarRecurso.

6. Interfaz y Estilos

Tema.kt

Propósito: Repositorio centralizado de tokens de diseño para Jetpack Compose.

Detalles técnicos: Expone el objeto singleton ColoresSTT, el cual aloja instancias de Color correspondientes a la paleta institucional (Azul Institucional, Vino, Verde de confirmaciones, Grises de fondo y texto). Define el GradienteEncabezado usado en casi todas las TopAppBars del sistema para mantener uniformidad de marca.