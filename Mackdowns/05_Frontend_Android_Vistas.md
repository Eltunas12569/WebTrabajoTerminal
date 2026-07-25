# 04. Frontend Móvil: Vistas de Usuario, Autenticación y Flujos (Kotlin / Android)

Este documento detalla la estructura y el comportamiento de las pantallas, lógica de sesión y consumo de API en la aplicación móvil en Android (Kotlin/Jetpack Compose).

## 1. Configuración del Proyecto y Manifiesto
- **`AndroidManifest.xml`:**
  - Solicita el permiso `android.permission.INTERNET` [cite: 24].
  - Define `SplashActivity` como el punto de entrada principal (Launcher) [cite: 24].
  - Permite tráfico de red no cifrado (`android:usesCleartextTraffic="true"`) y declara actividades como `MainActivity`, `HomeActivity`, `AdminHomeActivity`, etc. [cite: 24].
- **Capa de Red (`RetrofitClient.kt`):**
  - Configura el cliente HTTP usando Retrofit y GsonConverterFactory, apuntando a `http://10.100.91.88:3000` (el backend de Node.js) [cite: 30].

## 2. Gestión de Sesión (`SessionManager.kt`)
- Utiliza `SharedPreferences` para manejar el estado de autenticación de forma persistente y local [cite: 31].
- **Datos almacenados:**
  - Token JWT (`user_token`) [cite: 31].
  - Identificador de usuario (`user_id`), Rol (`user_rol`), Nombres y Apellidos [cite: 31].
  - Bandera booleana de estado de login (`is_logged_in`) [cite: 31].
  - Gestión de notificaciones vistas: Almacena y recupera el último ID visto por módulo dentro de un club (Ej. "visto_{clubId}_{modulo}") [cite: 31].

## 3. Autenticación (Login, Registro y Splash)
### `SplashActivity`
- Verifica si hay una sesión activa (`isLoggedIn()`) [cite: 32].
- Si existe, redirige según el rol (Admin -> `AdminHomeActivity`, Otros -> `HomeActivity`). Si no, dirige a `HomeActivity` (vista de invitado) [cite: 32].

### `MainActivity` (Login)
- Interfaz Compose de inicio de sesión que captura correo institucional y contraseña [cite: 25].
- Llama a `RetrofitClient.instance.loginUser` [cite: 25].
- **Gestión de Respuestas:** Guarda la sesión usando `SessionManager` en caso de éxito y enruta a la pantalla principal correspondiente según el rol del usuario [cite: 25]. Muestra errores provistos por el servidor (ej. "cuenta bloqueada" o "credenciales incorrectas") [cite: 25].

### `RegisterActivity` (Registro)
- Formulario de registro dinámico basado en el tipo de usuario (Alumno o Profesor) [cite: 29].
- **Validaciones Locales:**
  - Contraseñas fuertes usando la expresión regular `^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$` [cite: 29].
  - Verificación de dominio de correo: `@alumno.ipn.mx` para alumnos, y `@ipn.mx` (pero no alumno) para profesores [cite: 29].
  - Validación de longitud para campos específicos (NSS a 11, boleta a 10) e impide enviar si están incompletos [cite: 29].
- **Flujo de Éxito:** Si el registro (`registerUser`) tiene éxito, ejecuta automáticamente un inicio de sesión (`loginUser`), guarda la sesión, muestra una animación Lottie de éxito y enruta al dashboard [cite: 29].

## 4. Pantallas Principales y Navegación
### `HomeActivity` (Dashboard de Usuario)
- Actúa como la pantalla principal tanto para usuarios no autenticados (invitados) como para logueados [cite: 33].
- Muestra el listado global de avisos consumiendo el endpoint `RetrofitClient.instance.getAvisos` [cite: 33].
- Si el usuario está autenticado:
  - Recupera las invitaciones pendientes a clubes [cite: 33].
  - Muestra una campana de notificaciones interactiva que permite aceptar o rechazar invitaciones pendientes llamando al endpoint respectivo [cite: 33].
  - Provee accesos a la vista "Mis Clubes" y la vista "Mi Perfil" (haciendo clic en el avatar) [cite: 33].

### `PerfilActivity` (Gestión de Perfil de Usuario)
- Permite la visualización y edición de los datos del usuario, obteniéndolos mediante `RetrofitClient.instance.getPerfil` [cite: 28].
- **Estructura de la vista:**
  - Información Personal (editable) [cite: 28].
  - Datos Institucionales (Bloqueados, ej. Boleta, Correo, NSS, Carrera) [cite: 28].
  - Secciones de Información de Salud y Contactos de Emergencia (Contactos 1 y 2) [cite: 28].
  - Opciones de cambio de contraseña [cite: 28].
- Se utiliza `RetrofitClient.instance.updatePerfil` para enviar los datos modificados al backend [cite: 28].

## 5. Gestión de Clubes (Frontend)
### `MisClubesActivity` (Listado y Uniones)
- Obtiene y muestra los clubes del usuario llamando a `RetrofitClient.instance.getMisClubes` [cite: 26].
- **Tipos de visualización de Club:** Identifica el rol del usuario en el club (ej. "encargado_profesor", "encargado_alumno", "miembro") y formatea el color/texto de la tarjeta [cite: 26].
- **Flujos Especiales dentro de la Tarjeta:**
  - Si el club está "esperando_firmas", los profesores titulares pueden ver una barra de progreso, visualizar un modal con el estado (aceptó/pendiente) de los 20 miembros requeridos, y si se cumple la cuota, enviar el club a revisión [cite: 26].
  - Si el club está "rechazado", el encargado puede ver el motivo y es redirigido a `EditarClubActivity` para realizar correcciones [cite: 26].
- Permite a cualquier usuario unirse a un club existente usando un código de unión (Unirse por Código) [cite: 26].

### `NuevoClubActivity` (Propuesta de Club)
- Vista para crear la solicitud de un nuevo club. Solo accesible por profesores (`miRol == 3`) [cite: 27].
- **Campos:** Nombre, objetivo, actividades, cronograma dinámico, espacios solicitados y justificación del impacto [cite: 27].
- **Asignación de Roles:** Permite buscar entre todos los usuarios para asignar:
  - 1 Estudiante Representante (`alumnoSel`) [cite: 27].
  - 19 Integrantes obligatorios adicionales (`miembrosSeleccionados`) [cite: 27].
- Llama a `RetrofitClient.instance.crearClub` con los datos recopilados [cite: 27].
