# Arquitectura Backend: Node.js, Express y WebSockets

Este documento describe a profundidad la arquitectura, lógica de negocio y configuraciones del servidor backend. Detalla la capa de servicios, seguridad, API REST, tiempo real y scripts de mantenimiento.

## 1. Core del Servidor y Configuración (`/` y `/src/config`)

**`server.js`**
* **Propósito:** Punto de entrada principal y habilitador de WebSockets.
* **Detalles:** 
  * **Rate Limiting:** Protege el servidor con `express-rate-limit` mitigando ataques DDoS y fuerza bruta, configurado para no bloquear IPs enteras bajo redes escolares.
  * **WebSockets:** Usa `socket.io` con validación JWT en el handshake (`io.use`) aislando eventos en salas exclusivas.
**`db.js` y `roles.js`**
* **Detalles:** Pool de conexiones MySQL de alta concurrencia y un diccionario `Object.freeze` de roles inmutables.

## 2. Seguridad y Middlewares (`/src/middlewares`)

* **`authMiddleware.js`:** Intercepta cabeceras, valida la firma JWT y decodifica la identidad del usuario (`req.user`).
* **`verificarCuentaMiddleware.js`:** Capa secundaria que revoca el acceso operativo si la cuenta no tiene la bandera `verificado = 1`.
* **`roleAuth.js`:** Middleware Factory de RBAC que bloquea peticiones mediante un 403 Forbidden basándose en el rol del usuario.

## 3. Lógica de Negocio y Servicios (`/src/services` y `/src/models`)

* **`userModel.js`:** Ejecuta consultas unificadas complejas. Protege el login activando bloqueos temporales (`bloqueado_hasta`).
* **`authService.js`:** 
  * Utiliza transacciones seguras (`FOR UPDATE`) durante el registro e inserción en cascada.
  * Controla flujos temporales de 15 minutos para generación, reenvío y destrucción de códigos OTP.
* **`emailService.js`:** Renderiza plantillas HTML vía Nodemailer e inyecta dinámicamente OTPs y mensajes transaccionales.

## 4. Controladores (`/src/controllers`)

* **`authController.js`:** Puente de ruteo. **Actualización:** Controla el registro validando dominios (`@alumno.ipn.mx` / `@ipn.mx`), restringe inserciones anómalas (filtro numérico de Android reforzado en BD) y manipula los contactos de emergencia, exigiendo un mínimo de dos instancias válidas en tiempo de ejecución.

## 5. Endpoints de la API REST (`/src/routes`)

**`authRoutes.js`**
* Expone rutas públicas (Login/Registro/Recuperar) y protegidas por JWT (Verificar/Reenviar/Perfil).

**`userRoutes.js`**
* **Propósito:** Endpoints de búsqueda y administración.
* **Detalles (Actualizado):** El Buscador Universal (`GET /`) fue reestructurado. Ahora soporta parámetros `?rol=` desde el frontend (Compose) y concatena dinámicamente sentencias SQL para impedir que administradores o creadores busquen "Alumnos" que en realidad son "Profesores" y viceversa. Tolerante a búsquedas con nombre completo.

**`clubes.js`**
* **Propósito:** Ciclo de vida operativo.
* **Detalles (Actualizado):**
  * Se removieron permanentemente las importaciones, validaciones y rutas hacia el controlador de recursos (`/recursos`).
  * `PUT /:id` (Edición): Modificado para evitar ciclos de revisión innecesarios mediante un condicional dinámico (`IF(estatus = 'rechazado', 'en_revision', estatus)`), preservando a los clubes `activos` inalterables. Refactorizado para utilizar el nombre real de las columnas al reasignar roles de encargado a miembro.
  * Sockets: Integrado para chats de directivos/encargados y publicación de avisos/eventos.

**`avisos.js`**
* **Propósito:** Tablón unificado de anuncios.
* **Detalles:** Ejecuta sentencias `UPDATE` previas al `SELECT` que deshabilitan automáticamente avisos vencidos (> 7 días) o expirados.

## 6. Scripts de Mantenimiento (`/`)

* **`limpiarDB.js`:** Herramienta que deshabilita temporalmente el `FOREIGN_KEY_CHECKS` para aplicar un `TRUNCATE` masivo y devolver el sistema a su estado de fábrica.
* **`seed.js`:** Inyector de población. Regenera decenas de usuarios, clubes y eventos usando lógica encriptada en bcrypt. **Actualizado:** Purga cualquier referencia a entidades de "Recursos".