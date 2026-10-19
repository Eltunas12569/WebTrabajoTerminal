const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware');
const checkRole = require('../middlewares/roleAuth');
const ROLES = require('../config/roles');
const AES_KEY = process.env.AES_KEY;


function convertirAFechaMySQL(valor) {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().slice(0, 19).replace('T', ' ');
}

router.get('/invitaciones/pendientes', verificarToken, requireVerificado, async (req, res) => {
    const idUsuario = req.user.id;
    try {
        const [filas] = await db.query(`
            SELECT c.id AS club_id, c.nombre, i.rol_en_club AS rol_invitado
            FROM clubes c JOIN inscripciones i ON c.id = i.club_id
            WHERE i.usuario_id = ? AND i.estatus = 'pendiente'
        `, [idUsuario]);
        res.status(200).json(filas);
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.put('/invitaciones/:idClub/responder', verificarToken, requireVerificado, async (req, res) => {
    const { idClub } = req.params;
    const { accion } = req.body;
    const idUsuario = req.user.id;
    try {
        if (accion === 'aceptar') {
            await db.query(`UPDATE inscripciones SET estatus = 'activo' WHERE club_id = ? AND usuario_id = ?`, [idClub, idUsuario]);
            res.status(200).json({ message: "¡Bienvenido al club!" });
        } else {
            await db.query(`UPDATE inscripciones SET estatus = 'rechazado' WHERE club_id = ? AND usuario_id = ? AND estatus = 'pendiente'`, [idClub, idUsuario]);
            res.status(200).json({ message: "Invitación rechazada" });
        }
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.put('/:id/enviar-revision', verificarToken, requireVerificado, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Validar que el club cuente con un Alumno Representante activo (que haya firmado)
        const [rep] = await db.query(
            `SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_alumno' AND estatus = 'activo'`,
            [id]
        );
        if (rep.length === 0) {
            return res.status(400).json({
                message: "No se puede enviar a revisión: El club requiere obligatoriamente que el Alumno Representante haya aceptado y firmado su participación. Si declinó o aún está pendiente, debes esperar su firma o asignar a otro representante."
            });
        }

        // 2. Validar que se alcancen al menos 20 firmas de estudiantes en total
        const [resultadoConteo] = await db.query(
            `SELECT COUNT(*) as total FROM inscripciones WHERE club_id = ? AND estatus = 'activo' AND rol_en_club != 'encargado_profesor'`,
            [id]
        );
        if (resultadoConteo[0].total < 20) {
            return res.status(400).json({ message: `Aún faltan confirmaciones. Han firmado ${resultadoConteo[0].total} de 20 estudiantes requeridos.` });
        }

        await db.query(`UPDATE clubes SET estatus = 'en_revision' WHERE id = ?`, [id]);
        res.status(200).json({ message: "Club enviado a revisión exitosamente" });
    } catch (error) {
        console.error("Error al enviar club a revisión:", error);
        res.status(500).json({ message: "Error interno al enviar club a revisión" });
    }
});

router.get('/:id/chat', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [mensajes] = await db.query(`
            SELECT c.id, c.club_id, c.usuario_id, c.mensaje, c.fecha_envio, 
                   CONCAT(CAST(AES_DECRYPT(u.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR)) AS autor_nombre,
                   u.role_id AS autor_rol,
                   (
                       SELECT IF(i.rol_en_club = 'encargado_profesor', 'Profe Titular', 
                              IF(i.rol_en_club = 'encargado_alumno', 'Alumno Rep.', 'Miembro'))
                       FROM inscripciones i 
                       WHERE i.usuario_id = c.usuario_id AND i.club_id = c.club_id 
                       LIMIT 1
                   ) AS etiqueta_encargado
            FROM chat_mensajes c 
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.club_id = ? AND c.tipo_sala = 'club' 
            ORDER BY c.fecha_envio ASC
        `, [AES_KEY, AES_KEY, req.params.id]);

        res.status(200).json(mensajes);
    } catch (error) {
        console.error("Error al cargar chat del club:", error);
        res.status(500).json({ message: "Error al cargar chat" });
    }
});

router.get('/:id/avisos', verificarToken, requireVerificado, async (req, res) => {
    try {
        await db.query(`
            UPDATE avisos
            SET activo = 0
            WHERE club_id = ? AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < NOW()
        `, [req.params.id]);

        const [avisos] = await db.query(`
            SELECT a.*,
                   CAST(AES_DECRYPT(u.nombres, ?) AS CHAR) AS nombres,
                   CONCAT(CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR), ' ', IFNULL(CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR), '')) AS apellidos,
                   CONCAT(CAST(AES_DECRYPT(u.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR)) AS autor_nombre,
                   u.role_id,
                   i.rol_en_club
            FROM avisos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN inscripciones i ON i.club_id = a.club_id AND i.usuario_id = u.id
            WHERE a.club_id = ? AND a.activo = 1
            ORDER BY a.fecha_envio DESC
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, req.params.id]);
        res.status(200).json(avisos);
    } catch (error) { res.status(500).json({ message: "Error al cargar avisos" }); }
});

router.post('/:id/avisos', verificarToken, requireVerificado, async (req, res) => {
    const { contenido, titulo, prioridad, fecha_vencimiento, alcance, es_global } = req.body;

    if (!contenido || !String(contenido).trim()) {
        return res.status(400).json({ message: "El contenido del aviso es obligatorio." });
    }

    if (!fecha_vencimiento) {
        return res.status(400).json({ message: "La fecha de vencimiento del aviso es obligatoria." });
    }

    const fechaVencimientoConvertida = convertirAFechaMySQL(fecha_vencimiento);
    if (!fechaVencimientoConvertida) {
        return res.status(400).json({ message: "La fecha de vencimiento no es válida." });
    }

    const prioridadValida = ['alta', 'normal', 'baja'].includes(String(prioridad).toLowerCase())
        ? String(prioridad).toLowerCase()
        : 'normal';

    const esGlobal = (
        es_global === true ||
        es_global === 1 ||
        String(alcance || '').toLowerCase() === 'global'
    ) ? 1 : 0;

    try {
        const rolUsuario = Number(req.user.rol || req.user.role_id);
        if (rolUsuario !== 1) {
            const [permiso] = await db.query(
                `SELECT id FROM inscripciones WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'`,
                [req.params.id, req.user.id]
            );
            if (permiso.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Solo los encargados pueden publicar avisos en este club." });
            }
        }
        const [resultado] = await db.query(
            `INSERT INTO avisos (club_id, usuario_id, titulo, contenido, prioridad, fecha_envio, fecha_vencimiento, activo) VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)`,
            [req.params.id, req.user.id, titulo || null, contenido, prioridadValida, fechaVencimientoConvertida]
        );

        const io = req.app.get('socketio');
        if (io) {
            io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'aviso', prioridad: prioridadValida });
        }

        res.status(201).json({
            message: "Aviso publicado exitosamente para el club",
            prioridad: prioridadValida,
            fecha_vencimiento: fechaVencimientoConvertida
        });
    } catch (error) {
        console.error("Error al crear aviso:", error);
        res.status(500).json({ message: "Error al crear aviso" });
    }
});

router.get('/:id/eventos', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [eventos] = await db.query(`
            SELECT e.*,
                   (SELECT COUNT(*) FROM asistencias_eventos WHERE evento_id = e.id AND asistira = 1) AS total_asistentes,
                   (SELECT asistira FROM asistencias_eventos WHERE evento_id = e.id AND usuario_id = ?) AS mi_respuesta
            FROM eventos_club e
            WHERE e.club_id = ?
            ORDER BY e.id DESC
        `, [req.user.id, req.params.id]);
        res.status(200).json(eventos);
    } catch (error) { res.status(500).json({ message: "Error al cargar eventos" }); }
});

router.post('/:id/eventos', verificarToken, requireVerificado, async (req, res) => {
    const { titulo, descripcion, fecha_evento, lugar, prioridad = 'alta', notificarAviso = true, alcance, es_global } = req.body;

    const fechaConvertida = convertirAFechaMySQL(fecha_evento);
    if (!fechaConvertida) {
        return res.status(400).json({ message: "La fecha del evento no es válida. Usa un formato como 'YYYY-MM-DDTHH:mm:ss'." });
    }

    const prioridadValida = ['alta', 'normal', 'baja'].includes(String(prioridad).toLowerCase())
        ? String(prioridad).toLowerCase()
        : 'alta';

    const esGlobal = (
        es_global === true ||
        es_global === 1 ||
        String(alcance || '').toLowerCase() === 'global'
    ) ? 1 : 0;

    try {
        const rolUsuario = Number(req.user.rol || req.user.role_id);
        if (rolUsuario !== 1) {
            const [permiso] = await db.query(
                `SELECT id FROM inscripciones WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'`,
                [req.params.id, req.user.id]
            );
            if (permiso.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Solo los encargados pueden agendar eventos en este club." });
            }
        }

        await db.query(
            `INSERT INTO eventos_club (club_id, usuario_id, titulo, descripcion, fecha_evento, lugar, prioridad) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, titulo, descripcion, fechaConvertida, lugar, prioridadValida]
        );

        if (notificarAviso !== false) {
            let fechaLegible = fechaConvertida;
            try {
                const f = new Date(fechaConvertida);
                fechaLegible = f.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
            } catch (e) { }

            const tituloAviso = `📅 Nuevo Evento: ${titulo}`;
            const contenidoAviso = `Se ha programado una nueva actividad oficial del club: "${titulo}".\n📅 Fecha: ${fechaLegible}${lugar ? `\n📍 Lugar: ${lugar}` : ''}.\n${descripcion ? `📝 Detalles: ${descripcion}\n` : ''}¡Por favor confirma tu asistencia en el calendario o sección de Eventos!`;

            await db.query(
                `INSERT INTO avisos (club_id, usuario_id, titulo, contenido, prioridad, fecha_envio, fecha_vencimiento, activo) VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)`,
                [req.params.id, req.user.id, tituloAviso, contenidoAviso, prioridadValida, fechaConvertida]
            );
        }

        const io = req.app.get('socketio');
        if (io) {
            io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'evento', prioridad: prioridadValida });
            io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'aviso', prioridad: prioridadValida });
        }

        res.status(201).json({
            message: "Evento creado y notificado a los miembros del club",
            prioridad: prioridadValida
        });
    } catch (error) {
        console.error("Error al crear evento:", error);
        res.status(500).json({ message: "Error al crear evento" });
    }
});

router.post('/:id/eventos/:idEvento/asistencia', verificarToken, requireVerificado, async (req, res) => {
    const { asistira } = req.body;
    try {
        await db.query(
            `INSERT INTO asistencias_eventos (evento_id, usuario_id, asistira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE asistira = ?`,
            [req.params.idEvento, req.user.id, asistira, asistira]
        );
        res.status(200).json({ message: "Asistencia actualizada" });
    } catch (error) { res.status(500).json({ message: "Error al registrar asistencia" }); }
});

router.get('/:id/eventos/:idEvento/asistentes', verificarToken, requireVerificado, async (req, res) => {
    const clubId = req.params.id;
    const idEvento = req.params.idEvento;
    const idUsuario = req.user.id;
    const rolUsuario = Number(req.user.rol || req.user.role_id);

    try {
        if (rolUsuario !== 1) {
            const [permiso] = await db.query(
                `SELECT id FROM inscripciones
                 WHERE club_id = ? AND usuario_id = ?
                   AND rol_en_club IN ('encargado_profesor', 'encargado_alumno')
                   AND estatus = 'activo'
                 LIMIT 1`,
                [clubId, idUsuario]
            );
            if (permiso.length === 0) {
                return res.status(403).json({ message: "Acceso exclusivo para los encargados del club." });
            }
        }

        const [asistentes] = await db.query(
            `SELECT u.id AS usuario_id,
                   CAST(AES_DECRYPT(u.nombres, ?) AS CHAR) AS nombres,
                   CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR) AS apellido_paterno,
                   CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR) AS apellido_materno,
                   CONCAT(CAST(AES_DECRYPT(u.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR), IF(CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR) IS NOT NULL AND CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR) != '', CONCAT(' ', CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR)), '')) AS nombre_completo,
                   u.correo,
                   CAST(AES_DECRYPT(u.boleta, ?) AS CHAR) AS boleta,
                   CAST(AES_DECRYPT(u.num_empleado, ?) AS CHAR) AS num_empleado,
                    IFNULL(i.rol_en_club, 'miembro') AS rol_en_club
             FROM asistencias_eventos ae
             JOIN eventos_club e ON ae.evento_id = e.id AND e.club_id = ?
             JOIN usuarios u ON ae.usuario_id = u.id
             LEFT JOIN inscripciones i ON i.usuario_id = u.id AND i.club_id = ?
             WHERE ae.evento_id = ? AND ae.asistira = 1
             ORDER BY apellido_paterno ASC, nombres ASC`,
            [
                AES_KEY, AES_KEY, AES_KEY, // nombres, paterno, materno
                AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, // nombre_completo (CONCAT + IF)
                AES_KEY, // boleta
                AES_KEY, // num_empleado
                clubId, clubId, idEvento // IDs de los JOINs y WHERE
            ]
        );

        res.status(200).json({ asistentes });
    } catch (error) {
        console.error("Error al obtener asistentes del evento:", error);
        res.status(500).json({ message: "Error al obtener la lista de asistentes del evento." });
    }
});

router.get('/chat-directivos/historial', verificarToken, requireVerificado, async (req, res) => {
    const idUsuario = req.user.id;
    const rolUsuario = req.user.rol;

    try {
        if (rolUsuario !== 1) {
            const [esEncargado] = await db.query(
                `SELECT id FROM inscripciones WHERE usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo' LIMIT 1`,
                [idUsuario]
            );
            if (esEncargado.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Exclusivo para administradores y encargados." });
            }
        }

        const [mensajes] = await db.query(`
            SELECT c.id, c.usuario_id, c.mensaje, c.fecha_envio, 
                   CONCAT(CAST(AES_DECRYPT(u.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR)) AS autor_nombre,
                   u.role_id AS autor_rol,
                   (
                       SELECT GROUP_CONCAT(DISTINCT CONCAT(
                           IF(i.rol_en_club = 'encargado_profesor', 'Profe Titular', 'Alumno Rep.'), ' - ', cl.nombre
                       ) SEPARATOR ', ')
                       FROM inscripciones i JOIN clubes cl ON i.club_id = cl.id
                       WHERE i.usuario_id = c.usuario_id AND i.rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND i.estatus = 'activo'
                   ) AS etiqueta_encargado
            FROM chat_mensajes c 
            JOIN usuarios u ON c.usuario_id = u.id 
            WHERE c.tipo_sala = 'directivos'
            ORDER BY c.fecha_envio ASC
        `, [AES_KEY, AES_KEY]);
        res.status(200).json(mensajes);
    } catch (error) {
        console.error("Error al cargar chat directivos:", error);
        res.status(500).json({ message: "Error interno al cargar el chat directivo" });
    }
});

router.get('/chat-encargados/historial', verificarToken, requireVerificado, async (req, res) => {
    const idUsuario = req.user.id;
    try {
        const [esEncargado] = await db.query(
            `SELECT id FROM inscripciones WHERE usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo' LIMIT 1`,
            [idUsuario]
        );
        if (esEncargado.length === 0) {
            return res.status(403).json({ message: "Acceso denegado. Exclusivo para encargados." });
        }

        const [mensajes] = await db.query(`
            SELECT c.id, c.usuario_id, c.mensaje, c.fecha_envio, 
                   CONCAT(CAST(AES_DECRYPT(u.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR)) AS autor_nombre,
                   u.role_id AS autor_rol,
                   (
                       SELECT GROUP_CONCAT(DISTINCT CONCAT(
                           IF(i.rol_en_club = 'encargado_profesor', 'Profe Titular', 'Alumno Rep.'), ' - ', cl.nombre
                       ) SEPARATOR ', ')
                       FROM inscripciones i JOIN clubes cl ON i.club_id = cl.id
                       WHERE i.usuario_id = c.usuario_id AND i.rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND i.estatus = 'activo'
                   ) AS etiqueta_encargado
            FROM chat_mensajes c 
            JOIN usuarios u ON c.usuario_id = u.id 
            WHERE c.tipo_sala = 'encargados'
            ORDER BY c.fecha_envio ASC
        `, [AES_KEY, AES_KEY]);
        res.status(200).json(mensajes);
    } catch (error) {
        res.status(500).json({ message: "Error interno" });
    }
});

router.get('/', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [filas] = await db.query(`
            SELECT c.*,
                p.id AS profesor_encargado_id, 
                CONCAT(CAST(AES_DECRYPT(p.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(p.apellido_paterno, ?) AS CHAR), IF(CAST(AES_DECRYPT(p.apellido_materno, ?) AS CHAR) IS NOT NULL AND CAST(AES_DECRYPT(p.apellido_materno, ?) AS CHAR) != '', CONCAT(' ', CAST(AES_DECRYPT(p.apellido_materno, ?) AS CHAR)), '')) AS profesor_nombres,
                p.correo AS profesor_correo, 
                CAST(AES_DECRYPT(p.num_empleado, ?) AS CHAR) AS profesor_num_empleado,
                a.id AS alumno_encargado_id, 
                CONCAT(CAST(AES_DECRYPT(a.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(a.apellido_paterno, ?) AS CHAR), IF(CAST(AES_DECRYPT(a.apellido_materno, ?) AS CHAR) IS NOT NULL AND CAST(AES_DECRYPT(a.apellido_materno, ?) AS CHAR) != '', CONCAT(' ', CAST(AES_DECRYPT(a.apellido_materno, ?) AS CHAR)), '')) AS alumno_nombres,
                a.correo AS alumno_correo, 
                CAST(AES_DECRYPT(a.boleta, ?) AS CHAR) AS alumno_boleta
            FROM clubes c
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY]);

        const clubesTratados = filas.map(club => {
            return {
                ...club,
                profesor_nombres: club.profesor_nombres || 'Profesor',
                profesor_apellidos: '',
                alumno_nombres: club.alumno_nombres || 'Alumno',
                alumno_apellidos: '',
                cronograma: club.cronograma
                    ? (typeof club.cronograma === 'string' ? club.cronograma : JSON.stringify(club.cronograma))
                    : null
            }
        });
        res.status(200).json(clubesTratados);
    } catch (error) {
        console.error("Error al obtener lista de clubes (GET /):", error);
        res.status(500).json({ message: "Error interno" });
    }
});

router.get('/user/:idUsuario', verificarToken, requireVerificado, async (req, res) => {
    const { idUsuario } = req.params;
    try {
        const [filas] = await db.query(`
            SELECT c.*,
                p.id AS profesor_encargado_id, 
                CONCAT(CAST(AES_DECRYPT(p.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(p.apellido_paterno, ?) AS CHAR), IF(CAST(AES_DECRYPT(p.apellido_materno, ?) AS CHAR) IS NOT NULL AND CAST(AES_DECRYPT(p.apellido_materno, ?) AS CHAR) != '', CONCAT(' ', CAST(AES_DECRYPT(p.apellido_materno, ?) AS CHAR)), '')) AS profesor_nombres,
                p.correo AS profesor_correo, 
                CAST(AES_DECRYPT(p.num_empleado, ?) AS CHAR) AS profesor_num_empleado,
                a.id AS alumno_encargado_id, 
                CONCAT(CAST(AES_DECRYPT(a.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(a.apellido_paterno, ?) AS CHAR), IF(CAST(AES_DECRYPT(a.apellido_materno, ?) AS CHAR) IS NOT NULL AND CAST(AES_DECRYPT(a.apellido_materno, ?) AS CHAR) != '', CONCAT(' ', CAST(AES_DECRYPT(a.apellido_materno, ?) AS CHAR)), '')) AS alumno_nombres,
                a.correo AS alumno_correo, 
                CAST(AES_DECRYPT(a.boleta, ?) AS CHAR) AS alumno_boleta,
                i.estatus AS inscripcion_estatus, i.fecha_inscripcion, i.rol_en_club AS mi_rol_interno,
                (SELECT COUNT(*) FROM inscripciones WHERE club_id = c.id AND estatus = 'activo' AND rol_en_club != 'encargado_profesor') AS aceptados_count
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id AND i.usuario_id = ? AND i.estatus != 'rechazado'
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
        `, [
            AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, // Profe nombres
            AES_KEY, // Profe empleado
            AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, // Alumno nombres
            AES_KEY, // Alumno boleta
            idUsuario // Parámetro WHERE
        ]);

        const clubesTratados = filas.map(club => {
            return {
                ...club,
                profesor_nombres: club.profesor_nombres || 'Profesor',
                profesor_apellidos: '',
                alumno_nombres: club.alumno_nombres || 'Alumno',
                alumno_apellidos: '',
                cronograma: club.cronograma
                    ? (typeof club.cronograma === 'string' ? club.cronograma : JSON.stringify(club.cronograma))
                    : null
            }
        });

        res.status(200).json(clubesTratados);
    } catch (error) {
        console.error("Error en mis clubes:", error);
        res.status(500).json({ message: "Error al obtener mis clubes" });
    }
});

router.get('/:id/historial-encargados', verificarToken, requireVerificado, async (req, res) => {
    if (req.user.rol !== 1) {
        return res.status(403).json({ message: "Acceso exclusivo para administradores" });
    }

    try {
        const [historial] = await db.query(`
            SELECT h.id, h.rol_desempenado AS rol_en_club, h.fecha_inicio, h.fecha_fin,
                   CONCAT(CAST(AES_DECRYPT(u.nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR)) AS nombre_completo,
                   u.correo, CAST(AES_DECRYPT(u.num_empleado, ?) AS CHAR) AS num_empleado, CAST(AES_DECRYPT(u.boleta, ?) AS CHAR) AS boleta
            FROM historial_encargados h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.club_id = ?
            ORDER BY h.fecha_fin DESC
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, req.params.id]);

        res.status(200).json(historial);
    } catch (error) {
        console.error("Error historial:", error);
        res.status(500).json({ message: "Error al obtener historial" });
    }
});

router.post('/', verificarToken, requireVerificado, async (req, res) => {
    const { nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, profesor_encargado_id, alumno_encargado_id, lista_estudiantes } = req.body;
    const estatus = 'esperando_firmas';

    if (!nombre || !profesor_encargado_id || !alumno_encargado_id || !lista_estudiantes || lista_estudiantes.length < 19) {
        return res.status(400).json({ message: 'Faltan campos o los 19 alumnos obligatorios.' });
    }

    try {
        const [resultado] = await db.query(
            `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus]
        );
        const idClubNuevo = resultado.insertId;

        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [profesor_encargado_id, idClubNuevo]);
        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'pendiente')`, [alumno_encargado_id, idClubNuevo]);

        for (const idMiembro of lista_estudiantes) {
            if (idMiembro !== alumno_encargado_id) {
                await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'miembro', 'pendiente')`, [idMiembro, idClubNuevo]);
            }
        }
        res.status(201).json({ message: 'Club creado. Esperando confirmación de alumnos.', clubId: idClubNuevo });
    } catch (error) {
        console.error("Error al crear club:", error);
        res.status(500).json({ message: "Error interno al crear el club." });
    }
});

router.put('/:id', verificarToken, requireVerificado, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, nuevo_profesor_id, nuevo_alumno_id } = req.body;
    const rolUsuario = Number(req.user.rol || req.user.role_id);
    const esAdmin = rolUsuario === 1;

    try {
        if (!esAdmin) {
            const [permiso] = await db.query(
                `SELECT id FROM inscripciones WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo' LIMIT 1`,
                [id, req.user.id]
            );
            if (permiso.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Solo los encargados activos de este club o un administrador pueden modificar la información." });
            }
        }

        const [clubesActuales] = await db.query(`SELECT * FROM clubes WHERE id = ?`, [id]);
        if (clubesActuales.length === 0) {
            return res.status(404).json({ message: "Club no encontrado." });
        }
        const clubActual = clubesActuales[0];

        const nombreFinal = esAdmin && nombre !== undefined ? nombre : clubActual.nombre;
        const cronogramaFinal = cronograma !== undefined
            ? (typeof cronograma === 'string' ? cronograma : JSON.stringify(cronograma))
            : (clubActual.cronograma ? (typeof clubActual.cronograma === 'string' ? clubActual.cronograma : JSON.stringify(clubActual.cronograma)) : null);

        await db.query(
            `UPDATE clubes 
             SET nombre = ?, descripcion = ?, objetivo = ?, cronograma = ?, 
                 detalle_actividades = ?, espacios_tiempos = ?, impacto = ?, 
                 estatus = IF(estatus = 'rechazado', 'en_revision', estatus), 
                 motivo_rechazo = IF(estatus = 'rechazado', NULL, motivo_rechazo) 
             WHERE id = ?`,
            [
                nombreFinal,
                descripcion !== undefined ? descripcion : clubActual.descripcion,
                objetivo !== undefined ? objetivo : clubActual.objetivo,
                cronogramaFinal,
                detalle_actividades !== undefined ? detalle_actividades : clubActual.detalle_actividades,
                espacios_tiempos !== undefined ? espacios_tiempos : clubActual.espacios_tiempos,
                impacto !== undefined ? impacto : clubActual.impacto,
                id
            ]
        );

        if (esAdmin && nuevo_profesor_id && nuevo_alumno_id) {
            const [profesoresActuales] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_profesor'`, [id]);
            const [alumnosActuales] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_alumno'`, [id]);

            const idProfesorAnterior = profesoresActuales.length > 0 ? profesoresActuales[0].usuario_id : null;
            const idAlumnoAnterior = alumnosActuales.length > 0 ? alumnosActuales[0].usuario_id : null;

            if (idProfesorAnterior && idProfesorAnterior !== nuevo_profesor_id) {
                await db.query(`UPDATE inscripciones SET rol_en_club = 'miembro' WHERE club_id = ? AND usuario_id = ?`, [id, idProfesorAnterior]);
            }
            if (idAlumnoAnterior && idAlumnoAnterior !== nuevo_alumno_id) {
                await db.query(`UPDATE inscripciones SET rol_en_club = 'miembro' WHERE club_id = ? AND usuario_id = ?`, [id, idAlumnoAnterior]);
            }

            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_profesor', estatus = 'activo'`, [nuevo_profesor_id, id]);
            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_alumno', estatus = 'activo'`, [nuevo_alumno_id, id]);
        }

        res.status(200).json({ message: "Editado y actualizado correctamente" });
    } catch (error) {
        console.error("Error al editar club:", error);
        res.status(500).json({ message: "Error interno al editar" });
    }
});

router.put('/:id/aprobar', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    const { id } = req.params;
    const codigoGenerado = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.query(`UPDATE clubes SET estatus = 'activo', codigo_union = ?, motivo_rechazo = NULL WHERE id = ?`, [codigoGenerado, id]);
        res.status(200).json({ message: "Aprobado", codigo: codigoGenerado });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/rechazar', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'rechazado', motivo_rechazo = ? WHERE id = ?`, [req.body.motivo, req.params.id]);
        res.status(200).json({ message: "Rechazado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/pausar', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'inactivo' WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: "Pausado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/reactivar', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'activo' WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: "Reactivado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.delete('/:id', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        const [encargados] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno')`, [req.params.id]);
        await db.query('DELETE FROM clubes WHERE id = ?', [req.params.id]);

        for (let encargado of encargados) {
            const [otros] = await db.query(`SELECT id FROM inscripciones WHERE usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'`, [encargado.usuario_id]);
            if (otros.length === 0) await db.query('UPDATE usuarios SET role_id = 4 WHERE id = ? AND role_id != 1', [encargado.usuario_id]);
        }
        res.status(200).json({ message: "Eliminado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.post('/unirse', verificarToken, requireVerificado, async (req, res) => {
    if (!req.body.codigo) return res.status(400).json({ message: "Código obligatorio" });
    try {
        const [clubesEncontrados] = await db.query('SELECT id FROM clubes WHERE codigo_union = ? AND estatus = "activo"', [req.body.codigo]);
        if (clubesEncontrados.length === 0) return res.status(404).json({ message: "Código inválido" });
        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'miembro', 'activo') ON DUPLICATE KEY UPDATE estatus = 'activo'`, [req.user.id, clubesEncontrados[0].id]);
        res.status(200).json({ message: "¡Te has unido!" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});


router.get('/:id/miembros', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR, ROLES.ALUMNO_REPRESENTANTE, ROLES.ALUMNO]), async (req, res) => {
    try {
        const clubId = req.params.id;
        const [miembros] = await db.query(`
            SELECT 
                u.id, 
                CAST(AES_DECRYPT(u.nombres, ?) AS CHAR CHARACTER SET utf8mb4) AS nombres, 
                CONCAT(
                    IFNULL(CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR CHARACTER SET utf8mb4), ''), 
                    ' ', 
                    IFNULL(CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR CHARACTER SET utf8mb4), '')
                ) AS apellidos,
                CAST(AES_DECRYPT(u.boleta, ?) AS CHAR CHARACTER SET utf8mb4) AS boleta, 
                u.correo,
                i.rol_en_club, 
                i.estatus
            FROM inscripciones i
            JOIN usuarios u ON i.usuario_id = u.id
            WHERE i.club_id = ? AND i.rol_en_club != 'encargado_profesor'
            ORDER BY 
                CASE WHEN i.rol_en_club = 'encargado_alumno' THEN 0 ELSE 1 END,
                i.estatus DESC, 
                CAST(AES_DECRYPT(u.nombres, ?) AS CHAR CHARACTER SET utf8mb4) ASC
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, clubId, AES_KEY]);

        const convertir = (val) => {
            if (!val) return '';
            if (typeof val === 'string') return val;
            if (Buffer.isBuffer(val)) return val.toString('utf8');
            return String(val);
        };

        const miembrosFormateados = miembros.map(m => ({
            id: m.id,
            nombres: convertir(m.nombres),
            apellidos: convertir(m.apellidos).trim(),
            boleta: convertir(m.boleta),
            correo: m.correo ? String(m.correo) : '',
            rol_en_club: m.rol_en_club || 'miembro',
            estatus: String(m.estatus || 'pendiente').toLowerCase()
        }));

        res.status(200).json(miembrosFormateados);
    } catch (error) {
        console.error("Error al obtener firmas:", error);
        res.status(500).json({ message: "Error al cargar la lista de firmas" });
    }
});

router.post('/:id/invitar', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR, ROLES.ALUMNO_REPRESENTANTE, ROLES.ALUMNO]), async (req, res) => {
    const clubId = req.params.id;
    const { usuario_id } = req.body;
    const solicitanteId = req.user.id;
    const solicitanteRol = Number(req.user.rol || req.user.role_id);

    if (!usuario_id) {
        return res.status(400).json({ message: "Debes seleccionar un alumno para invitar." });
    }

    try {
        // 1. Verificar permisos: El usuario debe ser Administrador o Encargado (profesor o alumno) de este club
        if (solicitanteRol !== 1) {
            const [esEncargado] = await db.query(
                `SELECT id FROM inscripciones 
                 WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno')
                 LIMIT 1`,
                [clubId, solicitanteId]
            );
            if (esEncargado.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Solo los encargados de este club o administradores pueden invitar nuevos miembros." });
            }
        }

        // 2. Verificar que el usuario a invitar sea un alumno registrado
        const [alumno] = await db.query(
            `SELECT id, role_id, 
                    CAST(AES_DECRYPT(boleta, ?) AS CHAR CHARACTER SET utf8mb4) AS boleta,
                    CAST(AES_DECRYPT(nombres, ?) AS CHAR CHARACTER SET utf8mb4) AS nombres
             FROM usuarios WHERE id = ?`,
            [AES_KEY, AES_KEY, usuario_id]
        );

        if (alumno.length === 0 || ![ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE].includes(Number(alumno[0].role_id))) {
            return res.status(400).json({ message: "El usuario seleccionado debe ser un estudiante activo con boleta registrada." });
        }

        // 3. Verificar si ya está en inscripciones
        const [inscripcionExistente] = await db.query(
            `SELECT id, estatus, rol_en_club FROM inscripciones WHERE club_id = ? AND usuario_id = ?`,
            [clubId, usuario_id]
        );

        if (inscripcionExistente.length > 0) {
            const actual = inscripcionExistente[0];
            if (actual.estatus === 'activo') {
                return res.status(400).json({ message: "Este alumno ya firmó y es miembro activo del club." });
            }
            if (actual.estatus === 'pendiente') {
                return res.status(400).json({ message: "Este alumno ya tiene una invitación pendiente de responder." });
            }
            // Si estaba en 'rechazado' o 'inactivo', se reactiva como invitación pendiente
            await db.query(
                `UPDATE inscripciones SET estatus = 'pendiente', fecha_inscripcion = NOW() WHERE id = ?`,
                [actual.id]
            );
        } else {
            // Nueva invitación
            await db.query(
                `INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'miembro', 'pendiente', NOW())`,
                [usuario_id, clubId]
            );
        }

        res.status(200).json({ message: `Invitación enviada exitosamente a ${alumno[0].nombres || 'el alumno'}.` });
    } catch (error) {
        console.error("Error al invitar alumno al club:", error);
        res.status(500).json({ message: "Error interno al enviar la invitación." });
    }
});

router.put('/:id/asignar-representante', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR]), async (req, res) => {
    const clubId = req.params.id;
    const { nuevo_usuario_id } = req.body;
    const solicitanteId = req.user.id;
    const solicitanteRol = Number(req.user.rol || req.user.role_id);

    if (!nuevo_usuario_id) {
        return res.status(400).json({ message: "Debes especificar al alumno que asumirá como representante." });
    }

    try {
        // 1. Permisos: Administrador o Profesor Encargado del club
        if (solicitanteRol !== ROLES.ADMINISTRADOR) {
            const [esProfe] = await db.query(
                `SELECT id FROM inscripciones 
                 WHERE club_id = ? AND usuario_id = ? AND rol_en_club = 'encargado_profesor' AND estatus = 'activo'
                 LIMIT 1`,
                [clubId, solicitanteId]
            );
            if (esProfe.length === 0) {
                return res.status(403).json({ message: "Solo el Profesor Titular de este club o un Administrador pueden asignar o cambiar al Alumno Representante." });
            }

            // Validar que el Alumno Representante principal haya rechazado la invitación
            const [repActual] = await db.query(
                `SELECT usuario_id, estatus FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_alumno'`,
                [clubId]
            );
            if (repActual.length > 0 && repActual[0].estatus !== 'rechazado') {
                return res.status(400).json({
                    message: "El Alumno Representante actual aún no ha declinado la invitación. Solo se puede asignar a otro si el principal rechazó."
                });
            }
        }

        // 2. Verificar que nuevo_usuario_id sea un alumno válido con boleta
        const [alumno] = await db.query(
            `SELECT id, role_id, 
                    CAST(AES_DECRYPT(boleta, ?) AS CHAR CHARACTER SET utf8mb4) AS boleta,
                    CAST(AES_DECRYPT(nombres, ?) AS CHAR CHARACTER SET utf8mb4) AS nombres,
                    CONCAT(IFNULL(CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR CHARACTER SET utf8mb4), ''), ' ', IFNULL(CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR CHARACTER SET utf8mb4), '')) AS apellidos
             FROM usuarios WHERE id = ?`,
            [AES_KEY, AES_KEY, AES_KEY, AES_KEY, nuevo_usuario_id]
        );

        if (alumno.length === 0 || ![ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE].includes(Number(alumno[0].role_id))) {
            return res.status(400).json({ message: "El usuario seleccionado debe ser un estudiante activo con boleta registrada." });
        }

        const nombreAlumno = `${alumno[0].nombres || ''} ${alumno[0].apellidos || ''}`.trim() || 'el estudiante';

        // 3. Degradación / reasignación del representante anterior de este club a miembro
        await db.query(
            `UPDATE inscripciones 
             SET rol_en_club = 'miembro' 
             WHERE club_id = ? AND rol_en_club = 'encargado_alumno' AND usuario_id != ?`,
            [clubId, nuevo_usuario_id]
        );

        // 4. Asignar al nuevo alumno como encargado_alumno
        const [existente] = await db.query(
            `SELECT id, estatus, rol_en_club FROM inscripciones WHERE club_id = ? AND usuario_id = ?`,
            [clubId, nuevo_usuario_id]
        );

        let mensajeAccion = '';
        if (existente.length > 0) {
            const actual = existente[0];
            if (actual.estatus === 'activo') {
                // Ya había firmado como miembro, se promueve a Alumno Representante activo inmediatamente
                await db.query(
                    `UPDATE inscripciones SET rol_en_club = 'encargado_alumno' WHERE id = ?`,
                    [actual.id]
                );
                mensajeAccion = `¡${nombreAlumno} ha sido promovido exitosamente a Alumno Representante! Como ya había firmado previamente, el club cuenta ahora con su representante confirmado.`;
            } else {
                // Estaba pendiente o rechazado, se reactiva/actualiza como encargado_alumno pendiente de firma
                await db.query(
                    `UPDATE inscripciones SET rol_en_club = 'encargado_alumno', estatus = 'pendiente', fecha_inscripcion = NOW() WHERE id = ?`,
                    [actual.id]
                );
                mensajeAccion = `Se ha designado a ${nombreAlumno} como Alumno Representante. Se ha enviado su invitación para que acepte y firme su participación.`;
            }
        } else {
            // No estaba en el club, se inserta directamente como encargado_alumno pendiente
            await db.query(
                `INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus, fecha_inscripcion) 
                 VALUES (?, ?, 'encargado_alumno', 'pendiente', NOW())`,
                [nuevo_usuario_id, clubId]
            );
            mensajeAccion = `Se ha invitado a ${nombreAlumno} como nuevo Alumno Representante. Queda pendiente de confirmar su firma.`;
        }

        res.status(200).json({
            message: mensajeAccion,
            alumno_id: nuevo_usuario_id,
            nombre_completo: nombreAlumno
        });
    } catch (error) {
        console.error("Error al asignar nuevo alumno representante:", error);
        res.status(500).json({ message: "Error interno al asignar el alumno representante." });
    }
});


router.get('/:idClub/miembros/:idUsuario/emergencia', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR, ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE]), async (req, res) => {
    const { idClub, idUsuario } = req.params;
    const solicitanteId = req.user.id;
    const solicitanteRol = Number(req.user.rol);

    try {
        if (solicitanteRol !== 1) {
            const [esEncargado] = await db.query(`
                SELECT id FROM inscripciones 
                WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'
                LIMIT 1
            `, [idClub, solicitanteId]);

            if (esEncargado.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Exclusivo para encargados de este club." });
            }
        }

        const [perteneceAlClub] = await db.query(`
            SELECT id, rol_en_club, estatus FROM inscripciones 
            WHERE club_id = ? AND usuario_id = ?
            LIMIT 1
        `, [idClub, idUsuario]);

        if (perteneceAlClub.length === 0) {
            return res.status(404).json({ message: "El usuario no pertenece a este club." });
        }

        const [filasUsuario] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombres, ?) AS CHAR) AS nombres, 
                   CONCAT(CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR), ' ', IFNULL(CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR), '')) AS apellidos,
                   CAST(AES_DECRYPT(boleta, ?) AS CHAR) AS boleta, 
                   CAST(AES_DECRYPT(num_empleado, ?) AS CHAR) AS num_empleado, 
                   correo, 
                   CAST(AES_DECRYPT(nss, ?) AS CHAR) AS nss, 
                   tipo_sangre, 
                   CAST(AES_DECRYPT(condiciones_preexistentes, ?) AS CHAR) AS condiciones_preexistentes
            FROM usuarios
            WHERE id = ?
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, idUsuario]);

        if (filasUsuario.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        const usuario = filasUsuario[0];

        const [contactos] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombre, ?) AS CHAR) AS nombre, 
                   CAST(AES_DECRYPT(telefono, ?) AS CHAR) AS telefono, 
                   CAST(AES_DECRYPT(parentesco, ?) AS CHAR) AS parentesco
            FROM contactos_emergencia
            WHERE usuario_id = ?
            ORDER BY id ASC
        `, [AES_KEY, AES_KEY, AES_KEY, idUsuario]);

        res.status(200).json({
            usuario_id: usuario.id,
            nombre_completo: `${usuario.nombres} ${usuario.apellidos}`.trim(),
            boleta: usuario.boleta,
            num_empleado: usuario.num_empleado,
            correo: usuario.correo,
            rol_en_club: perteneceAlClub[0].rol_en_club,
            estatus_inscripcion: perteneceAlClub[0].estatus,
            tipo_sangre: usuario.tipo_sangre || null,
            alergias: usuario.condiciones_preexistentes || null,
            nss: usuario.nss || null,
            contactos: contactos || []
        });
    } catch (error) {
        console.error("Error al obtener información de emergencia:", error);
        res.status(500).json({ message: "Error interno al cargar la información de emergencia." });
    }
});


router.get('/:idClub/emergencias', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR, ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE]), async (req, res) => {
    const { idClub } = req.params;
    const solicitanteId = req.user.id;
    const solicitanteRol = Number(req.user.rol || req.user.role_id);

    try {
        let esAdmin = solicitanteRol === 1;
        if (!esAdmin) {
            const [u] = await db.query('SELECT role_id FROM usuarios WHERE id = ?', [solicitanteId]);
            if (u.length > 0 && Number(u[0].role_id) === 1) {
                esAdmin = true;
            }
        }

        if (!esAdmin) {
            const [esEncargado] = await db.query(`
                SELECT id FROM inscripciones 
                WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'
                LIMIT 1
            `, [idClub, solicitanteId]);

            if (esEncargado.length === 0) {
                return res.status(403).json({ message: "Acceso denegado. Exclusivo para encargados de este club y administradores." });
            }
        }


        const [clubes] = await db.query(`SELECT id, nombre FROM clubes WHERE id = ?`, [idClub]);
        if (clubes.length === 0) {
            return res.status(404).json({ message: "Club no encontrado." });
        }
        const club = clubes[0];

        const [miembros] = await db.query(`
            SELECT 
                u.id AS usuario_id,
                u.nombres,
                CONCAT(u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) AS apellidos,
                u.boleta,
                u.num_empleado,
                u.correo,
                u.nss,
                u.tipo_sangre,
                u.condiciones_preexistentes AS alergias,
                i.rol_en_club,
                i.estatus AS estatus_inscripcion
            FROM inscripciones i
            JOIN usuarios u ON i.usuario_id = u.id
            WHERE i.club_id = ? AND i.estatus = 'activo'
            ORDER BY 
                CASE 
                    WHEN i.rol_en_club = 'encargado_profesor' THEN 1
                    WHEN i.rol_en_club = 'encargado_alumno' THEN 2
                    ELSE 3
                END,
                u.nombres ASC, u.apellido_paterno ASC
        `, [idClub]);

        if (miembros.length === 0) {
            return res.status(200).json({ club, miembros: [] });
        }

        const memberIds = miembros.map(m => m.usuario_id);
        const [contactos] = await db.query(`
            SELECT id, usuario_id, 
                   CAST(AES_DECRYPT(nombre, ?) AS CHAR) AS nombre, 
                   CAST(AES_DECRYPT(telefono, ?) AS CHAR) AS telefono, 
                   CAST(AES_DECRYPT(parentesco, ?) AS CHAR) AS parentesco
            FROM contactos_emergencia
            WHERE usuario_id IN (?)
            ORDER BY id ASC
        `, [AES_KEY, AES_KEY, AES_KEY, memberIds]);


        const contactosMap = {};
        for (const c of contactos) {
            if (!contactosMap[c.usuario_id]) {
                contactosMap[c.usuario_id] = [];
            }
            contactosMap[c.usuario_id].push({
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                parentesco: c.parentesco
            });
        }

        const miembrosConEmergencia = miembros.map(m => ({
            usuario_id: m.usuario_id,
            nombre_completo: `${m.nombres} ${m.apellidos}`.trim(),
            boleta: m.boleta,
            num_empleado: m.num_empleado,
            correo: m.correo,
            rol_en_club: m.rol_en_club,
            estatus_inscripcion: m.estatus_inscripcion,
            tipo_sangre: m.tipo_sangre || null,
            alergias: m.alergias || null,
            nss: m.nss || null,
            contactos: contactosMap[m.usuario_id] || []
        }));

        res.status(200).json({
            club,
            miembros: miembrosConEmergencia
        });
    } catch (error) {
        console.error("Error al obtener emergencias del club:", error);
        res.status(500).json({ message: "Error interno al cargar la información de emergencia del club." });
    }
});


router.delete('/:id/salir', verificarToken, requireVerificado, checkRole([ROLES.ALUMNO, ROLES.PROFESOR, ROLES.ALUMNO_REPRESENTANTE]), async (req, res) => {
    const idClub = req.params.id;
    const idUsuario = req.user.id;

    try {
        const [clubes] = await db.query('SELECT id, nombre FROM clubes WHERE id = ?', [idClub]);
        if (clubes.length === 0) {
            return res.status(404).json({ message: 'El club especificado no existe.' });
        }
        const club = clubes[0];

        const [inscripciones] = await db.query(
            'SELECT id, rol_en_club, estatus FROM inscripciones WHERE club_id = ? AND usuario_id = ?',
            [idClub, idUsuario]
        );
        if (inscripciones.length === 0) {
            return res.status(404).json({ message: 'No te encuentras inscrito en este club.' });
        }

        const inscripcion = inscripciones[0];
        const esEncargadoClub = ['encargado_profesor', 'encargado_alumno'].includes(inscripcion.rol_en_club);

        if (esEncargadoClub && inscripcion.estatus === 'activo') {
            return res.status(400).json({
                message: 'Como encargado titular del club no puedes darte de baja directamente. Solicita primero a un Administrador el relevo de tu cargo.'
            });
        }

        await db.query(
            `DELETE ae FROM asistencias_eventos ae
             INNER JOIN eventos_club ec ON ae.evento_id = ec.id
             WHERE ec.club_id = ? AND ae.usuario_id = ?`,
            [idClub, idUsuario]
        );

        await db.query('DELETE FROM inscripciones WHERE club_id = ? AND usuario_id = ?', [idClub, idUsuario]);

        res.status(200).json({ message: `Has salido del club "${club.nombre}" exitosamente.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno al procesar tu salida del club." });
    }
});


router.delete('/:idClub/miembros/:idUsuario', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR, ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE]), async (req, res) => {
    const { idClub, idUsuario } = req.params;
    const solicitanteId = req.user.id;
    const solicitanteRol = Number(req.user.rol || req.user.role_id);

    try {
        const [clubes] = await db.query('SELECT id, nombre FROM clubes WHERE id = ?', [idClub]);
        if (clubes.length === 0) {
            return res.status(404).json({ message: 'El club especificado no existe.' });
        }

        let tienePermiso = solicitanteRol === 1;

        if (!tienePermiso) {
            const [esEncargado] = await db.query(
                `SELECT id FROM inscripciones
                 WHERE club_id = ? AND usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'
                 LIMIT 1`,
                [idClub, solicitanteId]
            );
            if (esEncargado.length > 0) {
                tienePermiso = true;
            }
        }

        if (!tienePermiso) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo los encargados de este club o un administrador pueden expulsar miembros.'
            });
        }

        if (Number(solicitanteId) === Number(idUsuario)) {
            return res.status(400).json({ message: 'No puedes expulsarte a ti mismo del club.' });
        }

        const [inscripciones] = await db.query(
            'SELECT id, rol_en_club, estatus FROM inscripciones WHERE club_id = ? AND usuario_id = ?',
            [idClub, idUsuario]
        );
        if (inscripciones.length === 0) {
            return res.status(404).json({ message: 'El usuario especificado no pertenece a este club.' });
        }

        const inscripcionObjetivo = inscripciones[0];
        const objetivoEsEncargado = ['encargado_profesor', 'encargado_alumno'].includes(inscripcionObjetivo.rol_en_club);

        if (objetivoEsEncargado) {
            return res.status(400).json({
                message: 'No es posible expulsar directamente a un encargado titular del club. Solicita a un Administrador el cambio de encargado.'
            });
        }

        await db.query(
            `DELETE ae FROM asistencias_eventos ae
             INNER JOIN eventos_club ec ON ae.evento_id = ec.id
             WHERE ec.club_id = ? AND ae.usuario_id = ?`,
            [idClub, idUsuario]
        );

        await db.query('DELETE FROM inscripciones WHERE club_id = ? AND usuario_id = ?', [idClub, idUsuario]);

        res.status(200).json({ message: 'El integrante ha sido expulsado del club exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno al intentar expulsar al miembro del club.' });
    }
});

module.exports = router;