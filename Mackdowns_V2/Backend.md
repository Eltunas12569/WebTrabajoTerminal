Arquitectura Backend: Node.js, Express y WebSockets

Este documento describe a profundidad la arquitectura, lógica de negocio y configuraciones del servidor backend construido con Node.js y Express. Detalla archivo por archivo la capa de servicios, seguridad, modelos, controladores, API REST y comunicación en tiempo real, garantizando un contexto absoluto del ecosistema.

1. Core del Servidor y Configuración (/ y /src/config)

server.js

Punto de entrada principal. Envuelve la app de Express en un servidor HTTP nativo para habilitar WebSockets.

CORS: Implementa una lista blanca dinámica mediante process.env.ALLOWED_ORIGINS.

Rate Limiting: Usa express-rate-limit para proteger el servidor contra DDoS (límite global de 300 peticiones/15 min) y mitigar ataques de fuerza bruta en el login (límite de 10 peticiones/15 min).

WebSockets (Socket.io): Inicializa el motor de tiempo real. Implementa un handshake seguro mediante un middleware (io.use) que exige y decodifica un token JWT antes de aceptar la conexión. Maneja el aislamiento por salas (socket.join('club_ID')) y emite eventos como nuevo_mensaje.

src/config/db.js

Propósito: Gestiona la conexión a la base de datos MySQL.

Detalles: Crea un Pool de conexiones utilizando mysql2. Habilita waitForConnections, connectionLimit (por defecto 50) y enableKeepAlive para asegurar que el servidor soporte alta concurrencia sin saturar la base de datos. Exporta la versión de promesas (pool.promise()).

src/config/roles.js

Propósito: Diccionario inmutable de roles.

Detalles: Utiliza Object.freeze para mapear los roles del sistema (ADMINISTRADOR: 1, ALUMNO: 2, PROFESOR: 3, ALUMNO_REPRESENTANTE: 4) previniendo modificaciones accidentales en tiempo de ejecución.

2. Seguridad y Middlewares (/src/middlewares)

authMiddleware.js

Propósito: Barrera de autenticación principal (Verificación de Identidad).

Detalles: Intercepta peticiones buscando el encabezado Authorization: Bearer <token>. Decodifica el JWT con la firma secreta. Si es exitoso, inyecta el payload descifrado (req.user) conteniendo el id y el rol para las siguientes capas.

roleAuth.js

Propósito: Control de Acceso Basado en Roles (RBAC).

Detalles: Es una Factory Function (devuelve un middleware) que recibe un array de roles permitidos. Cruza esta lista contra req.user.rol y bloquea la operación con un 403 Forbidden si el usuario no tiene los privilegios necesarios.

3. Lógica de Negocio y Modelos (/src/services y /src/models)

src/models/userModel.js

Propósito: Capa de abstracción de base de datos para entidades de usuario.

Detalles: Ejecuta consultas JOIN complejas para unificar datos de las tablas usuarios, roles, alumnos_detalles y profesores_detalles. Contiene métodos críticos para la seguridad como registrarIntentoFallido (que activa el bloqueado_hasta) y resetearIntentos.

src/services/authService.js

Propósito: Ejecuta las operaciones críticas de autenticación exigiendo alta consistencia (Transacciones ACID).

Mecanismo Anti-Fuerza Bruta: Valida la columna bloqueado_hasta. Si la contraseña falla en bcrypt.compare, incrementa los errores y bloquea la cuenta por 15 minutos tras 5 fallos.

Registro Seguro con Transacciones ACID:

Abre una transacción manual (beginTransaction).

Utiliza un bloqueo Anti-Carrera (FOR UPDATE) al buscar duplicidad de correos para evitar que dos peticiones simultáneas evadan la validación.

Inserta en cascada al usuario, sus detalles por rol, su ficha médica y sus contactos por defecto. Si un query falla, aplica rollback(); si no, commit().

4. Controladores (/src/controllers)

authController.js

Propósito: Puente entre las rutas HTTP y los servicios de autenticación.

Detalles:

En el registro, aplica validaciones estrictas de dominio (@alumno.ipn.mx para rol 2, @ipn.mx para rol 3) y valida longitudes de NSS y boleta.

Actualización Dinámica de Perfil: En actualizarPerfil, maneja relaciones 1:N. Borra los contactos de emergencia antiguos e inserta el nuevo arreglo dinámico provisto en el payload, exigiendo por seguridad un mínimo de 2 contactos válidos. Valida estrictamente los 8 tipos de sangre permitidos.

5. Endpoints de la API REST (/src/routes)

authRoutes.js

Expone las rutas públicas POST /login y POST /register.

Expone las rutas protegidas GET /perfil y PUT /perfil (delegadas a authController).

userRoutes.js

Endpoints utilitarios: /professors y /students-in-charge para popular selectores en el frontend.

Buscador Universal (GET /): Protegido por checkRole (solo Admin y Profesores). Exige un término de búsqueda (query) de al menos 2 caracteres y aplica un LIMIT 20 para evitar volcados masivos. Realiza un LEFT JOIN para buscar en nombres, boletas o números de empleado.

clubes.js

Es el enrutador más grande, gestiona el ciclo de vida operativo de los clubes y sus módulos internos.

Creación y Envío: POST / exige la asignación de 20 miembros iniciales. PUT /:id/enviar-revision ejecuta un count SQL verificando que haya exactamente 20 firmas activadas antes de cambiar el estatus.

Acciones Admin: /:id/aprobar (Genera código alfanumérico aleatorio), /:id/rechazar (Guarda el motivo en DB), /:id/pausar, /:id/reactivar.

Dashboard Interno: Rutas anidadas /:id/chat, /:id/avisos, /:id/eventos, /:id/recursos.

Interconexión Sockets: Al hacer un POST a /avisos o /eventos, el controlador recupera la instancia global de socket (req.app.get('socketio')) y emite el evento notificacion_interna directamente a la sala del club.

Asistencia: Utiliza ON DUPLICATE KEY UPDATE para permitir a los usuarios alternar su decisión de asistencia (Sí/No) a un evento.

avisos.js

Auto-Clean (Mantenimiento Automático): El endpoint principal (GET /) inyecta sentencias UPDATE previas al SELECT. Apaga (activo = 0) avisos vencidos, o aquellos sin fecha de vencimiento que ya superaron los 7 días de antigüedad.

Tablón Mixto (/user/:userId): Consolida y ordena cronológicamente los avisos globales vigentes más los avisos internos exclusivos de los clubes del usuario.

Catálogo Auditoría (/all-for-admin): Verifica el rol 1 y retorna el catálogo absoluto (activos, vencidos, globales y de clubes) para los administradores.