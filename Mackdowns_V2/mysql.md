# Estructura de la Base de Datos: MySQL (sistema_tt)

Este documento detalla la estructura, esquema y relaciones de las 15 tablas que componen la base de datos relacional `sistema_tt`, actualizada para reflejar los últimos módulos de seguridad, verificación y gestión de recursos. La base de datos está diseñada en MySQL (versión 8.0+) usando el motor InnoDB para soportar transacciones ACID y restricciones de llaves foráneas.

## 1. Núcleo de Usuarios, Roles y Seguridad

El sistema implementa un diseño basado en herencia para los perfiles. La tabla `usuarios` actúa como tabla central con credenciales y controles de seguridad, mientras que las tablas hijas (`alumnos_detalles` y `profesores_detalles`) almacenan la información específica de cada perfil.

*   **roles:** Catálogo inmutable de privilegios operativos.
    *   `1`: administrador
    *   `2`: alumno
    *   `3`: profesor
*   **usuarios:** Almacena datos primarios, correos (únicos) y contraseñas cifradas. 
    *   **Seguridad:** Incluye `intentos_fallidos` y `bloqueado_hasta` para mitigar ataques de fuerza bruta.
    *   **Verificación (NUEVO):** Incorpora `verificado` (booleano), `codigo_otp` y `expiracion_otp` para el flujo de validación de cuentas y recuperación de contraseñas por correo.
    *   **Privacidad (NUEVO):** Registra auditoría legal mediante `acepta_privacidad`, `version_aviso_privacidad` y `fecha_aceptacion_privacidad`.
    *   **Soft Delete:** Integra la bandera `eliminado` para desactivaciones sin purga de registros históricos.
*   **alumnos_detalles:** Tabla hija vinculada a `usuarios` (relación 1:1). Exige `nss` (11 dígitos), `boleta` (10 dígitos, única) y almacena la `carrera` del estudiante.
*   **profesores_detalles:** Tabla hija vinculada a `usuarios` (relación 1:1). Exige `num_empleado` (único).

## 2. Información Personal y Emergencias

Tablas fuertemente acopladas al usuario para guardar información crítica y de salud, requeridas por la normativa institucional.

*   **fichas_medicas:** Relación 1:1 con `usuarios`. Guarda el `tipo_sangre` y un campo de texto libre para `condiciones_preexistentes` o alergias.
*   **contactos_emergencia:** Relación 1:N con `usuarios`. Permite a un usuario registrar dinámicamente múltiples contactos. Almacena `nombre`, `telefono` y `parentesco`. El sistema exige a nivel backend un mínimo de 2 contactos válidos.

## 3. Entidades Core: Clubes y Gestión de Miembros

Controlan el ciclo de vida de las propuestas de clubes, sus estados operativos y el organigrama interno.

*   **clubes:** Tabla principal que almacena las propuestas e información estructural.
    *   **Estados:** Controlados mediante un enum (`activo`, `inactivo`, `en_revision`, `rechazado`, `esperando_firmas`).
    *   **Datos Complejos:** Almacena el plan de trabajo anual en la columna `cronograma` (formato nativo JSON), motivos de rechazo administrativo y genera un `codigo_union` (único) para invitaciones. 
    *   **Documentación (NUEVO):** Incluye la ruta `archivo_lista_estudiantes` para respaldos documentales.
*   **inscripciones:** Tabla puente (relación N:M) entre `usuarios` y `clubes`.
    *   Define el organigrama asignando el `rol_en_club` (`miembro`, `encargado_alumno`, `encargado_profesor`).
    *   Controla el acceso mediante `estatus` (`activo`, `inactivo`, `pendiente`). El estado `pendiente` funciona como sistema de invitaciones.
*   **historial_encargados:** Registro inmutable de auditoría (Log). Cuando un profesor o estudiante representante abandona el cargo, su ciclo se cierra (`fecha_fin`), conservando la trazabilidad de quién gestionó el club en qué periodo.

## 4. Operación, Eventos y Comunicación

Ecosistema de tablas diseñado para soportar la operatividad interna de los clubes (chats, anuncios, control de asistencia y logística).

*   **avisos_globales:** Comunicados emitidos por el Administrador. Posee un sistema automático de caducidad mediante `fecha_vencimiento` y la bandera `activo`. Ahora admite un `club_id` opcional si el aviso global está relacionado con una agrupación específica.
*   **avisos_club:** Alertas internas y asíncronas creadas por los encargados, visibles únicamente para los miembros activos de un club específico.
*   **chat_club:** Persistencia del historial de mensajes en la sala de WebSockets. Vinculada a un `club_id` y al `usuario_id` del emisor.
*   **eventos_club:** Registro de logística programada por los encargados. Almacena `titulo`, `lugar` y la `fecha_evento` (en formato estricto DATETIME).
*   **asistencias_eventos:** Tabla relacional (1:N) que funciona con un UPSERT (`ON DUPLICATE KEY UPDATE`). Registra la decisión del usuario (`asistira` booleano) y audita su último cambio mediante `fecha_respuesta`.
*   **solicitudes_recursos:** Peticiones formales de los clubes hacia la administración escolar. 
    *   **Clasificación (NUEVO):** Discrimina detalladamente entre `tipo_recurso` (material/espacio), requiriendo `tipo_club`, `unidad`, `especificaciones`, y `opciones_marcas`.
    *   **Aprobación:** Sometido a flujo mediante el enum `estatus` (`pendiente`, `aprobado`, `rechazado`).

## 5. Reglas de Integridad Referencial

El diseño relacional delega la limpieza de la base de datos al motor MySQL utilizando restricciones en cascada con excepciones específicas de auditoría:

*   **ON DELETE CASCADE:** Si un `usuario` es purgado de la base de datos, el sistema borrará automáticamente sus detalles, ficha médica, contactos, membresías (`inscripciones`), historial de liderazgo, eventos creados, asistencias y solicitudes de recursos. Si un `club` es eliminado, todas sus inscripciones, avisos, eventos y recursos vinculados desaparecen.
*   **ON DELETE SET NULL (Excepciones):** 
    *   Si se elimina un rol de la tabla `roles`, los usuarios vinculados pasarán a `role_id = NULL` para no perder las cuentas.
    *   Si se elimina un usuario, sus mensajes previos en la tabla `chat_club` cambian a `usuario_id = NULL` en lugar de desaparecer, preservando el contexto y la legibilidad de la conversación para los demás miembros.