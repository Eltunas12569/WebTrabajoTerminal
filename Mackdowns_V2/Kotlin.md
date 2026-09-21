# Arquitectura Frontend Android (Kotlin & Jetpack Compose)[cite: 1]

Este documento detalla la estructura completa, patrones de diseño, componentes UI y flujo de datos de la aplicación móvil nativa desarrollada en Kotlin utilizando Jetpack Compose[cite: 1]. Está diseñada para proveer un contexto profundo sobre el funcionamiento de cada archivo y su comunicación con el backend de Node.js[cite: 1].

## 1. Núcleo, Red y Seguridad[cite: 1]

**`AndroidManifest.xml`**[cite: 1]
* **Propósito:** Archivo de configuración base de la aplicación Android[cite: 1].
* **Detalles técnicos:** Configura los permisos esenciales (`android.permission.INTERNET`) para la comunicación con la API[cite: 1]. Habilita el tráfico HTTP local (`android:usesCleartextTraffic="true"`)[cite: 1]. Declara a `SplashActivity` como la vista de lanzamiento (Launcher) e incluye las nuevas actividades (`RecuperarPasswordActivity`, `AdminAvisosActivity`, etc.)[cite: 1].

**`RetrofitClient.kt`**[cite: 1]
* **Propósito:** Singleton que configura el cliente HTTP global de la aplicación[cite: 1].
* **Detalles técnicos:** Instancia Retrofit utilizando `GsonConverterFactory`[cite: 1]. Configura un interceptor de logs de OkHttp para depurar respuestas y establece timeouts estrictos de 15 segundos[cite: 1]. **La URL base se inyecta dinámicamente desde `BuildConfig.API_BASE_URL`**[cite: 1].

**`ApiService.kt`**[cite: 1]
* **Propósito:** Define los contratos (Endpoints) de la API y los Modelos de Datos (Data Classes)[cite: 1].
* **Detalles técnicos:**[cite: 1]
  * **Modelos:** Estructuras inmutables usadas por Gson[cite: 1]. Se integraron modelos para el flujo OTP (`VerificarCuentaRequest`, etc.), banderas de verificación (`verificado`), auditoría legal en el registro (`acepta_privacidad`, `version_aviso_privacidad`) y se expandió el modelo de eventos para incluir el `lugar`[cite: 1].
  * **Endpoints:** Mapea las rutas exactas del backend (`@GET`, `@POST`, `@DELETE`)[cite: 1]. Incluye rutas protegidas como el nuevo endpoint de borrado de anuncios (`eliminarAviso`)[cite: 1].

**`SessionManager.kt`**[cite: 1]
* **Propósito:** Administra el estado de autenticación y datos del usuario de forma local y segura[cite: 1].
* **Detalles técnicos:** Implementa `EncryptedSharedPreferences` (con encriptación AES-256) asegurando que el token JWT y los datos sensibles no puedan ser extraídos[cite: 1]. Almacena el estado `verificado` de la cuenta[cite: 1].

## 2. Autenticación y Punto de Entrada[cite: 1]

**`SplashActivity.kt`**[cite: 1]
* **Propósito:** Pantalla inicial de carga y enrutador inteligente[cite: 1].
* **Detalles técnicos:** Renderiza un diseño centrado usando Compose[cite: 1]. A través de un `LaunchedEffect`, espera 1.8 segundos y consulta `SessionManager.isLoggedIn()`[cite: 1]. Redirige a `AdminHomeActivity` (Rol 1), `HomeActivity` (Roles 2 y 3), o al flujo de invitados[cite: 1].

**`MainActivity.kt`**[cite: 1]
* **Propósito:** Vista de Inicio de Sesión (Login)[cite: 1].
* **Detalles técnicos:** Captura correo y contraseña[cite: 1]. Tras un login exitoso, guarda los datos (incluyendo el estado `verificado`) en `SessionManager` y enruta al dashboard correspondiente[cite: 1]. Enlaza hacia la actividad de recuperación de contraseña[cite: 1].

**`RegisterActivity.kt`**[cite: 1]
* **Propósito:** Formulario complejo de registro de usuarios y aceptación de privacidad[cite: 1].
* **Detalles técnicos:** El formulario muta dependiendo del RadioButton seleccionado (Alumno exige NSS y Boleta; Profesor exige Número de Empleado)[cite: 1]. Se mejoró el registro integrando nuevos campos para información médica desde el inicio[cite: 1]. Integra un Checkbox obligatorio para el **Aviso de Privacidad**, el cual detona un modal a pantalla completa que renderiza el documento legal inyectando la fecha del sistema en tiempo real[cite: 1]. Tras un registro exitoso, hace autologin y muestra un diálogo de instrucción[cite: 1].

**`RecuperarPasswordActivity.kt`**[cite: 1]
* **Propósito:** Flujo de recuperación de credenciales mediante OTP[cite: 1].
* **Detalles técnicos:** Pantalla de dos pasos[cite: 1]. Primero solicita el correo para disparar el servicio de Node.js[cite: 1]. En el segundo paso, captura el OTP recibido y las contraseñas nuevas, aplicando validación visual y confirmación de red[cite: 1].

## 3. Dashboards Principales y Perfil[cite: 1]

**`HomeActivity.kt`**[cite: 1]
* **Propósito:** Dashboard principal para roles Alumno, Profesor e Invitados[cite: 1].
* **Detalles técnicos:**[cite: 1]
  * **Ciclo de vida reactivo:** Obliga a recargar los datos (avisos, estatus de verificación e invitaciones) cada vez que la vista entra en estado `ON_RESUME` apoyándose en `LifecycleEventObserver`[cite: 1].
  * **Banners Inteligentes:** Muestra una advertencia permanente si la cuenta no ha sido verificada[cite: 1].
  * **Centro de Notificaciones:** Despliega un modal si el usuario interactúa con la campana, permitiendo aceptar o rechazar invitaciones a clubes[cite: 1].

**`AdminHomeActivity.kt`**[cite: 1]
* **Propósito:** Panel de control principal de uso exclusivo para Administradores (Rol 1)[cite: 1].
* **Detalles técnicos:** Listado de clubes con filtros por estado mediante `LazyRow` y `FilterChip`[cite: 1]. Las tarjetas de los clubes ahora muestran información de contacto enriquecida (correo, boleta/no. empleado del profesor y alumno), fecha de creación y código de unión[cite: 1]. Incluye un acceso directo en la barra superior hacia el moderador de anuncios[cite: 1].

**`AdminAvisosActivity.kt`**[cite: 1]
* **Propósito:** Panel de moderación y auditoría de comunicados (Exclusivo Rol 1)[cite: 1].
* **Detalles técnicos:** Implementa un bloqueo de seguridad en el `LaunchedEffect` que expulsa a usuarios no autorizados[cite: 1]. Posee un sistema de filtrado cruzado, ahora ajustado a la tabla unificada de anuncios (por Tipo: Global/Club y por Estado: Vigentes/Vencidos)[cite: 1]. Las tarjetas renderizan fechas precisas y permiten lanzar el borrado lógico/físico en el backend a través de diálogos de confirmación, cerrando el flujo con una animación Lottie de éxito[cite: 1].

**`PerfilActivity.kt`**[cite: 1]
* **Propósito:** Pantalla para actualizar datos de usuario, salud, contactos de emergencia y seguridad[cite: 1].
* **Detalles técnicos:**[cite: 1]
  * **Hidratación:** Consume `getPerfil` y mapea los datos a variables `mutableStateOf`[cite: 1].
  * **Reglas de Negocio:** La gestión de perfiles incluye los nuevos campos requeridos para la información médica[cite: 1]. El tipo de sangre está confinado a un `ExposedDropdownMenuBox`[cite: 1]. Implementa una lista dinámica reactiva `mutableStateListOf<EstadoContactoFormulario>` que exige un mínimo de dos contactos[cite: 1].
  * **Seguridad (Modificado):** El cambio de contraseñas se extrajo a un `AlertDialog` interactivo que previene errores obligando al usuario a repetir la nueva contraseña, validando la coincidencia exacta antes de enviar la carga útil al servidor[cite: 1].

## 4. Gestión de Clubes (CRUD de Entidades)[cite: 1]

**`MisClubesActivity.kt`**[cite: 1]
* **Propósito:** Lista los clubes en los que el usuario tiene participación[cite: 1].
* **Detalles técnicos:** Dependiendo del estatus del club y el rol del usuario, renderiza interfaces diferentes (ej. barra de progreso animada para recolectar firmas)[cite: 1]. El botón "Unirse con Código" está condicionado al estatus verificado de la cuenta[cite: 1].

**`NuevoClubActivity.kt` / `EditarClubActivity.kt`**[cite: 1]
* **Propósito:** Mega-formularios para proponer o corregir la creación de un club[cite: 1].
* **Detalles técnicos:** Recopilan campos de texto libre, ensamblan un cronograma (serializado a JSON) y realizan búsquedas asíncronas de usuarios (con debounce de 400ms y un mínimo de 2 caracteres en el `query` para proteger el servidor) para designar al alumno representante y los miembros extra[cite: 1].

## 5. Panel Interno de Clubes y Tiempo Real (Sockets)[cite: 1]

**`ClubDashboardActivity.kt`**[cite: 1]
* **Propósito:** Panel operativo interno que integra un Scaffold con un Bottom Navigation de 4 módulos (Chat, Avisos, Eventos y Recursos)[cite: 1].
* **Sockets y Conexión (Core):** Instancia `IO.socket` pasando el JWT en el mapa de autenticación (`opcionesSocket.auth = mapOf("token" to token)`)[cite: 1]. Emite el evento inicial `unirse_club` y actualiza badges de notificación al recibir eventos globales[cite: 1].
* **Pestañas:**[cite: 1]
  * **Chat:** La funcionalidad se modificó para incluir salas de chat separadas para directivos y encargados, integrando los debidos controles de acceso[cite: 1]. Consume historial inicial vía REST y escucha sockets para autoscroll y separadores de "Mensajes Nuevos"[cite: 1].
  * **Avisos:** Tablón asíncrono actualizado para consumir la nueva estructura unificada de la base de datos, garantizando coherencia al mostrar notificaciones de la agrupación y globales[cite: 1].
  * **Eventos (Modificado):** Usa librerías M3 experimentales (`DatePickerDialog`, `TimePicker`) para armar manualmente el String estricto en formato "YYYY-MM-DD HH:mm:ss"[cite: 1]. El formulario de creación y la tarjeta de UI ahora incluyen y renderizan el campo **Lugar** apoyados con iconografía de Material Design[cite: 1].
  * **Recursos:** Formulario detallado que captura tipo de agrupación, unidad, justificaciones, especificaciones y marcas sugeridas para requisiciones administrativas[cite: 1].

## 6. Interfaz y Estilos[cite: 1]

**`Tema.kt`**[cite: 1]
* **Propósito:** Repositorio centralizado de tokens de diseño para Jetpack Compose[cite: 1].
* **Detalles técnicos:** Expone el objeto singleton `ColoresSTT`, el cual aloja instancias de `Color` correspondientes a la paleta institucional y define un `GradienteEncabezado` utilizado a lo largo de toda la app[cite: 1].