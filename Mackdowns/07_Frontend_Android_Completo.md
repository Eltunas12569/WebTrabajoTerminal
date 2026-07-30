# 07. Arquitectura Frontend Android (Kotlin & Jetpack Compose)

Este documento centraliza la estructura, modelos y vistas de la aplicación móvil del Sistema Gestor de Clubs. La app está construida nativamente en Android utilizando Kotlin y Jetpack Compose para la UI.

## 1. Configuración Core y Red
- **`AndroidManifest.xml`**: Define `SplashActivity` como launcher[cite: 22]. Permite tráfico cleartext (`usesCleartextTraffic="true"`) temporalmente para desarrollo[cite: 22].
- **`RetrofitClient.kt`**: Singleton que configura Retrofit apuntando a la IP local del backend (`http://10.100.91.88:3000`) utilizando `GsonConverterFactory`[cite: 15].
- **`SessionManager.kt`**: Gestiona las `SharedPreferences` para persistir el JWT (`user_token`), rol, ID, y control de notificaciones leídas (`visto_{clubId}_{modulo}`)[cite: 16].
- **`ApiService.kt`**: Contiene todos los *Data Classes* (ej. `LoginRequest`, `Club`, `EventoClub`) y la interfaz con las rutas REST (`@GET`, `@POST`, `@PUT`, `@DELETE`) mapeadas exactamente al backend en Node.js[cite: 23].

## 2. Flujo de Autenticación
- **`SplashActivity.kt`**: Punto de entrada. Revisa `sessionManager.isLoggedIn()` y enruta automáticamente a `AdminHomeActivity` (Rol 1) o `HomeActivity` (Roles 2 y 3) tras 2 segundos[cite: 17].
- **`MainActivity.kt`**: Pantalla de Login. Recibe correo institucional y contraseña, ejecuta la petición y guarda la sesión en caso de éxito[cite: 19].
- **`RegisterActivity.kt`**: Formulario dinámico. Exige validaciones estrictas (NSS 11 dígitos, Boleta 10 dígitos, correos `@alumno.ipn.mx` o `@ipn.mx` según el rol). Incluye validación Regex para contraseñas y animación Lottie de éxito[cite: 14].

## 3. Dashboards y Perfil
- **`HomeActivity.kt`**: Dashboard de usuarios regulares. Muestra el tablón de avisos globales, gestiona un diálogo interactivo de invitaciones pendientes (campanita) y permite navegar a otras secciones[cite: 18].
- **`AdminHomeActivity.kt`**: Panel de control administrativo. Lista todos los clubes con filtros (Revisiones, Activos, Pausados). Permite Aprobar, Rechazar (exigiendo motivo), Pausar, Reactivar y Eliminar clubes. Se refresca usando `LifecycleEventObserver`[cite: 27].
- **`PerfilActivity.kt`**: Pantalla dividida en Datos Personales (editables), Institucionales (bloqueados), Salud y Contactos de Emergencia (1 y 2). Permite cambio de contraseña validando la actual[cite: 13].

## 4. Gestión CRUD de Clubes
- **`MisClubesActivity.kt`**: Lista los clubes del usuario. Los profesores pueden lanzar clubes a revisión si alcanzan las 20 firmas. Los usuarios pueden unirse vía código[cite: 20].
- **`NuevoClubActivity.kt`**: Formulario de propuesta. Recopila Nombre, Objetivo, Cronograma dinámico (Mes/Actividad) e Impacto. Usa un buscador reactivo para seleccionar 1 Representante y 19 miembros obligatorios filtrando la lista global de usuarios[cite: 21].
- **`EditarClubActivity.kt`**: Vista pre-cargada con los datos del club para corregir motivos de rechazo. Permite reasignar al Profesor Titular y Alumno Representante[cite: 25].

## 5. Interfaz en Tiempo Real (Sockets)
- **`ClubDashboardActivity.kt`**: Panel interno del club dividido en 4 pestañas (Chat, Avisos, Eventos, Recursos).
  - **Sockets:** Conecta a `IO.socket()` y emite `unirse_club`. Escucha `nuevo_mensaje` para el chat y `notificacion_interna` para encender insignias rojas (Badges) en los tabs[cite: 24].
  - **Chat:** Muestra historial y nuevos mensajes en tiempo real[cite: 24].
  - **Eventos:** Permite programar eventos (con campo de texto libre para fecha) y a los miembros confirmar asistencia (Sí/No)[cite: 24].
  - **Recursos:** Formulario para solicitar material/espacios a la administración[cite: 24].