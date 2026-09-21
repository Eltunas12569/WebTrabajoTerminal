# Arquitectura Backend: Node.js, Express y WebSockets[cite: 3]

Este documento describe a profundidad la arquitectura, lógica de negocio y configuraciones del servidor backend construido con Node.js y Express[cite: 3]. Detalla archivo por archivo la capa de servicios, seguridad, modelos, controladores, API REST, comunicación en tiempo real y scripts de mantenimiento, garantizando un contexto absoluto del ecosistema[cite: 3].

## 1. Core del Servidor y Configuración (`/` y `/src/config`)[cite: 3]

**`server.js`**[cite: 3]
* **Propósito:** Punto de entrada principal[cite: 3]. Envuelve la app de Express en un servidor HTTP nativo para habilitar WebSockets[cite: 3].
* **Detalles:**[cite: 3]
  * **CORS:** Implementa una lista blanca dinámica mediante `process.env.ALLOWED_ORIGINS`[cite: 3].
  * **Rate Limiting:** Usa `express-rate-limit` para proteger el servidor contra DDoS (límite global de 300 peticiones/15 min) y mitigar ataques de fuerza bruta en el login (límite de 10 peticiones/15 min)[cite: 3].
  * **WebSockets (Socket.io):** Inicializa el motor de tiempo real[cite: 3]. Implementa un handshake seguro mediante un middleware (`io.use`) que exige y decodifica un token JWT antes de aceptar la conexión[cite: 3]. Maneja el aislamiento por salas (`socket.join('club_ID')`) y emite eventos como `nuevo_mensaje`[cite: 3].

**`src/config/db.js`**[cite: 3]
* **Propósito:** Gestiona la conexión a la base de datos MySQL[cite: 3].
* **Detalles:** Crea un Pool de conexiones utilizando `mysql2`[cite: 3]. Habilita `waitForConnections`, `connectionLimit` (por defecto 50) y `enableKeepAlive` para asegurar que el servidor soporte alta concurrencia sin saturar la base de datos[cite: 3]. Exporta la versión de promesas (`pool.promise()`)[cite: 3].

**`src/config/roles.js`**[cite: 3]
* **Propósito:** Diccionario inmutable de roles[cite: 3].
* **Detalles:** Utiliza `Object.freeze` para mapear los roles del sistema (`ADMINISTRADOR: 1`, `ALUMNO: 2`, `PROFESOR: 3`, `ALUMNO_REPRESENTANTE: 4`) previniendo modificaciones accidentales en tiempo de ejecución[cite: 3].

## 2. Seguridad y Middlewares (`/src/middlewares`)[cite: 3]

**`authMiddleware.js`**[cite: 3]
* **Propósito:** Barrera de autenticación principal (Verificación de Identidad)[cite: 3].
* **Detalles:** Intercepta peticiones buscando el encabezado `Authorization: Bearer <token>`[cite: 3]. Decodifica el JWT con la firma secreta[cite: 3]. Si es exitoso, inyecta el payload descifrado (`req.user`) conteniendo el `id` y el `rol` para las siguientes capas[cite: 3].

**`verificarCuentaMiddleware.js`**[cite: 3]
* **Propósito:** Barrera secundaria de operatividad[cite: 3].
* **Detalles:** Intercepta peticiones de usuarios ya autenticados y consulta en la base de datos si su columna `verificado` es igual a 1[cite: 3]. Si no han validado su cuenta mediante el código OTP, bloquea la acción con un error 403[cite: 3].

**`roleAuth.js`**[cite: 3]
* **Propósito:** Control de Acceso Basado en Roles (RBAC)[cite: 3].
* **Detalles:** Es una Factory Function (devuelve un middleware) que recibe un array de roles permitidos[cite: 3]. Cruza esta lista contra `req.user.rol` (inyectado previamente por `authMiddleware`) y bloquea la operación con un 403 Forbidden si el usuario no tiene los privilegios[cite: 3].

## 3. Lógica de Negocio y Modelos (`/src/services` y `/src/models`)[cite: 3]

**`src/models/userModel.js`**[cite: 3]
* **Propósito:** Capa de abstracción de base de datos para entidades de usuario[cite: 3].
* **Detalles:** Ejecuta consultas JOIN complejas para unificar datos de las tablas[cite: 3]. Contiene métodos críticos para la seguridad como `registrarIntentoFallido` (que activa el `bloqueado_hasta`) y `resetearIntentos`[cite: 3].

**`src/services/authService.js`**[cite: 3]
* **Propósito:** Ejecuta las operaciones críticas de autenticación, transacciones ACID y recuperación de cuentas[cite: 3].
* **Detalles:**[cite: 3]
  * **Mecanismo Anti-Fuerza Bruta:** Valida la columna `bloqueado_hasta`[cite: 3]. Si la contraseña falla, incrementa los errores y bloquea la cuenta por 15 minutos tras 5 fallos[cite: 3].
  * **Registro Seguro (Transacciones ACID):** Utiliza bloqueos Anti-Carrera (`FOR UPDATE`) al verificar correos[cite: 3]. Inserta en cascada al usuario, detalles, ficha médica y contactos, generando además un código OTP de 6 dígitos[cite: 3].
  * **Gestión de OTPs:** Coordina los flujos de verificación de cuenta (`verificarCuentaConOTP`, `reenviarCodigoOTP`) y restablecimiento de contraseña (`solicitarRecuperacion`, `restablecerPassword`), destruyendo los códigos tras su uso o caducidad (15 min)[cite: 3].

**`src/services/emailService.js`**[cite: 3]
* **Propósito:** Motor de envío de correos transaccionales[cite: 3].
* **Detalles:** Utiliza `nodemailer` para conectarse a un servicio SMTP[cite: 3]. Contiene plantillas HTML responsivas para inyectar dinámicamente los códigos OTP (tanto para registro como para recuperación de contraseña) y los envía de forma asíncrona[cite: 3].

## 4. Controladores (`/src/controllers`)[cite: 3]

**`authController.js`**[cite: 3]
* **Propósito:** Puente entre las rutas HTTP y los servicios de autenticación y perfil[cite: 3].
* **Detalles:**[cite: 3]
  * **Registro:** Se depuraron las consultas y se mejoró la gestión del registro integrando los nuevos campos de información médica en la base de datos[cite: 3]. Aplica validaciones estrictas de dominio (`@alumno.ipn.mx` para rol 2, `@ipn.mx` para rol 3) y valida longitudes de NSS y boleta[cite: 3]. Valida la aceptación obligatoria del aviso de privacidad[cite: 3].
  * **Actualización Dinámica de Perfil:** Maneja relaciones 1:N[cite: 3]. Borra contactos de emergencia antiguos e inserta el nuevo arreglo exigiendo un mínimo de 2[cite: 3]. Valida estrictamente los 8 tipos de sangre permitidos y bloquea el cambio de nombre si la cuenta ya está verificada[cite: 3].
  * **Validación y Recuperación:** Expone los métodos para que el router consuma los servicios de verificación OTP y reseteo de contraseñas[cite: 3].

## 5. Endpoints de la API REST (`/src/routes`)[cite: 3]

**`authRoutes.js`**[cite: 3]
* **Propósito:** Expone las rutas de sesión y seguridad[cite: 3].
* **Detalles:** Maneja las rutas públicas (`POST /login`, `POST /register`, `POST /recuperar-password`, `POST /restablecer-password`) y las rutas protegidas que exigen token (`GET /perfil`, `PUT /perfil`, `POST /verificar-cuenta`, `POST /reenviar-codigo`)[cite: 3].

**`userRoutes.js`**[cite: 3]
* **Propósito:** Endpoints utilitarios, buscadores y administrativos[cite: 3].
* **Detalles:**[cite: 3]
  * **Selectores y Búsqueda:** `/professors` y `/students-in-charge` para el frontend[cite: 3]. El Buscador Universal (`GET /`) está protegido por RBAC, exige un query de al menos 2 caracteres y aplica un `LIMIT 20` mediante un LEFT JOIN[cite: 3].
  * **Edición Administrativa:** Permite a los administradores (`GET/PUT /:id/admin-edit`) modificar detalles de otros usuarios (excepto otros administradores), controlando que los nuevos datos (correos, boletas) no existan previamente[cite: 3].

**`clubes.js`**[cite: 3]
* **Propósito:** Enrutador principal del ciclo de vida operativo de los clubes[cite: 3].
* **Detalles:**[cite: 3]
  * **Aprobaciones e Invitaciones:** `POST /` exige la asignación de 20 miembros iniciales[cite: 3]. `PUT /:id/enviar-revision` cuenta en SQL que existan exactamente 20 firmas activas[cite: 3]. Rutas de control de admin (`/aprobar`, `/rechazar`, `/pausar`, `/reactivar`)[cite: 3].
  * **Módulos Internos:** Rutas anidadas `/chat`, `/avisos`, `/eventos`, `/recursos`[cite: 3]. Se ajustaron las rutas para manejar los controles de acceso en las salas de chat separadas para directivos y encargados, garantizando un manejo adecuado de los datos y validaciones de seguridad[cite: 3].
  * **Interconexión Sockets:** Al publicar avisos o eventos, el controlador recupera la instancia global de socket (`req.app.get('socketio')`) y emite notificaciones directamente a la sala correspondiente del club[cite: 3]. 
  * **Asistencias:** Usa `ON DUPLICATE KEY UPDATE` para alternar respuestas de asistencia[cite: 3].

**`avisos.js`**[cite: 3]
* **Propósito:** Gestión de anuncios unificada[cite: 3].
* **Detalles:**[cite: 3]
  * **Mantenimiento Automático:** Se limpiaron las consultas a la base de datos para funcionar sobre la nueva tabla única[cite: 3]. El `GET /` inyecta sentencias `UPDATE` previas al `SELECT` para apagar avisos vencidos, o los que no tienen fecha pero superaron los 7 días de antigüedad[cite: 3].
  * **Tablón Mixto (`/user/:userId`):** Consolida y ordena cronológicamente los avisos consultando la tabla única (tanto de alcance global como de clubes del usuario) garantizando el correcto manejo de la información[cite: 3].
  * **Auditoría:** `/all-for-admin` y `DELETE /:tipo/:id` permiten al rol 1 auditar y borrar anuncios[cite: 3].

## 6. Scripts de Mantenimiento y Seeders (`/`)[cite: 3]

**`limpiarDB.js`**[cite: 3]
* **Propósito:** Herramienta de reset absoluto de la base de datos[cite: 3].
* **Detalles:** Apaga temporalmente la revisión de llaves foráneas (`FOREIGN_KEY_CHECKS = 0`) para poder ejecutar comandos `TRUNCATE` masivos en las tablas del ecosistema (incluyendo `contactos_emergencia` y la tabla unificada de `avisos`)[cite: 3]. Reinicia los auto-incrementos, devolviendo la base a un estado prístino[cite: 3].

**`seed.js`**[cite: 3]
* **Propósito:** Inyector masivo de datos realistas para desarrollo[cite: 3].
* **Detalles:** Limpia la base y genera rápidamente un Administrador, 30 profesores y 150 alumnos (con contraseñas encriptadas, NSS, boletas, etc.)[cite: 3]. Construye clubes activos y rechazados, inyectando historiales de liderazgo, eventos con asistencias, chats estructurados y solicitudes de recursos[cite: 3].

**`avisos.js (seeder)`**[cite: 3]
* **Propósito:** Generador rápido de comunicados[cite: 3].
* **Detalles:** Trunca exclusivamente la tabla `avisos` e inserta comunicados frescos con diferentes prioridades, alcances y fechas de vencimiento a 7 días, facilitando pruebas de UI en el tablón móvil[cite: 3].