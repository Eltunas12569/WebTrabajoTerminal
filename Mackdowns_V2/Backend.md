# BACKEND ARCHITECTURE & CONTEXT RULES

Este archivo documenta la estructura exacta, las responsabilidades de cada archivo y las reglas de diseño y codificación del backend (`actual/backend/`). Cualquier asistente o agente de IA que interactúe con este repositorio **DEBE** acatar estrictamente todas las normas descritas a continuación.

---

## 1. Visión General & Stack Técnico

*   **Entorno de Ejecución:** Node.js.
*   **Framework Principal:** Express.js.
*   **Base de Datos:** MySQL (con cifrado de base de datos nativo `aes-256-ecb` para PII - Información Personal Identificable).
*   **Ecosistema:** JavaScript (CommonJS).
*   **Tiempo Real:** Socket.io para chats de clubes, directivos y notificaciones de avisos/eventos.
*   **Patrón Arquitectónico:** Arquitectura en capas estricta (Routes -> Middlewares -> Controllers -> Services -> Models).
*   **Seguridad y Acceso:** Autenticación por JWT, validación de políticas/términos (LGPDPPSO), verificación de cuenta por OTP, y control de acceso basado en roles (RBAC).
*   **Configuración Sensible:** Centralizada mediante variables de entorno gestionadas en `.env`.

---

## 2. Convenciones y Reglas Estrictas de Desarrollo

### 2.1. Separación de Responsabilidades por Capas

1.  **Rutas (`src/routes/`):**
    *   Su único propósito es declarar los endpoints HTTP (GET, POST, PUT, PATCH, DELETE) y encadenar los middlewares requeridos antes de transferir la ejecución al controlador correspondiente.
    *   **PROHIBIDO:** Definir funciones anónimas inline con lógica de negocio o consultas de base de datos directamente en las rutas. *(Nota: Se reconoce que módulos como `clubes.js`, `userRoutes.js` y `avisos.js` aún contienen lógica pesada; estos deben ser refactorizados progresivamente hacia Controladores y Servicios).*
2.  **Middlewares (`src/middlewares/`):**
    *   Interceptan la petición entrante para verificar autenticación (`authMiddleware`), roles de usuario (`roleAuth`), estado de la cuenta OTP (`verificarCuentaMiddleware`) o aceptación de políticas de privacidad (`verificarPoliticas`).
    *   Deben cortar el ciclo de la petición retornando inmediatamente la respuesta de error HTTP pertinente (401, 403, etc.) si no se cumplen las condiciones.
3.  **Controladores (`src/controllers/`):**
    *   Extraen y validan parámetros provenientes de `req.params`, `req.query`, `req.body` y metadatos de sesión (como `req.user`).
    *   Delegan la operación a la capa de servicios o ejecutan la lógica transaccional.
    *   Devuelven la respuesta formateada con su código HTTP adecuado.
    *   **PROHIBIDO:** Escribir lógica de negocio densa que deba ir en Servicios.
4.  **Servicios (`src/services/`):**
    *   Concentran la lógica de negocio profunda, envíos de correo (`emailService`) y validaciones de dominio complejas (`authService`).
    *   **PROHIBIDO:** Recibir o mutar los objetos `req` o `res` de Express dentro de un servicio. Son agnósticos al protocolo HTTP.
5.  **Modelos (`src/models/`):**
    *   Gestionan exclusivamente el esquema, consultas unificadas complejas y persistencia hacia la base de datos (ej. `userModel.js`).
    *   No contienen lógica de autorización ni reglas de presentación.

### 2.2. Manejo de Errores, Cifrado y Respuestas

*   **Cifrado (Regla Crítica):** Toda información personal sensible (nombres, apellidos, boleta, nss, número de empleado, contactos de emergencia, alergias) **DEBE** escribirse usando `AES_ENCRYPT(?, ?)` y leerse usando `CAST(AES_DECRYPT(campo, ?) AS CHAR)`. **NUNCA** guardar estos datos en texto plano. La llave reside en `process.env.AES_KEY`.
*   **Transacciones:** Toda operación que implique múltiples inserciones o actualizaciones dependientes (ej. registro de usuario, asignación/cambio de encargados de club) debe estar envuelta en transacciones SQL (`BEGIN`, `COMMIT`, `ROLLBACK`) usando `FOR UPDATE` cuando sea necesario prevenir condiciones de carrera.
*   **Manejo de Errores:** Todo bloque asíncrono debe manejar excepciones (`try/catch`).
*   **Formatos JSON:** Las respuestas deben mantener un contrato consistente (ej. `{ "message": "Descripción" }`) y manejar códigos HTTP correctos (400, 401, 403, 404, 409, 500).

### 2.3. Seguridad y Variables de Entorno

*   Nunca escribir credenciales hardcodeadas, llaves AES, secretos JWT o contraseñas de correo en el código. Todo debe provenir del `.env`.

---

## 3. Estructura Exacta de Directorios

```text
actual/backend/
├── node_modules/
├── src/
│   ├── config/
│   │   ├── db.js                     # Pool MySQL con block_encryption_mode='aes-256-ecb'
│   │   └── roles.js                  # Diccionario inmutable de roles (1=Admin, 2=Alumno, etc.)
│   ├── controllers/
│   │   ├── authController.js         # Orquestación de Login, Registro, OTP y Perfil
│   │   └── politicasController.js    # Aceptación de LGPDPPSO e historiales de auditoría
│   ├── middlewares/
│   │   ├── authMiddleware.js         # Validador JWT -> inyecta req.user
│   │   ├── roleAuth.js               # Factory RBAC (Array de roles permitidos)
│   │   ├── verificarCuentaMiddleware.js # Exige verificado=1 para operar
│   │   └── verificarPoliticas.js     # Bloqueo por aviso de privacidad caduco (Caché 1 min)
│   ├── models/
│   │   └── userModel.js              # Consultas unificadas de usuario (login, bloqueos)
│   ├── routes/
│   │   ├── authRoutes.js             # Endpoints públicos y de sesión
│   │   ├── avisos.js                 # Gestión de anuncios globales/clubes con vencimiento
│   │   ├── clubes.js                 # Core operativo: invitaciones, eventos, chat, emergencias, bajas
│   │   ├── politicasRoutes.js        # Endpoints legales y estatus de usuario
│   │   └── userRoutes.js             # Búsqueda universal cifrada y ABCC de usuarios (Admin)
│   ├── scripts/
│   │   └── setupPoliticasTables.js   # Migración de tablas LGPDPPSO y politicas_versiones
│   └── services/
│       ├── authService.js            # Lógica transaccional pesada (OTP, contraseñas, tokens)
│       └── emailService.js           # Transporte Nodemailer para OTPs y recuperación
├── .env                              
├── .gitignore
├── avisos_globales.js                
├── limpiarDB.js                      # Truncado masivo de base de datos
├── package-lock.json
├── package.json
├── seed.js                           # Inyector de población (Mocks v1)
├── seed2.js                          # Inyector de población avanzado
└── server.js                         # Entry point: Express, Rate Limiting y WebSockets
```

---

## 4. Descripción Profunda de Componentes

### 4.1. Core del Servidor (`server.js` y `/src/config`)

*   **`server.js`:** Punto de entrada.
    *   **Rate Limiting:** Protege con `express-rate-limit` (general: 300/15min; login: 10/15min) mitigando fuerza bruta y permitiendo concurrencia segura.
    *   **CORS:** Restringido por `ALLOWED_ORIGINS` o fallback a localhost.
    *   **WebSockets (Socket.io):** Integrado en el mismo puerto HTTP. Valida el JWT en el handshake (`io.use`) y decodifica el nombre del usuario desde la BD con `AES_DECRYPT`. Maneja salas dinámicas protegidas por roles (`club_X`, `sala_directivos`, `sala_encargados`).
*   **`db.js`:** Exporta el `pool.promise()`. Intercepta conexiones nuevas para forzar `SET block_encryption_mode = 'aes-256-ecb';`.
*   **`roles.js`:** Mapeo estático inmutable (`Object.freeze`): `ADMINISTRADOR: 1`, `ALUMNO: 2`, `PROFESOR: 3`, `ALUMNO_REPRESENTANTE: 4`.

### 4.2. Seguridad y Middlewares (`/src/middlewares`)

*   **`authMiddleware.js`:** Intercepta cabeceras, valida la firma JWT y extrae el payload inyectándolo en `req.user`.
*   **`verificarCuentaMiddleware.js`:** Consulta la BD para bloquear el acceso operativo si `verificado !== 1` (OTP pendiente).
*   **`roleAuth.js`:** Middleware Factory de RBAC que bloquea peticiones (HTTP 403) si el rol no está en el arreglo permitido.
*   **`verificarPoliticas.js`:** Asegura cumplimiento legal (LGPDPPSO). Implementa una caché temporal de 1 minuto para evitar saturar la BD. Compara la versión aceptada del usuario (Aviso y Términos) contra la global activa. Si es obsoleta, emite el código `POLITICAS_PENDIENTES`.

### 4.3. Servicios y Modelos (`/src/services` y `/src/models`)

*   **`authService.js`:**
    *   Bloqueos dinámicos en login: >= 5 intentos fallidos = cuenta bloqueada 15 minutos.
    *   Transacciones `FOR UPDATE` en el registro para blindar duplicidad exacta de correos, NSS o boletas.
    *   Gestión de OTPs de 6 dígitos con expiración exacta de 15 minutos (Registro, Reenvío y Recuperación).
*   **`emailService.js`:** Renderiza plantillas HTML vía Nodemailer usando `smtp.gmail.com` (SSL puerto 465). Inyecta códigos OTP transaccionales.
*   **`userModel.js`:** Ejecuta consultas unificadas complejas, registrando intentos fallidos y aislando la lógica SQL de inicio de sesión.

### 4.4. Controladores Principales (`/src/controllers`)

*   **`authController.js`:**
    *   Filtra y valida dominios institucionales (`@alumno.ipn.mx` para rol 2; `@ipn.mx` para rol 3). Exige largos estrictos (Boleta = 10, NSS = 11).
    *   En `actualizarPerfil`, obliga a purgar e insertar transaccionalmente al menos **dos** contactos de emergencia estructuralmente válidos.
*   **`politicasController.js`:**
    *   Expone métricas (cumplimiento porcentual, faltantes) para el Admin.
    *   Guarda IP y User-Agent en la tabla inalterable `historial_aceptacion_politicas` como auditoría legal.
    *   Al publicar una nueva versión, detona un Socket global (`actualizacion_politicas_requerida`) forzando la actualización en clientes conectados, y limpia la caché mediante `invalidarCachePoliticas()`.

### 4.5. Endpoints de la API REST (`/src/routes`)

*   **`userRoutes.js`:**
    *   Búsqueda Universal cifrada (`LIKE` con `AES_DECRYPT` de múltiples campos).
    *   Operaciones CRUD exclusivas para Admins, protegiendo a los administradores de ser modificados o borrados por otros usuarios.
*   **`clubes.js`:**
    *   **Revisión:** `/:id/enviar-revision` obliga mínimo 20 firmas de miembros y que el Alumno Representante tenga estatus 'activo'.
    *   **Edición de Estados:** Actualiza estados reciclando rechazos (`IF(estatus = 'rechazado', 'en_revision', estatus)`) sin alterar clubes activos.
    *   **Asignaciones y Roles:** Reasigna roles dinámicamente promoviendo o degradando (ej. Profesor a Miembro) manejando estados de invitación ('pendiente' o 'activo').
    *   **Emergencias:** `/:idClub/emergencias` expone la ficha médica (Alergias, Sangre, NSS) y contactos. Acceso restringido **estrictamente** a encargados del club o administradores.
    *   **Bajas y Expulsiones Seguras:** Impide que los profesores titulares o alumnos representantes activos se auto-eliminen (`/salir`) o sean expulsados sin designar un reemplazo previamente. Las asistencias a eventos se borran en cascada.
*   **`avisos.js`:**
    *   Tablón unificado. Aplica un `UPDATE` pasivo inicial apagando automáticamente avisos globales o de club expirados (`fecha_vencimiento`) o viejos (> 7 días sin fecha).
    *   Separa visualizaciones mediante `club_id IS NULL` o local.
    *   Los administradores tienen acceso a una ruta especial para auditar absolutamente todos los avisos del sistema.

### 4.6. Scripts de Mantenimiento (`/` y `/scripts`)

*   **`setupPoliticasTables.js`:** Migración estructural que crea las tablas `politicas_versiones` e `historial_aceptacion_politicas`, y sincroniza los datos de los usuarios heredados a la versión 1.0.
*   **`limpiarDB.js`:** Herramienta que deshabilita el `FOREIGN_KEY_CHECKS` para aplicar un `TRUNCATE` masivo y devolver el sistema a estado de fábrica.
*   **`seed.js` / `seed2.js`:** Inyectores de población que regeneran usuarios, clubes y eventos usando lógica cifrada por bcrypt y AES_ENCRYPT.