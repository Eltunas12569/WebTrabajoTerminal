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
  * **Modelos:** Estructuras inmutables usadas por Gson. Se integraron modelos para el flujo OTP (`VerificarCuentaRequest`, etc.), banderas de verificación (`verificado`), y auditoría legal en el registro (`acepta_privacidad`). **Actualización:** Se eliminaron definitivamente las referencias y endpoints hacia `Solicitudes de Recursos` para simplificar la arquitectura.
  * **Endpoints:** Mapea las rutas exactas del backend (`@GET`, `@POST`, `@DELETE`, `@PUT`). Incluye un parámetro `rol` dinámico en `searchUsers` para blindar las asignaciones de profesores y alumnos.

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
* **Detalles técnicos:** El formulario muta dependiendo del RadioButton seleccionado (Alumno exige NSS y Boleta; Profesor exige Número de Empleado). **Actualización:** El formulario está fuertemente blindado usando `.filter { !it.isDigit() }` para evitar números en nombres/alergias y topes de 10 dígitos en teléfonos. Exige confirmación estricta y previene el abandono de la pantalla (`BackHandler`) si hay campos vacíos.

**`RecuperarPasswordActivity.kt`**
* **Propósito:** Flujo de recuperación de credenciales mediante OTP.
* **Detalles técnicos:** Pantalla de dos pasos. **Actualización:** Se implementó un control interactivo (Icono "Ojo") en los campos `OutlinedTextField` utilizando `PasswordVisualTransformation` y estados mutables para alternar la visibilidad de la nueva contraseña.

## 3. Dashboards Principales y Perfil

**`HomeActivity.kt`**
* **Propósito:** Dashboard principal para roles Alumno, Profesor e Invitados.
* **Detalles técnicos:** 
  * **Ciclo de vida reactivo:** Obliga a recargar los datos (avisos, estatus de verificación e invitaciones) cada vez que la vista entra en estado `ON_RESUME` apoyándose en `LifecycleEventObserver`.
  * **Banners Inteligentes:** Muestra una advertencia permanente si la cuenta no ha sido verificada.

**`AdminHomeActivity.kt`**
* **Propósito:** Panel de control principal de uso exclusivo para Administradores (Rol 1).
* **Detalles técnicos:** Listado de clubes con filtros por estado mediante `LazyRow` y `FilterChip`. Las tarjetas muestran información de contacto enriquecida y permiten gestionar clubes.

**`AdminAvisosActivity.kt`**
* **Propósito:** Panel de moderación y auditoría de comunicados (Exclusivo Rol 1).
* **Detalles técnicos:** Bloqueo de seguridad en `LaunchedEffect` que expulsa a usuarios no autorizados. Sistema de filtrado cruzado ajustado a la tabla unificada de anuncios.

**`PerfilActivity.kt`**
* **Propósito:** Pantalla para actualizar datos de usuario, salud, contactos de emergencia y seguridad.
* **Detalles técnicos:** 
  * **Hidratación y Reglas:** Consume `getPerfil` y mapea datos. **Actualización:** Se implementó un bloqueo de seguridad con `BackHandler` y `Toast` que impide salir si el perfil está incompleto (marcaje visual en rojo).
  * **Seguridad Visual:** El cambio de contraseñas incluye lógica interactiva para mostrar/ocultar el texto en los tres campos mediante `TrailingIcon`.

## 4. Gestión de Clubes (CRUD de Entidades)

**`MisClubesActivity.kt`**
* **Propósito:** Lista los clubes en los que el usuario tiene participación.
* **Detalles técnicos:** **Actualización:** Implementa un `DisposableEffect` con `Lifecycle.Event.ON_RESUME` que fuerza una petición silenciosa al backend al volver a la vista, garantizando que el cambio de estatus de "Rechazado" a "En Revisión" se refleje de forma instantánea sin requerir reinicios manuales.

**`NuevoClubActivity.kt` / `EditarClubActivity.kt`**
* **Propósito:** Formularios para proponer o corregir la creación de un club.
* **Detalles técnicos:** **Actualización:** Implementan búsquedas asíncronas estrictamente parametrizadas (`rol = "profesor"` / `rol = "alumno"`) conectadas al backend. Filtran adicionalmente en frontend (`!it.boleta.isNullOrBlank()`) para imposibilitar asignaciones erróneas en los Dropdowns de representantes.

## 5. Panel Interno de Clubes y Tiempo Real (Sockets)

**`ClubDashboardActivity.kt`**
* **Propósito:** Panel operativo interno (Bottom Navigation). **Actualización:** Se erradicó por completo el submódulo "Recursos". El panel se compone ahora de Chat, Avisos y Eventos.
* **Sockets:** Instancia `IO.socket` pasando el JWT.
* **Pestañas:** Chat subdividido (Global, Encargados, Directivos) con historial REST. Avisos unificados. Eventos manejados con calendarios y relojes experimentales de M3.

## 6. Interfaz y Estilos

**`Tema.kt`**
* **Propósito:** Repositorio centralizado de tokens de diseño para Jetpack Compose.
* **Detalles técnicos:** Expone `ColoresSTT` y `GradienteEncabezado` para unificar la UI en Material Design 3.