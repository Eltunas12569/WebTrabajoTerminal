# Estructura de la Base de Datos: MySQL (sistema_tt)[cite: 2]

Este documento detalla la estructura, esquema y relaciones de las tablas que componen la base de datos relacional `sistema_tt`, actualizada para reflejar los últimos módulos de seguridad, verificación, gestión de recursos y la nueva refactorización estructural[cite: 2]. La base de datos está diseñada en MySQL (versión 8.0+) usando el motor InnoDB para soportar transacciones ACID y restricciones de llaves foráneas[cite: 2].

## 1. Núcleo de Usuarios, Roles y Seguridad[cite: 2]

El sistema implementa un diseño basado en herencia para los perfiles[cite: 2]. La tabla `usuarios` actúa como tabla central con credenciales y controles de seguridad, mientras que las tablas hijas (`alumnos_detalles` y `profesores_detalles`) almacenan la información específica de cada perfil[cite: 2].

*   **roles:** Catálogo inmutable de privilegios operativos[cite: 2].
    *   `1`: administrador[cite: 2]
    *   `2`: alumno[cite: 2]
    *   `3`: profesor[cite: 2]
*   **usuarios:** Almacena datos primarios, correos (únicos) y contraseñas cifradas[cite: 2]. 
    *   **Seguridad:** Incluye `intentos_fallidos` y `bloqueado_hasta` para mitigar ataques de fuerza bruta[cite: 2].
    *   **Verificación (NUEVO):** Incorpora `verificado` (booleano), `codigo_otp` y `expiracion_otp` para el flujo de validación de cuentas y recuperación de contraseñas por correo[cite: 2].
    *   **Privacidad (NUEVO):** Registra auditoría legal mediante `acepta_privacidad`, `version_aviso_privacidad` y `fecha_aceptacion_privacidad`[cite: 2].
    *   **Soft Delete:** Integra la bandera `eliminado` para desactivaciones sin purga de registros históricos[cite: 2].
*   **alumnos_detalles:** Tabla hija vinculada a `usuarios` (relación 1:1)[cite: 2]. Exige `nss` (11 dígitos), `boleta` (10 dígitos, única) y almacena la `carrera` del estudiante[cite: 2].
*   **profesores_detalles:** Tabla hija vinculada a `usuarios` (relación 1:1)[cite: 2]. Exige `num_empleado` (único)[cite: 2].

## 2. Información Personal y Emergencias[cite: 2]

Tablas fuertemente acopladas al usuario para guardar información crítica y de salud, requeridas por la normativa institucional[cite: 2].

*   **fichas_medicas:** Relación 1:1 con `usuarios`[cite: 2]. Se mejoró la integración de nuevos campos para información médica, enlazando directamente con la gestión de perfiles[cite: 2]. Guarda el `tipo_sangre` y campos de texto libre para `condiciones_preexistentes` o alergias[cite: 2].
*   **contactos_emergencia:** Relación 1:N con `usuarios`[cite: 2]. Permite a un usuario registrar dinámicamente múltiples contactos[cite: 2]. Almacena `nombre`, `telefono` y `parentesco`[cite: 2]. El sistema exige a nivel backend un mínimo de 2 contactos válidos[cite: 2].

## 3. Entidades Core: Clubes y Gestión de Miembros[cite: 2]

Controlan el ciclo de vida de las propuestas de clubes, sus estados operativos y el organigrama interno[cite: 2].

*   **clubes:** Tabla principal que almacena las propuestas e información estructural[cite: 2].
    *   **Estados:** Controlados mediante un enum (`activo`, `inactivo`, `en_revision`, `rechazado`, `esperando_firmas`)[cite: 2].
    *   **Datos Complejos:** Almacena el plan de trabajo anual en la columna `cronograma` (formato nativo JSON), motivos de rechazo administrativo y genera un `codigo_union` (único) para invitaciones[cite: 2]. 
    *   **Documentación (NUEVO):** Incluye la ruta `archivo_lista_estudiantes` para respaldos documentales[cite: 2].
*   **inscripciones:** Tabla puente (relación N:M) entre `usuarios` y `clubes`[cite: 2].
    *   Define el organigrama asignando el `rol_en_club` (`miembro`, `encargado_alumno`, `encargado_profesor`)[cite: 2].
    *   Controla el acceso mediante `estatus` (`activo`, `inactivo`, `pendiente`)[cite: 2]. El estado `pendiente` funciona como sistema de invitaciones[cite: 2].
*   **historial_encargados:** Registro inmutable de auditoría (Log)[cite: 2]. Cuando un profesor o estudiante representante abandona el cargo, su ciclo se cierra (`fecha_fin`), conservando la trazabilidad de quién gestionó el club en qué periodo[cite: 2].

## 4. Operación, Eventos y Comunicación[cite: 2]

Ecosistema de tablas diseñado para soportar la operatividad interna de los clubes (chats, anuncios, control de asistencia y logística)[cite: 2].

*   **avisos:** Tabla única que reemplaza a los avisos globales y de club para mejorar la coherencia de los datos[cite: 2]. Gestiona los comunicados emitidos por el Administrador y las alertas internas de los encargados[cite: 2]. Posee un sistema automático de caducidad mediante `fecha_vencimiento` y la bandera `activo`[cite: 2].
*   **chat_club:** Persistencia del historial de mensajes en las salas de WebSockets[cite: 2]. Modificada para incluir estructuras de acceso a salas de chat separadas para directivos y encargados[cite: 2]. Vinculada a un `club_id` y al `usuario_id` del emisor[cite: 2].
*   **eventos_club:** Registro de logística programada por los encargados[cite: 2]. Almacena `titulo`, `lugar` y la `fecha_evento` (en formato estricto DATETIME)[cite: 2].
*   **asistencias_eventos:** Tabla relacional (1:N) que funciona con un UPSERT (`ON DUPLICATE KEY UPDATE`)[cite: 2]. Registra la decisión del usuario (`asistira` booleano) y audita su último cambio mediante `fecha_respuesta`[cite: 2].
*   **solicitudes_recursos:** Peticiones formales de los clubes hacia la administración escolar[cite: 2]. 
    *   **Clasificación (NUEVO):** Discrimina detalladamente entre `tipo_recurso` (material/espacio), requiriendo `tipo_club`, `unidad`, `especificaciones`, y `opciones_marcas`[cite: 2].
    *   **Aprobación:** Sometido a flujo mediante el enum `estatus` (`pendiente`, `aprobado`, `rechazado`)[cite: 2].

## 5. Reglas de Integridad Referencial[cite: 2]

El diseño relacional delega la limpieza de la base de datos al motor MySQL utilizando restricciones en cascada con excepciones específicas de auditoría[cite: 2]:

*   **ON DELETE CASCADE:** Si un `usuario` es purgado de la base de datos, el sistema borrará automáticamente sus detalles, ficha médica, contactos, membresías (`inscripciones`), historial de liderazgo, eventos creados, asistencias y solicitudes de recursos[cite: 2]. Si un `club` es eliminado, todas sus inscripciones, avisos, eventos y recursos vinculados desaparecen[cite: 2].
*   **ON DELETE SET NULL (Excepciones):**[cite: 2]
    *   Si se elimina un rol de la tabla `roles`, los usuarios vinculados pasarán a `role_id = NULL` para no perder las cuentas[cite: 2].
    *   Si se elimina un usuario, sus mensajes previos en la tabla `chat_club` cambian a `usuario_id = NULL` en lugar de desaparecer, preservando el contexto y la legibilidad de la conversación para los demás miembros[cite: 2].