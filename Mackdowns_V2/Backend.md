# Arquitectura Backend: Node.js, Express y WebSockets

Este documento describe a profundidad la arquitectura, lógica de negocio y configuraciones del servidor backend construido con Node.js y Express. Detalla archivo por archivo la capa de servicios, seguridad, modelos, controladores, API REST, comunicación en tiempo real y scripts de mantenimiento, garantizando un contexto absoluto del ecosistema.

## 1. Core del Servidor y Configuración (`/` y `/src/config`)

**`server.js`**
* **Propósito:** Punto de entrada principal. Envuelve la app de Express en un servidor HTTP nativo para habilitar WebSockets.
* **Detalles:** 
  * **CORS:** Implementa una lista blanca dinámica mediante `process.env.ALLOWED_ORIGINS`.
  * **Rate Limiting:** Usa `express-rate-limit` para proteger el servidor contra DDoS (límite global de 300 peticiones/15 min) y mitigar ataques de fuerza bruta en el login (límite de 10 peticiones/15 min).
  * **WebSockets (Socket.io):** Inicializa el motor de tiempo real. Implementa un handshake seguro mediante un middleware (`io.use`) que exige y decodifica un token JWT antes de aceptar la conexión. Maneja el aislamiento por salas (`socket.join('club_ID')`) y emite eventos como `nuevo_mensaje`.

**`src/config/db.js`**
* **Propósito:** Gestiona la conexión a la base de datos MySQL.
* **Detalles:** Crea un Pool de conexiones utilizando `mysql2`. Habilita `waitForConnections`, `connectionLimit` (por defecto 50) y `enableKeepAlive` para asegurar que el servidor soporte alta concurrencia sin saturar la base de datos. Exporta la versión de promesas (`pool.promise()`).

**`src/config/roles.js`**
* **Propósito:** Diccionario inmutable de roles.
* **Detalles:** Utiliza `Object.freeze` para mapear los roles del sistema (`ADMINISTRADOR: 1`, `ALUMNO: 2`, `PROFESOR: 3`, `ALUMNO_REPRESENTANTE: 4`) previniendo modificaciones accidentales en tiempo de ejecución.

## 2. Seguridad y Middlewares (`/src/middlewares`)

**`authMiddleware.js`**
* **Propósito:** Barrera de autenticación principal (Verificación de Identidad).
* **Detalles:** Intercepta peticiones buscando el encabezado `Authorization: Bearer <token>`. Decodifica el JWT con la firma secreta. Si es exitoso, inyecta el payload descifrado (`req.user`) conteniendo el `id` y el `rol` para las siguientes capas.

**`verificarCuentaMiddleware.js`**
* **Propósito:** Barrera secundaria de operatividad.
* **Detalles:** Intercepta peticiones de usuarios ya autenticados y consulta en la base de datos si su columna `verificado` es igual a 1. Si no han validado su cuenta mediante el código OTP, bloquea la acción con un error 403.

**`roleAuth.js`**
* **Propósito:** Control de Acceso Basado en Roles (RBAC).
* **Detalles:** Es una Factory Function (devuelve un middleware) que recibe un array de roles permitidos. Cruza esta lista contra `req.user.rol` (inyectado previamente por `authMiddleware`) y bloquea la operación con un 403 Forbidden si el usuario no tiene los privilegios.

## 3. Lógica de Negocio y Modelos (`/src/services` y `/src/models`)

**`src/models/userModel.js`**
* **Propósito:** Capa de abstracción de base de datos para entidades de usuario.
* **Detalles:** Ejecuta consultas JOIN complejas para unificar datos de las tablas `usuarios`, `roles`, `alumnos_detalles` y `profesores_detalles`. Contiene métodos críticos para la seguridad como `registrarIntentoFallido` (que activa el `bloqueado_hasta`) y `resetearIntentos`.

**`src/services/authService.js`**
* **Propósito:** Ejecuta las operaciones críticas de autenticación, transacciones ACID y recuperación de cuentas.
* **Detalles:**
  * **Mecanismo Anti-Fuerza Bruta:** Valida la columna `bloqueado_hasta`. Si la contraseña falla, incrementa los errores y bloquea la cuenta por 15 minutos tras 5 fallos.
  * **Registro Seguro (Transacciones ACID):** Utiliza bloqueos Anti-Carrera (`FOR UPDATE`) al verificar correos. Inserta en cascada al usuario, detalles, ficha médica y contactos, generando además un código OTP de 6 dígitos.
  * **Gestión de OTPs:** Coordina los flujos de verificación de cuenta (`verificarCuentaConOTP`, `reenviarCodigoOTP`) y restablecimiento de contraseña (`solicitarRecuperacion`, `restablecerPassword`), destruyendo los códigos tras su uso o caducidad (15 min).

**`src/services/emailService.js`**
* **Propósito:** Motor de envío de correos transaccionales.
* **Detalles:** Utiliza `nodemailer` para conectarse a un servicio SMTP. Contiene plantillas HTML responsivas para inyectar dinámicamente los códigos OTP (tanto para registro como para recuperación de contraseña) y los envía de forma asíncrona.

## 4. Controladores (`/src/controllers`)

**`authController.js`**
* **Propósito:** Puente entre las rutas HTTP y los servicios de autenticación y perfil.
* **Detalles:**
  * **Registro:** Aplica validaciones estrictas de dominio (`@alumno.ipn.mx` para rol 2, `@ipn.mx` para rol 3) y valida longitudes de NSS y boleta. Valida la aceptación obligatoria del aviso de privacidad.
  * **Actualización Dinámica de Perfil:** Maneja relaciones 1:N. Borra contactos de emergencia antiguos e inserta el nuevo arreglo exigiendo un mínimo de 2. Valida estrictamente los 8 tipos de sangre permitidos y bloquea el cambio de nombre si la cuenta ya está verificada.
  * **Validación y Recuperación:** Expone los métodos para que el router consuma los servicios de verificación OTP y reseteo de contraseñas.

## 5. Endpoints de la API REST (`/src/routes`)

**`authRoutes.js`**
* **Propósito:** Expone las rutas de sesión y seguridad.
* **Detalles:** Maneja las rutas públicas (`POST /login`, `POST /register`, `POST /recuperar-password`, `POST /restablecer-password`) y las rutas protegidas que exigen token (`GET /perfil`, `PUT /perfil`, `POST /verificar-cuenta`, `POST /reenviar-codigo`).

**`userRoutes.js`**
* **Propósito:** Endpoints utilitarios, buscadores y administrativos.
* **Detalles:**
  * **Selectores y Búsqueda:** `/professors` y `/students-in-charge` para el frontend. El Buscador Universal (`GET /`) está protegido por RBAC, exige un query de al menos 2 caracteres y aplica un `LIMIT 20` mediante un LEFT JOIN.
  * **Edición Administrativa:** Permite a los administradores (`GET/PUT /:id/admin-edit`) modificar detalles de otros usuarios (excepto otros administradores), controlando que los nuevos datos (correos, boletas) no existan previamente.

**`clubes.js`**
* **Propósito:** Enrutador principal del ciclo de vida operativo de los clubes.
* **Detalles:**
  * **Aprobaciones e Invitaciones:** `POST /` exige la asignación de 20 miembros iniciales. `PUT /:id/enviar-revision` cuenta en SQL que existan exactamente 20 firmas activas. Rutas de control de admin (`/aprobar`, `/rechazar`, `/pausar`, `/reactivar`).
  * **Módulos Internos:** Rutas anidadas `/chat`, `/avisos`, `/eventos`, `/recursos`.
  * **Interconexión Sockets:** Al publicar avisos o eventos, el controlador recupera la instancia global de socket (`req.app.get('socketio')`) y emite notificaciones directamente a la sala del club. 
  * **Asistencias:** Usa `ON DUPLICATE KEY UPDATE` para alternar respuestas de asistencia.

**`avisos.js`**
* **Propósito:** Gestión de anuncios globales e internos.
* **Detalles:**
  * **Mantenimiento Automático:** El `GET /` inyecta sentencias `UPDATE` previas al `SELECT` para apagar avisos vencidos, o los que no tienen fecha pero superaron los 7 días de antigüedad.
  * **Tablón Mixto (`/user/:userId`):** Consolida y ordena cronológicamente avisos globales vigentes más avisos internos de los clubes del usuario.
  * **Auditoría:** `/all-for-admin` y `DELETE /:tipo/:id` permiten al rol 1 auditar y borrar anuncios.

## 6. Scripts de Mantenimiento y Seeders (`/`)

**`limpiarDB.js`**
* **Propósito:** Herramienta de reset absoluto de la base de datos.
* **Detalles:** Apaga temporalmente la revisión de llaves foráneas (`FOREIGN_KEY_CHECKS = 0`) para poder ejecutar comandos `TRUNCATE` masivos en las 15 tablas del ecosistema (incluyendo `contactos_emergencia`). Reinicia los auto-incrementos, devolviendo la base a un estado prístino.

**`seed.js`**
* **Propósito:** Inyector masivo de datos realistas para desarrollo.
* **Detalles:** Limpia la base y genera rápidamente un Administrador, 30 profesores y 150 alumnos (con contraseñas encriptadas, NSS, boletas, etc.). Construye clubes activos y rechazados, inyectando historiales de liderazgo, eventos con asistencias, chats y solicitudes de recursos.

**`avisos_globales.js`**
* **Propósito:** Generador rápido de comunicados institucionales.
* **Detalles:** Trunca exclusivamente la tabla `avisos_globales` e inserta 10 comunicados frescos con diferentes prioridades y fechas de vencimiento a 7 días, facilitando pruebas de UI en el tablón móvil.