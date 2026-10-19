# Estructura de la Base de Datos: MySQL (`sistema_tt`)

Este documento detalla la estructura, esquema y relaciones de las tablas que componen la base de datos relacional `sistema_tt`. La base de datos está diseñada en MySQL (versión 8.0+) usando el motor InnoDB para soportar transacciones ACID y restricciones de llaves foráneas. 

**Actualización Arquitectónica:** Se ha aplicado una refactorización (flattening) eliminando las tablas satélite `alumnos_detalles`, `profesores_detalles` y `fichas_medicas`. Todos estos datos, junto con las configuraciones de seguridad legal y médica, ahora residen de manera centralizada y protegida en la tabla `usuarios`.

---

## 1. Núcleo de Usuarios, Roles y Seguridad

El sistema consolida toda la información de las personas operadoras del sistema (alumnos, profesores, administradores) en una única tabla altamente optimizada y segura.

*   **roles:** Catálogo inmutable de privilegios operativos (`id`, `nombre`).
*   **usuarios:** Tabla central y principal. Consolida credenciales, datos personales, escolares, médicos y legales.
    *   **Identidad y Cifrado (Campos `VARBINARY`):** `nombres`, `apellido_paterno`, `apellido_materno`, `nss`, `boleta`, `num_empleado`, `condiciones_preexistentes`. Todo se maneja a nivel binario para encriptación determinista a nivel de aplicación.
    *   **Datos Complementarios:** `carrera`, `tipo_sangre`.
    *   **Seguridad y Accesos:** `correo` (único), `password` (hash), `intentos_fallidos`, `bloqueado_hasta`.
    *   **Verificación 2FA/OTP:** `verificado` (booleano), `codigo_otp` y `expiracion_otp`.
    *   **Aceptación Legal:** Banderas y marcas de tiempo para `acepta_privacidad` y `acepta_terminos`, junto con las versiones de los documentos aceptados.
    *   **Ciclo de Vida:** Bandera lógica `eliminado` para *soft delete*.

## 2. Auditoría y Políticas Legales

Ecosistema para llevar el cumplimiento de regulaciones de privacidad y términos de servicio, manteniendo un control de versiones y auditoría de los usuarios.

*   **politicas_versiones:** Define el catálogo de documentos legales. Controla la `version`, `titulo`, `resumen_cambios`, `fecha_publicacion` y la vigencia (`activo`).
*   **historial_aceptacion_politicas:** Tabla de auditoría. Guarda un registro inmutable cada vez que un usuario acepta una política, almacenando la `version_aceptada`, la `ip_origen`, el `user_agent` y la `fecha_aceptacion`.

## 3. Información Personal y Emergencias

Tabla acoplada a los usuarios para el manejo de casos críticos.

*   **contactos_emergencia:** Relación 1:N con `usuarios`. 
    *   **Seguridad:** Los campos `nombre`, `telefono` y `parentesco` están tipados como `VARBINARY(255)` para proteger el PII (Personal Identifiable Information) de terceros.

## 4. Entidades Core: Clubes y Gestión de Miembros

Controlan el ciclo de vida de las propuestas de clubes, sus estados operativos y el organigrama interno.

*   **clubes:** Tabla centralizada para la propuesta y existencia del club.
    *   **Metadatos:** `nombre`, `descripcion`, `objetivo`, `espacios_tiempos`, `impacto`.
    *   **Archivos / Estructuras:** `cronograma` (formato nativo JSON), `archivo_lista_estudiantes`.
    *   **Estados y Lógica:** Operado por el enum `estatus` (`activo`, `inactivo`, `en_revision`, `rechazado`, `esperando_firmas`). Incluye un `codigo_union` alfanumérico único.
*   **inscripciones:** Tabla puente (relación N:M) entre `usuarios` y `clubes`.
    *   Controla el puesto del usuario en el club a través del enum `rol_en_club` (`miembro`, `encargado_alumno`, `encargado_profesor`).
    *   Gestiona el acceso interno mediante el campo `estatus` (`activo`, `inactivo`, `pendiente`, `rechazado`).
*   **historial_encargados:** Registro inmutable de auditoría (Log de liderazgo).
    *   **Automatización:** Es operado silenciosamente por *triggers* en la tabla `inscripciones` (`trg_inscripciones_update` y `trg_auditoria_encargados_update`). Cuando un usuario asciende o abandona un puesto de "encargado", estos triggers inyectan la fecha de inicio o calculan automáticamente la fecha de fin. Ningún servicio Backend debe insertar aquí manualmente.

## 5. Operación, Eventos y Comunicación

Ecosistema diseñado para la operatividad interna de los clubes (chats, anuncios y logística).

*   **avisos:** Tabla central para anuncios oficiales y notificaciones dentro de un club. 
    *   Incluye manejo de relevancia visual mediante `prioridad` (`alta`, `normal`, `baja`) y expiración automática mediante `fecha_vencimiento`.
*   **chat_mensajes:** Persistencia del historial de mensajes. 
    *   Vinculada a un `club_id` y segmentada organizativamente por el campo `tipo_sala` (`club`, `directivos`, `encargados`).
*   **eventos_club:** Registro de logística programada por los directivos. Contiene `titulo`, `lugar`, `fecha_evento` y nivel de `prioridad`.
*   **asistencias_eventos:** Tabla relacional de respuesta (1:N hacia usuarios y eventos). Confirma la decisión logística del usuario mediante el campo booleano `asistira`.

## 6. Reglas de Integridad Referencial y Cascada

El diseño delega la limpieza referencial al motor InnoDB utilizando llaves foráneas:

*   **`ON DELETE CASCADE` (Regla General):** Si un registro maestro desaparece, se limpia el ecosistema.
    *   Si se purga un `usuario`, desaparecen sus contactos de emergencia, su historial de políticas, sus inscripciones a clubes, los eventos que creó y su registro de asistencia a eventos de terceros.
    *   Si un `club` es eliminado, se borran automáticamente sus avisos, sus eventos, sus mensajes de chat (`chat_mensajes`), su historial de encargados y todas las membresías vinculadas (`inscripciones`).
*   **`ON DELETE SET NULL` (Excepciones Legibles):**
    *   **Mensajes de Chat (`chat_mensajes`):** Si un usuario es eliminado de la base de datos, su `usuario_id` en el historial de chat pasará a ser `NULL`. Esto mantiene los mensajes intactos para los demás miembros del club (preservando el contexto de la conversación).
    *   **Versiones de Políticas (`politicas_versiones`):** Si se borra el administrador que creó una política (`creado_por`), el registro de la política subsiste.