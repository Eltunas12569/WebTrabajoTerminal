# 03. Backend: API Routes, Controllers y Middlewares

Este documento centraliza la lógica de negocio, las validaciones de acceso y los endpoints de la API en el backend.

## 1. Configuración de Base de Datos (`config/db.js`)
- Utiliza `mysql2` para crear un pool de conexiones gestionado mediante variables de entorno (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) [cite: 19].
- Está configurado para manejar alta concurrencia con `connectionLimit: 50` y `enableKeepAlive: true` [cite: 19].
- Expone una interfaz basada en promesas (`pool.promise()`) para consultas asíncronas [cite: 19].

## 2. Middlewares de Seguridad y Autenticación
### `verifyToken` (`middlewares/authMiddleware.js`)
- Extrae el token JWT del encabezado `Authorization: Bearer <token>` [cite: 16].
- Verifica su validez contra `process.env.JWT_SECRET` [cite: 16].
- Si es válido, inyecta los datos decodificados en `req.user` para su uso en los controladores. Si falla, retorna `401 Unauthorized` o `403 Forbidden` [cite: 16].

### `checkRole` (`middlewares/roleAuth.js`)
- Recibe un arreglo de roles permitidos y verifica si `req.user.rol` está incluido en él [cite: 17].
- Permite proteger endpoints críticos a nivel de rol [cite: 17].

## 3. Lógica de Negocio (Controllers & Services)
### Autenticación (`authController.js` & `authService.js`)
- **Login:** 
  - Busca el correo [cite: 10].
  - Verifica si la cuenta está bloqueada temporalmente (`bloqueado_hasta`) [cite: 10].
  - Compara contraseñas con `bcrypt` [cite: 10].
  - Si falla, incrementa `intentos_fallidos`. Al llegar a 5 intentos, bloquea la cuenta por 15 minutos [cite: 10].
  - Si acierta, resetea los intentos y genera un JWT (expira en 8h) adjuntando datos clave (rol, boleta o num_empleado) [cite: 10].
- **Registro:** 
  - Exige una contraseña segura (Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 símbolo especial) [cite: 10].
  - Valida estrictamente dominios de correo: Alumnos (`@alumno.ipn.mx`), Profesores (`@ipn.mx` excluyendo alumnos) [cite: 18].
  - Comprueba longitud de NSS (11) y boleta (10) y verifica que no existan duplicados en la base de datos [cite: 10].
  - Utiliza transacciones simuladas (eliminando el registro si fallan las inserciones asociadas) para garantizar consistencia entre `usuarios`, `alumnos_detalles`/`profesores_detalles`, `fichas_medicas` y `contactos_emergencia` [cite: 10].
- **Perfil (`getPerfil`, `updatePerfil`):** 
  - Recupera y actualiza información personal, contraseña, alergias, tipo de sangre y hasta 3 contactos de emergencia gestionados mediante operaciones `DELETE` e `INSERT` para sincronización limpia [cite: 18].

### Interfaz del Modelo de Usuario (`models/userModel.js`)
- Unifica las consultas a las tablas `usuarios`, `roles`, `alumnos_detalles` y `profesores_detalles` utilizando `JOIN` [cite: 15].
- Gestiona el bloqueo de cuentas mediante `registrarIntentoFallido` y `resetearIntentos` [cite: 15].

## 4. Definición de Rutas (`routes/`)
### Autenticación y Perfil (`authRoutes.js`)
- Monta `/login`, `/register`, `/perfil` (GET y PUT) enlazados a `authController` [cite: 14].

### Avisos (`avisos.js`)
- **Limpieza Automática:** El GET `/` actualiza automáticamente el estado `activo` basándose en la fecha actual y `fecha_vencimiento` (o 7 días desde `fecha_creacion` si es NULL) antes de retornar resultados [cite: 11].
- **Mix User:** `/user/:userId` Combina y ordena cronológicamente avisos globales y avisos específicos de los clubes donde el usuario está inscrito [cite: 11].
- **Vista Admin:** `/all-for-admin` Requiere rol = 1. Retorna el catálogo completo de todos los avisos (activos e inactivos, globales y de clubes) [cite: 11].

### Usuarios (`userRoutes.js`)
- **`/professors`:** Obtiene lista de usuarios con `role_id = 3` [cite: 13].
- **`/students-in-charge`:** Obtiene alumnos (roles 2 y 4) para asignar como encargados [cite: 13].
- **Buscador Universal (`/`):** Utiliza un `LEFT JOIN` para listar a todos los usuarios junto a su número de boleta o número de empleado, exponiendo `role_id` [cite: 13].

### Clubes (`clubes.js`)
- **Endpoints CRUD:** `/`, POST `/` (Creación con 19 miembros obligatorios), PUT `/:id`, DELETE `/:id` [cite: 12].
- **Acciones Admin:** `/:id/aprobar` (Genera código de unión), `/:id/rechazar`, `/:id/pausar`, `/:id/reactivar` [cite: 12].
- **Gestión de Invitaciones:** `/invitaciones/pendientes`, `/:clubId/responder` [cite: 12].
- **Dashboard de Club (Protegido por token):**
  - **Chat:** `/:id/chat` (Carga historial) [cite: 12].
  - **Avisos:** `/:id/avisos` (Carga historial y emite Socket.io `notificacion_interna` en POST) [cite: 12].
  - **Eventos y Asistencia:** `/:id/eventos`, `/:id/eventos/:eventoId/asistencia` [cite: 12].
  - **Recursos:** `/:id/recursos` (Crear solicitud) [cite: 12].
- **Validación de Envío a Revisión:** `/:id/enviar-revision` Verifica que el club tenga al menos 20 miembros activos antes de cambiar su estatus a `en_revision` [cite: 12].
