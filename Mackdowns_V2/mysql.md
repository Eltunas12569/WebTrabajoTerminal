# Estructura de la Base de Datos: MySQL (sistema_tt)

Este documento detalla la estructura, esquema y relaciones de las tablas que componen la base de datos relacional `sistema_tt`. La base de datos está diseñada en MySQL (versión 8.0+) usando el motor InnoDB para soportar transacciones ACID y restricciones de llaves foráneas. **Actualización:** Se ha limpiado la base de datos eliminando tablas obsoletas (recursos) para favorecer la escalabilidad.

## 1. Núcleo de Usuarios, Roles y Seguridad

El sistema implementa un diseño basado en herencia para los perfiles. La tabla `usuarios` actúa como tabla central con credenciales y controles de seguridad, mientras que las tablas hijas (`alumnos_detalles` y `profesores_detalles`) almacenan la información específica de cada perfil.

*   **roles:** Catálogo inmutable de privilegios operativos.
    *   `1`: administrador
    *   `2`: alumno
    *   `3`: profesor
*   **usuarios:** Almacena datos primarios, correos (únicos) y contraseñas cifradas. 
    *   **Seguridad:** Incluye `intentos_fallidos` y `bloqueado_hasta`.
    *   **Verificación:** Incorpora `verificado` (booleano), `codigo_otp` y `expiracion_otp`.
    *   **Privacidad:** Registra auditoría legal mediante `acepta_privacidad`, `version_aviso_privacidad` y `fecha_aceptacion_privacidad`.
    *   **Soft Delete:** Integra la bandera `eliminado`.
*   **alumnos_detalles:** Relación 1:1 con `usuarios`. Exige `nss` y `boleta` (10 dígitos).
*   **profesores_detalles:** Relación 1:1 con `usuarios`. Exige `num_empleado`.

## 2. Información Personal y Emergencias

Tablas fuertemente acopladas al usuario para guardar información crítica y de salud.

*   **fichas_medicas:** Relación 1:1 con `usuarios`. Guarda `tipo_sangre` y `condiciones_preexistentes` / alergias.
*   **contactos_emergencia:** Relación 1:N con `usuarios`. Almacena `nombre`, `telefono` y `parentesco`. (Validado a nivel de frontend y backend).

## 3. Entidades Core: Clubes y Gestión de Miembros

Controlan el ciclo de vida de las propuestas de clubes, sus estados operativos y el organigrama interno.

*   **clubes:** Tabla principal que almacena propuestas.
    *   **Estados:** Controlados mediante un enum (`activo`, `inactivo`, `en_revision`, `rechazado`, `esperando_firmas`).
    *   **Datos Complejos:** `cronograma` en formato nativo JSON, motivos de rechazo, y un `codigo_union` alfanumérico.
*   **inscripciones:** Tabla puente (relación N:M) entre `usuarios` y `clubes`.
    *   Define el organigrama mediante `rol_en_club` (`miembro`, `encargado_alumno`, `encargado_profesor`).
    *   Controla el acceso mediante `estatus` (`activo`, `inactivo`, `pendiente`).
*   **historial_encargados:** Registro inmutable de auditoría (Log). **Actualización:** Opera de forma transparente gracias a un disparador (Trigger) `AFTER UPDATE` sobre `inscripciones` que inyecta los periodos en la columna `rol_desempenado` para evitar conflictos estructurales.

## 4. Operación, Eventos y Comunicación

Ecosistema diseñado para soportar la operatividad interna de los clubes (chats, anuncios y logística). **Nota:** La tabla `solicitudes_recursos` ha sido formalmente deprecada y eliminada del modelo entidad-relación.

*   **avisos:** Tabla única que reemplaza a los avisos globales y de club para mejorar la coherencia de los datos. Gestiona los comunicados con caducidad automática (`fecha_vencimiento`).
*   **chat_club / chat_mensajes:** Persistencia del historial de mensajes en las salas de WebSockets. Vinculada a un `club_id` y segmentada por `tipo_sala` (Directivos, Encargados, Club).
*   **eventos_club:** Registro de logística programada por los encargados (`titulo`, `lugar` y `fecha_evento` en formato DATETIME).
*   **asistencias_eventos:** Tabla relacional (1:N) que funciona con un UPSERT (`ON DUPLICATE KEY UPDATE`). Registra la decisión del usuario (`asistira` booleano).

## 5. Reglas de Integridad Referencial

El diseño relacional delega la limpieza de la base de datos al motor MySQL utilizando restricciones en cascada:

*   **ON DELETE CASCADE:** Si un `usuario` es purgado, el sistema borrará automáticamente sus detalles, ficha médica, contactos, membresías (`inscripciones`), historial de liderazgo, eventos creados y asistencias. Si un `club` es eliminado, todas sus inscripciones, avisos y eventos vinculados desaparecen.
*   **ON DELETE SET NULL (Excepciones):**
    *   Si se elimina un usuario, sus mensajes previos en los chats cambian a `usuario_id = NULL` preservando la legibilidad de la conversación para los demás miembros.