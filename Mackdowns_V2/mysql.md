Estructura de la Base de Datos: MySQL (sistema_tt)

Este documento detalla la estructura, esquema y relaciones de las 15 tablas que componen la base de datos relacional sistema_tt. La base de datos está diseñada en MySQL (versión 8.0+) usando el motor InnoDB para soportar restricciones de llaves foráneas y eliminación en cascada (ON DELETE CASCADE).

1. Núcleo de Usuarios y Roles

El sistema implementa un diseño basado en herencia. La tabla usuarios actúa como tabla padre, almacenando las credenciales y datos comunes, mientras que las tablas hijas (alumnos_detalles y profesores_detalles) almacenan la información específica por rol.

roles: Catálogo de privilegios.

1: administrador

2: alumno

3: profesor

usuarios: Almacena datos primarios, correos (únicos) y contraseñas hasheadas. Incluye control de seguridad mediante intentos_fallidos y bloqueado_hasta para mitigar ataques de fuerza bruta.

alumnos_detalles: Tabla hija vinculada a usuarios (relación 1:1). Exige nss (11 dígitos) y boleta (10 dígitos, única).

profesores_detalles: Tabla hija vinculada a usuarios (relación 1:1). Exige num_empleado (único).

2. Información Personal y Emergencias

Estas tablas guardan información crítica y de salud, fuertemente acopladas al usuario.

fichas_medicas: Relación 1:1 con usuarios. Guarda el tipo_sangre y un texto libre para condiciones_preexistentes o alergias.

contactos_emergencia: Relación 1:N con usuarios. Permite a un usuario registrar múltiples contactos, guardando nombre, telefono y parentesco. El backend exige un mínimo de 2 en el sistema.

3. Entidades Core: Clubes y Gestión de Miembros

Controlan el ciclo de vida de las propuestas, sus estados y quiénes las conforman.

clubes: Tabla principal que almacena las propuestas.

Soporta estados mediante un enum: activo, inactivo, en_revision, rechazado, esperando_firmas.

Almacena datos complejos: cronograma (en formato JSON), motivo_rechazo y codigo_union (único).

inscripciones: Tabla de relación (N:M) entre usuarios y clubes.

Define el privilegio del usuario dentro de ese club mediante el campo rol_en_club: miembro, encargado_alumno, encargado_profesor.

Lleva un estatus (activo, inactivo, pendiente). Si es pendiente, actúa como una invitación.

historial_encargados: Registro de auditoría. Cuando un profesor o representante es reemplazado, su ciclo se cierra (fecha_fin), pero queda el registro de qué rol desempeñó en qué fechas.

4. Operación, Eventos y Comunicación

Tablas diseñadas para soportar la operatividad interna de los clubes (chats, anuncios, asistencias y peticiones).

avisos_globales: Avisos emitidos por el Administrador hacia toda la comunidad. Posee un sistema de caducidad mediante fecha_vencimiento y una bandera activo.

avisos_club: Alertas creadas por los encargados, visibles únicamente para los miembros de un club específico.

chat_club: Guarda el historial de mensajes de la sala de WebSockets. Vinculada a un club_id y al usuario_id que emitió el mensaje.

eventos_club: Registro de eventos programados por los encargados. Almacena titulo, lugar y la fecha_evento (en formato DATETIME estricto).

asistencias_eventos: Relación (1:N) que registra si un usuario asistirá (asistira como boolean/tinyint) a un evento en particular.

solicitudes_recursos: Peticiones formales de los encargados hacia la administración. Discrimina entre tipo_recurso (material o espacio) y pasa por un ciclo de aprobación (estatus: pendiente, aprobado, rechazado).

5. Reglas de Integridad Referencial

El diseño confía plenamente en ON DELETE CASCADE. Si un usuario es eliminado, el sistema borrará automáticamente en cascada sus detalles, ficha médica, contactos, inscripciones, historial, mensajes en el chat, eventos creados, asistencias y solicitudes. De igual forma, si un club es eliminado, se borran todos sus registros dependientes.