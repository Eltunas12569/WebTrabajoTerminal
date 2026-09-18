# Arquitectura Frontend Android (Kotlin & Jetpack Compose)

Este documento detalla la estructura completa, patrones de diseño, componentes UI y flujo de datos de la aplicación móvil nativa desarrollada en Kotlin utilizando Jetpack Compose. Está diseñada para proveer un contexto profundo sobre el funcionamiento de cada archivo y su comunicación con el backend de Node.js.

## 1. Núcleo, Red y Seguridad

**`AndroidManifest.xml`**
* **Propósito:** Archivo de configuración base de la aplicación Android.
* **Detalles técnicos:** Configura los permisos esenciales (`android.permission.INTERNET`) para la comunicación con la API. Habilita el tráfico HTTP local (`android:usesCleartextTraffic="true"`). Declara a `SplashActivity` como la vista de lanzamiento (Launcher) e incluye las nuevas actividades (`RecuperarPasswordActivity`, `AdminAvisosActivity`, etc.).

**`RetrofitClient.kt`**
* **Propósito:** Singleton que configura el cliente HTTP global de la aplicación.
* **Detalles técnicos:** Instancia Retrofit utilizando `GsonConverterFactory`. Configura un interceptor de logs de OkHttp para depurar respuestas y establece timeouts estrictos de 15 segundos. **La URL base se inyecta dinámicamente desde `BuildConfig.API_BASE_URL`**.

**`ApiService.kt`**
* **Propósito:** Define los contratos (Endpoints) de la API y los Modelos de Datos (Data Classes).
* **Detalles técnicos:**
  * **Modelos:** Estructuras inmutables usadas por Gson. Se integraron modelos para el flujo OTP (`VerificarCuentaRequest`, etc.), banderas de verificación (`verificado`), auditoría legal en el registro (`acepta_privacidad`, `version_aviso_privacidad`) y se expandió el modelo de eventos para incluir el `lugar`.
  * **Endpoints:** Mapea las rutas exactas del backend (`@GET`, `@POST`, `@DELETE`). Incluye rutas protegidas como el nuevo endpoint de borrado de anuncios (`eliminarAviso`).

**`SessionManager.kt`**
* **Propósito:** Administra el estado de autenticación y datos del usuario de forma local y segura.
* **Detalles técnicos:** Implementa `EncryptedSharedPreferences` (con encriptación AES-256) asegurando que el token JWT y los datos sensibles no puedan ser extraídos. Almacena el estado `verificado` de la cuenta.

## 2. Autenticación y Punto de Entrada

**`SplashActivity.kt`**
* **Propósito:** Pantalla inicial de carga y enrutador inteligente.
* **Detalles técnicos:** Renderiza un diseño centrado usando Compose. A través de un `LaunchedEffect`, espera 1.8 segundos y consulta `SessionManager.isLoggedIn()`. Redirige a `AdminHomeActivity` (Rol 1), `HomeActivity` (Roles 2 y 3), o al flujo de invitados.

**`MainActivity.kt`**
* **Propósito:** Vista de Inicio de Sesión (Login).
* **Detalles técnicos:** Captura correo y contraseña. Tras un login exitoso, guarda los datos (incluyendo el estado `verificado`) en `SessionManager` y enruta al dashboard correspondiente. Enlaza hacia la actividad de recuperación de contraseña.

**`RegisterActivity.kt`**
* **Propósito:** Formulario complejo de registro de usuarios y aceptación de privacidad.
* **Detalles técnicos:** El formulario muta dependiendo del RadioButton seleccionado (Alumno exige NSS y Boleta; Profesor exige Número de Empleado). Integra un Checkbox obligatorio para el **Aviso de Privacidad**, el cual detona un modal a pantalla completa que renderiza el documento legal inyectando la fecha del sistema en tiempo real. Tras un registro exitoso, hace autologin y muestra un diálogo de instrucción.

**`RecuperarPasswordActivity.kt`**
* **Propósito:** Flujo de recuperación de credenciales mediante OTP.
* **Detalles técnicos:** Pantalla de dos pasos. Primero solicita el correo para disparar el servicio de Node.js. En el segundo paso, captura el OTP recibido y las contraseñas nuevas, aplicando validación visual y confirmación de red.

## 3. Dashboards Principales y Perfil

**`HomeActivity.kt`**
* **Propósito:** Dashboard principal para roles Alumno, Profesor e Invitados.
* **Detalles técnicos:**
  * **Ciclo de vida reactivo:** Obliga a recargar los datos (avisos, estatus de verificación e invitaciones) cada vez que la vista entra en estado `ON_RESUME` apoyándose en `LifecycleEventObserver`.
  * **Banners Inteligentes:** Muestra una advertencia permanente si la cuenta no ha sido verificada.
  * **Centro de Notificaciones:** Despliega un modal si el usuario interactúa con la campana, permitiendo aceptar o rechazar invitaciones a clubes.

**`AdminHomeActivity.kt`**
* **Propósito:** Panel de control principal de uso exclusivo para Administradores (Rol 1).
* **Detalles técnicos:** Listado de clubes con filtros por estado mediante `LazyRow` y `FilterChip`. Las tarjetas de los clubes ahora muestran información de contacto enriquecida (correo, boleta/no. empleado del profesor y alumno), fecha de creación y código de unión. Incluye un acceso directo en la barra superior hacia el moderador de anuncios.

**`AdminAvisosActivity.kt`**
* **Propósito:** Panel de moderación y auditoría de comunicados (Exclusivo Rol 1).
* **Detalles técnicos:** Implementa un bloqueo de seguridad en el `LaunchedEffect` que expulsa a usuarios no autorizados. Posee un sistema de filtrado cruzado (por Tipo: Global/Club y por Estado: Vigentes/Vencidos). Las tarjetas renderizan fechas precisas y permiten lanzar el borrado lógico/físico en el backend a través de diálogos de confirmación, cerrando el flujo con una animación Lottie de éxito.

**`PerfilActivity.kt`**
* **Propósito:** Pantalla para actualizar datos de usuario, salud, contactos de emergencia y seguridad.
* **Detalles técnicos:**
  * **Hidratación:** Consume `getPerfil` y mapea los datos a variables `mutableStateOf`.
  * **Reglas de Negocio:** El tipo de sangre está confinado a un `ExposedDropdownMenuBox`. Implementa una lista dinámica reactiva `mutableStateListOf<EstadoContactoFormulario>` que exige un mínimo de dos contactos.
  * **Seguridad (Modificado):** El cambio de contraseñas se extrajo a un `AlertDialog` interactivo que previene errores obligando al usuario a repetir la nueva contraseña, validando la coincidencia exacta antes de enviar la carga útil al servidor.

## 4. Gestión de Clubes (CRUD de Entidades)

**`MisClubesActivity.kt`**
* **Propósito:** Lista los clubes en los que el usuario tiene participación.
* **Detalles técnicos:** Dependiendo del estatus del club y el rol del usuario, renderiza interfaces diferentes (ej. barra de progreso animada para recolectar firmas). El botón "Unirse con Código" está condicionado al estatus verificado de la cuenta.

**`NuevoClubActivity.kt` / `EditarClubActivity.kt`**
* **Propósito:** Mega-formularios para proponer o corregir la creación de un club.
* **Detalles técnicos:** Recopilan campos de texto libre, ensamblan un cronograma (serializado a JSON) y realizan búsquedas asíncronas de usuarios (con debounce de 400ms y un mínimo de 2 caracteres en el `query` para proteger el servidor) para designar al alumno representante y los miembros extra.

## 5. Panel Interno de Clubes y Tiempo Real (Sockets)

**`ClubDashboardActivity.kt`**
* **Propósito:** Panel operativo interno que integra un Scaffold con un Bottom Navigation de 4 módulos (Chat, Avisos, Eventos y Recursos).
* **Sockets y Conexión (Core):** Instancia `IO.socket` pasando el JWT en el mapa de autenticación (`opcionesSocket.auth = mapOf("token" to token)`). Emite el evento inicial `unirse_club` y actualiza badges de notificación al recibir eventos globales.
* **Pestañas:**
  * **Chat:** Consume historial inicial vía REST y escucha sockets para autoscroll y separadores de "Mensajes Nuevos".
  * **Avisos:** Tablón asíncrono para publicar notificaciones exclusivas de la agrupación.
  * **Eventos (Modificado):** Usa librerías M3 experimentales (`DatePickerDialog`, `TimePicker`) para armar manualmente el String estricto en formato "YYYY-MM-DD HH:mm:ss". El formulario de creación y la tarjeta de UI ahora incluyen y renderizan el campo **Lugar** apoyados con iconografía de Material Design.
  * **Recursos:** Formulario detallado que captura tipo de agrupación, unidad, justificaciones, especificaciones y marcas sugeridas para requisiciones administrativas.

## 6. Interfaz y Estilos

**`Tema.kt`**
* **Propósito:** Repositorio centralizado de tokens de diseño para Jetpack Compose.
* **Detalles técnicos:** Expone el objeto singleton `ColoresSTT`, el cual aloja instancias de `Color` correspondientes a la paleta institucional y define un `GradienteEncabezado` utilizado a lo largo de toda la app.