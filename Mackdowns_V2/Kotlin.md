# Arquitectura Frontend Android (Kotlin & Jetpack Compose)

Este documento detalla la estructura completa, patrones de diseño, componentes UI y flujo de datos de la aplicación móvil nativa desarrollada en Kotlin utilizando Jetpack Compose para el **Sistema Gestor de Clubs**. 

## 1. Estructura de Directorios

De acuerdo con la estructura del proyecto en Android Studio, los archivos están organizados en el paquete principal `com.example.stt`:

```text
app/
├── manifests/
│   └── AndroidManifest.xml
└── java/ (kotlin+java)
    └── com.example.stt/
        ├── AdminAvisosActivity.kt
        ├── AdminEditarUsuarioActivity.kt
        ├── AdminEventosActivity.kt
        ├── AdminHomeActivity.kt
        ├── AdminPoliticasActivity.kt
        ├── AdminUsuariosActivity.kt
        ├── ApiService.kt
        ├── AuditoriaClubesActivity.kt
        ├── ChatDirectivosActivity.kt
        ├── ChatEncargadosActivity.kt
        ├── ClubDashboardActivity.kt
        ├── DetalleClubActivity.kt
        ├── DirectorioEmergenciaActivity.kt
        ├── EditarClubActivity.kt
        ├── ExplorarClubesActivity.kt
        ├── GeneralActivity.kt
        ├── HomeActivity.kt
        ├── MainActivity.kt
        ├── MisClubesActivity.kt
        ├── NuevoClubActivity.kt
        ├── PerfilActivity.kt
        ├── RecuperarPasswordActivity.kt
        ├── RegisterActivity.kt
        ├── RetrofitClient.kt
        ├── SessionManager.kt
        ├── SplashActivity.kt
        ├── Tema.kt
        └── ValidarPoliticasActivity.kt
```

---

## 2. Núcleo, Red y Seguridad

Archivos encargados de la configuración base, comunicación con el servidor HTTP/WebSockets y persistencia segura de datos.

*   **`ApiService.kt`**
    *   **Propósito:** Define todos los contratos (Endpoints) de la API REST y los Modelos de Datos (Data Classes / DTOs).
    *   **Detalles técnicos:** Estructuras inmutables usadas por `Gson`. Incluye rutas para autenticación, gestión de perfiles, CRUD de clubes, avisos (globales e internos), eventos, manejo de emergencias médicas, administración profunda y control de versiones de políticas legales.
*   **`RetrofitClient.kt`**
    *   **Propósito:** Singleton que configura el cliente HTTP global de la aplicación.
    *   **Detalles técnicos:** Instancia Retrofit utilizando `GsonConverterFactory`. Configura un `HttpLoggingInterceptor` para depurar respuestas en modo DEBUG. La URL base se inyecta dinámicamente desde `BuildConfig.API_BASE_URL`.
*   **`SessionManager.kt`**
    *   **Propósito:** Administra el estado de autenticación y datos del usuario de forma local y segura.
    *   **Detalles técnicos:** Implementa `EncryptedSharedPreferences` (con encriptación AES-256 SIV/GCM) asegurando que el token JWT, los IDs, el rol y las banderas de seguridad (como `verificado`) no puedan ser extraídos del dispositivo.
*   **`Tema.kt`**
    *   **Propósito:** Repositorio centralizado de tokens de diseño para Jetpack Compose.
    *   **Detalles técnicos:** Define el objeto `ColoresSTT` con la paleta de colores institucional (Azul, Vino, Verde, grises y gradientes) para estandarizar la UI.

---

## 3. Autenticación y Flujo Inicial

Gestionan el acceso del usuario, el registro y la seguridad perimetral de la app.

*   **`SplashActivity.kt`**
    *   **Propósito:** Pantalla inicial de carga y enrutador inteligente.
    *   **Detalles técnicos:** Muestra una animación con el logotipo. Verifica si hay sesión activa (`SessionManager.isLoggedIn()`) y redirige a `ValidarPoliticasActivity` o al `HomeActivity` (para iniciar sesión).
*   **`MainActivity.kt`**
    *   **Propósito:** Vista de Inicio de Sesión (Login).
    *   **Detalles técnicos:** Captura correo y contraseña. Tras un login exitoso a través de Retrofit, guarda la sesión y enruta a la validación de políticas.
*   **`RegisterActivity.kt`**
    *   **Propósito:** Formulario de registro de usuarios.
    *   **Detalles técnicos:** Formulario dinámico que cambia si se selecciona "Alumno" (pide NSS, Boleta, Carrera) o "Profesor" (pide Número de Empleado). Incluye validaciones estrictas (Regex para contraseñas) y requiere aceptación explícita de privacidad.
*   **`RecuperarPasswordActivity.kt`**
    *   **Propósito:** Flujo de recuperación de credenciales.
    *   **Detalles técnicos:** Pantalla de dos pasos guiada por un código OTP enviado al correo institucional.
*   **`ValidarPoliticasActivity.kt`**
    *   **Propósito:** Punto de control legal (Gatekeeper).
    *   **Detalles técnicos:** Consulta al backend si el usuario ha aceptado la última versión de las políticas. Si no es así, bloquea el acceso a la app hasta que lea el resumen de cambios y marque las casillas de aceptación.

---

## 4. Dashboards Principales y Perfil

Vistas principales para el usuario común (Alumnos y Profesores).

*   **`HomeActivity.kt`**
    *   **Propósito:** Menú principal y "Hub" de información.
    *   **Detalles técnicos:** Muestra el Tablón de Avisos (ordenables), una sección interactiva para responder "Próximos Eventos", y un Centro de Notificaciones (invitaciones a clubes). Incorpora el Menú Lateral (`ModalNavigationDrawer`) adaptativo según el rol.
*   **`PerfilActivity.kt`**
    *   **Propósito:** Gestión de identidad, salud y seguridad del usuario.
    *   **Detalles técnicos:** Permite editar datos personales, tipo de sangre, alergias y requiere obligatoriamente **dos contactos de emergencia**. También incluye la tarjeta de Verificación OTP (si la cuenta aún no está validada mediante el código del correo). Implementa un `BackHandler` para impedir salir si faltan datos críticos.

---

## 5. Gestión y Exploración de Clubes (Usuario)

Permiten al usuario interactuar, proponer o unirse a los clubes de la escuela.

*   **`MisClubesActivity.kt`**
    *   **Propósito:** Lista de clubes a los que pertenece el usuario.
    *   **Detalles técnicos:** Muestra el estatus de cada club ("Activo", "En revisión", "Rechazado"). Los encargados pueden ver el progreso de firmas de sus alumnos y reenviar a revisión si el club fue rechazado, además de dar acceso directo al Directorio Médico.
*   **`ExplorarClubesActivity.kt`**
    *   **Propósito:** Catálogo público y unión por código.
    *   **Detalles técnicos:** Muestra solo clubes "activos". Incluye un buscador y una tarjeta superior para introducir un código privado de 6 letras y unirse a un club cerrado.
*   **`DetalleClubActivity.kt`**
    *   **Propósito:** Vista de lectura (Read-Only) para el catálogo.
    *   **Detalles técnicos:** Muestra el objetivo, impacto, cronograma oficial y horarios de un club para los interesados antes de unirse.
*   **`NuevoClubActivity.kt`** y **`EditarClubActivity.kt`**
    *   **Propósito:** Formularios de propuesta de creación y corrección de clubes.
    *   **Detalles técnicos:** Formularios masivos que incluyen la captura de objetivos, cronogramas dinámicos, selección de un alumno representante y búsqueda asíncrona de 19 miembros fundadores mediante consultas con *debounce* a la API.

---

## 6. Panel Interno de Clubes (Dashboard)

El espacio de trabajo colaborativo para un club en específico.

*   **`ClubDashboardActivity.kt`**
    *   **Propósito:** Contenedor principal de la operación del club.
    *   **Detalles técnicos:** Usa un `NavigationBar` (Bottom Navigation) con 3 pestañas:
        *   **Chat:** Implementa `Socket.IO` para mensajería en tiempo real con separación visual de mensajes nuevos y etiquetas de rol.
        *   **Avisos:** Tablón interno del club con distintivos de prioridad.
        *   **Eventos:** Control de actividades con un Selector de Fecha/Hora nativo y confirmación de asistencia (Voy / No voy). Los encargados pueden ver la lista de asistentes confirmados.
*   **`DirectorioEmergenciaActivity.kt`**
    *   **Propósito:** Vista crítica de salvaguarda médica (solo para Encargados y Administradores).
    *   **Detalles técnicos:** Muestra la lista de miembros destacando en rojo a quienes tienen condiciones médicas preexistentes o alergias. Permite llamar directamente a los contactos de emergencia mediante `Intent.ACTION_DIAL`. Permite expulsar miembros.

---

## 7. Comunicaciones Globales

Salas de chat especializadas que trascienden a un solo club.

*   **`ChatEncargadosActivity.kt`**
    *   **Propósito:** Sala de chat para todos los líderes de clubes activos (Profesores titulares y Alumnos representantes). Conectado vía Socket.IO.
*   **`ChatDirectivosActivity.kt`**
    *   **Propósito:** Sala exclusiva de comunicación directa entre los Administradores de la plataforma y los Encargados de los clubes para coordinación institucional.

---

## 8. Panel de Administración (Súperusuario)

Vistas exclusivas para los directivos y moderadores del sistema (Rol 1).

*   **`AdminHomeActivity.kt`**
    *   **Propósito:** Dashboard central del Administrador.
    *   **Detalles técnicos:** Lista todos los clubes divididos por pestañas (Revisiones, Activos, Pausados). Permite Aprobar, Rechazar (exigiendo un motivo escrito), Pausar, Reactivar o Eliminar clubes. También posee un botón flotante para crear "Avisos Globales" que llegarán a todos los usuarios.
*   **`AdminAvisosActivity.kt`**
    *   **Propósito:** Moderación de comunicados.
    *   **Detalles técnicos:** Permite filtrar entre avisos globales o de clubes individuales y eliminarlos si incumplen normativas.
*   **`AdminUsuariosActivity.kt`** y **`AdminEditarUsuarioActivity.kt`**
    *   **Propósito:** Gestión total de identidades.
    *   **Detalles técnicos:** Buscador global de usuarios. Permite al administrador forzar la modificación de datos institucionales (Carrera, Boleta, No. Empleado) o realizar la eliminación definitiva de una cuenta.
*   **`AdminEventosActivity.kt`**
    *   **Propósito:** Supervisión de la actividad en el campus.
    *   **Detalles técnicos:** Recupera los eventos de **todos** los clubes y los muestra en dos modalidades: una "Vista de Calendario" interactiva o una "Vista de Lista" filtrable (Próximos, Este mes, Pasados).
*   **`AdminPoliticasActivity.kt`**
    *   **Propósito:** Control legal de la plataforma.
    *   **Detalles técnicos:** Muestra estadísticas de cumplimiento (cuántos usuarios han firmado el aviso de privacidad). Permite publicar una nueva versión del aviso de privacidad y términos, lo que forzará a toda la escuela a re-aceptarlos.
*   **`AuditoriaClubesActivity.kt`**
    *   **Propósito:** Trazabilidad de liderazgo.
    *   **Detalles técnicos:** Permite buscar un club y visualizar el historial cronológico de quiénes han sido sus Profesores Titulares y Alumnos Representantes, con fechas de inicio y fin de gestión.

---

## 9. Archivos Auxiliares

*   **`GeneralActivity.kt`**
    *   **Propósito:** Actividad de *Placeholder* o comodín utilizada durante el desarrollo para funciones en construcción.