const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware'); // NUEVO


function convertirAFechaMySQL(valor) {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().slice(0, 19).replace('T', ' ');
}

// ==========================================
// --- SISTEMA DE INVITACIONES Y NOTIFICACIONES ---
// ==========================================
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
            await db.query(`DELETE FROM inscripciones WHERE club_id = ? AND usuario_id = ? AND estatus = 'pendiente'`, [idClub, idUsuario]);
            res.status(200).json({ message: "Invitación rechazada" });
        }
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.put('/:id/enviar-revision', verificarToken, requireVerificado, async (req, res) => {
    const { id } = req.params;
    try {
        const [resultadoConteo] = await db.query(`SELECT COUNT(*) as total FROM inscripciones WHERE club_id = ? AND estatus = 'activo' AND rol_en_club != 'encargado_profesor'`, [id]);
        if (resultadoConteo[0].total < 20) return res.status(400).json({ message: `Aún faltan confirmaciones. Han aceptado ${resultadoConteo[0].total} de 20.` });

        await db.query(`UPDATE clubes SET estatus = 'en_revision' WHERE id = ?`, [id]);
        res.status(200).json({ message: "Club enviado a revisión exitosamente" });
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

// ==========================================
// --- DASHBOARD DEL CLUB (CHAT, AVISOS, EVENTOS, RECURSOS) ---
// ==========================================
router.get('/:id/chat', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [mensajes] = await db.query(`
            SELECT c.id, c.club_id, c.usuario_id, c.mensaje, c.fecha_envio, CONCAT(u.nombres, ' ', u.apellido_paterno) AS autor_nombre
            FROM chat_mensajes c JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.club_id = ? AND c.tipo_sala = 'club' ORDER BY c.fecha_envio ASC
        `, [req.params.id]);
        res.status(200).json(mensajes);
    } catch (error) { res.status(500).json({ message: "Error al cargar chat" }); }
});

router.get('/:id/avisos', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [avisos] = await db.query(`
            SELECT a.*, CONCAT(u.nombres, ' ', u.apellido_paterno) AS autor_nombre
            FROM avisos a JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.club_id = ? AND a.activo = 1 ORDER BY a.fecha_envio DESC
        `, [req.params.id]);
        res.status(200).json(avisos);
    } catch (error) { res.status(500).json({ message: "Error al cargar avisos" }); }
});

router.post('/:id/avisos', verificarToken, requireVerificado, async (req, res) => {
    const { contenido, titulo, prioridad } = req.body;
    const prioridadValida = ['alta', 'normal', 'baja'].includes(String(prioridad).toLowerCase()) 
        ? String(prioridad).toLowerCase() 
        : 'normal';

    try {
        await db.query(
            `INSERT INTO avisos (club_id, usuario_id, titulo, contenido, prioridad, fecha_envio, activo) VALUES (?, ?, ?, ?, ?, NOW(), 1)`,
            [req.params.id, req.user.id, titulo || null, contenido, prioridadValida]
        );

        const io = req.app.get('socketio');
        if (io) {
            io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'aviso', prioridad: prioridadValida });
        }

        res.status(201).json({ message: "Aviso publicado exitosamente", prioridad: prioridadValida });
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
    const { titulo, descripcion, fecha_evento, lugar, prioridad = 'alta', notificarAviso = true } = req.body;

    // Validamos y convertimos la fecha ANTES de tocar la base de datos
    const fechaConvertida = convertirAFechaMySQL(fecha_evento);
    if (!fechaConvertida) {
        return res.status(400).json({ message: "La fecha del evento no es válida. Usa un formato como 'YYYY-MM-DDTHH:mm:ss'." });
    }

    const prioridadValida = ['alta', 'normal', 'baja'].includes(String(prioridad).toLowerCase()) 
        ? String(prioridad).toLowerCase() 
        : 'alta';

    try {
        // 1. Registrar el evento con su nivel de prioridad
        await db.query(
            `INSERT INTO eventos_club (club_id, usuario_id, titulo, descripcion, fecha_evento, lugar, prioridad) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, titulo, descripcion, fechaConvertida, lugar, prioridadValida]
        );

        // 2. Notificar a los miembros creando un aviso oficial con prioridad alta (o la asignada)
        if (notificarAviso !== false) {
            let fechaLegible = fechaConvertida;
            try {
                const f = new Date(fechaConvertida);
                fechaLegible = f.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
            } catch (e) {}

            const tituloAviso = `📅 Nuevo Evento: ${titulo}`;
            const contenidoAviso = `Se ha programado una nueva actividad oficial: "${titulo}".\n📅 Fecha: ${fechaLegible}${lugar ? `\n📍 Lugar: ${lugar}` : ''}.\n${descripcion ? `📝 Detalles: ${descripcion}\n` : ''}¡Por favor confirma tu asistencia en la sección de Eventos del Club!`;

            await db.query(
                `INSERT INTO avisos (club_id, usuario_id, titulo, contenido, prioridad, fecha_envio, activo) VALUES (?, ?, ?, ?, ?, NOW(), 1)`,
                [req.params.id, req.user.id, tituloAviso, contenidoAviso, prioridadValida]
            );
        }

        const io = req.app.get('socketio');
        if (io) {
            io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'evento', prioridad: prioridadValida });
            io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'aviso', prioridad: prioridadValida });
        }

        res.status(201).json({ message: "Evento creado y aviso notificado con prioridad", prioridad: prioridadValida });
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



// ==========================================
// --- CHAT GLOBAL DE DIRECTIVOS (ADMIN Y ENCARGADOS) ---
// ==========================================
router.get('/chat-directivos/historial', verificarToken, requireVerificado, async (req, res) => {
    const idUsuario = req.user.id;
    const rolUsuario = req.user.rol; // Asumiendo que tu token inyecta el rol en req.user

    try {
        // Barrera de seguridad: Verificar si tiene privilegios para ver esto
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
                   CONCAT(u.nombres, ' ', u.apellido_paterno) AS autor_nombre,
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
        `);
        res.status(200).json(mensajes);
    } catch (error) { 
        console.error("Error al cargar chat directivos:", error);
        res.status(500).json({ message: "Error interno al cargar el chat directivo" }); 
    }
});

// ==========================================
// --- CHAT EXCLUSIVO ENTRE ENCARGADOS ---
// ==========================================
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
                   CONCAT(u.nombres, ' ', u.apellido_paterno) AS autor_nombre,
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
        `);
        res.status(200).json(mensajes);
    } catch (error) { 
        res.status(500).json({ message: "Error interno" }); 
    }
});


// ==========================================
// --- OBTENER CLUBES GLOBALES ---
// ==========================================

router.get('/', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [filas] = await db.query(`
            SELECT c.*,
                p.id AS profesor_encargado_id, p.nombres AS profesor_nombres, CONCAT(p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS profesor_apellidos,
                p.correo AS profesor_correo, p.num_empleado AS profesor_num_empleado,
                a.id AS alumno_encargado_id, a.nombres AS alumno_nombres, CONCAT(a.apellido_paterno, ' ', IFNULL(a.apellido_materno, '')) AS alumno_apellidos,
                a.correo AS alumno_correo, a.boleta AS alumno_boleta
            FROM clubes c
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
        `);
        const clubesTratados = filas.map(club => ({ ...club, cronograma: club.cronograma ? JSON.stringify(club.cronograma) : null }));
        res.status(200).json(clubesTratados);
    } catch (error) { 
        res.status(500).json({ message: "Error interno" }); 
    }
});

router.get('/user/:idUsuario', verificarToken, requireVerificado, async (req, res) => {
    const { idUsuario } = req.params;
    try {
        const [filas] = await db.query(`
            SELECT c.*,
                p.id AS profesor_encargado_id, p.nombres AS profesor_nombres, CONCAT(p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS profesor_apellidos,
                p.correo AS profesor_correo, p.num_empleado AS profesor_num_empleado,
                a.id AS alumno_encargado_id, a.nombres AS alumno_nombres, CONCAT(a.apellido_paterno, ' ', IFNULL(a.apellido_materno, '')) AS alumno_apellidos,
                a.correo AS alumno_correo, a.boleta AS alumno_boleta,
                i.estatus AS inscripcion_estatus, i.fecha_inscripcion, i.rol_en_club AS mi_rol_interno,
                (SELECT COUNT(*) FROM inscripciones WHERE club_id = c.id AND estatus = 'activo' AND rol_en_club != 'encargado_profesor') AS aceptados_count
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id AND i.usuario_id = ?
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
        `, [idUsuario]);

        const clubesTratados = filas.map(club => ({ ...club, cronograma: club.cronograma ? JSON.stringify(club.cronograma) : null }));
        res.status(200).json(clubesTratados);
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

// ==========================================
// --- AUDITORÍA DE HISTORIAL DE ENCARGADOS ---
// ==========================================
router.get('/:id/historial-encargados', verificarToken, requireVerificado, async (req, res) => {
    if (req.user.rol !== 1) {
        return res.status(403).json({ message: "Acceso exclusivo para administradores" });
    }
    
    try {
        const [historial] = await db.query(`
            SELECT h.id, h.rol_desempenado AS rol_en_club, h.fecha_inicio, h.fecha_fin,
                   CONCAT(u.nombres, ' ', u.apellido_paterno) AS nombre_completo,
                   u.correo, u.num_empleado, u.boleta
            FROM historial_encargados h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.club_id = ?
            ORDER BY h.fecha_fin DESC
        `, [req.params.id]);
        
        res.status(200).json(historial);
    } catch (error) {
        console.error("Error historial:", error);
        res.status(500).json({ message: "Error al obtener historial" });
    }
});


// ==========================================
// --- CREACIÓN, EDICIÓN Y ACCIONES DE ADMIN ---
// ==========================================
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
    
    try {
        await db.query(
            `UPDATE clubes 
             SET nombre = ?, descripcion = ?, objetivo = ?, cronograma = ?, 
                 detalle_actividades = ?, espacios_tiempos = ?, impacto = ?, 
                 estatus = IF(estatus = 'rechazado', 'en_revision', estatus), 
                 motivo_rechazo = IF(estatus = 'rechazado', NULL, motivo_rechazo) 
             WHERE id = ?`,
            [nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, id]
        );

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
       
        res.status(200).json({ message: "Editado y actualizado correctamente" });
    } catch (error) {
        console.error("Error al editar club:", error);
        res.status(500).json({ message: "Error interno al editar" });
    }
});

router.put('/:id/aprobar', verificarToken, requireVerificado, async (req, res) => {
    const { id } = req.params;
    const codigoGenerado = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.query(`UPDATE clubes SET estatus = 'activo', codigo_union = ?, motivo_rechazo = NULL WHERE id = ?`, [codigoGenerado, id]);
        res.status(200).json({ message: "Aprobado", codigo: codigoGenerado });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/rechazar', verificarToken, requireVerificado, async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'rechazado', motivo_rechazo = ? WHERE id = ?`, [req.body.motivo, req.params.id]);
        res.status(200).json({ message: "Rechazado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/pausar', verificarToken, requireVerificado, async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'inactivo' WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: "Pausado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/reactivar', verificarToken, requireVerificado, async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'activo' WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: "Reactivado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.delete('/:id', verificarToken, requireVerificado, async (req, res) => {
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

// ==========================================
// --- OBTENER ESTADO DE FIRMAS (PROFESOR) ---
// ==========================================
router.get('/:id/miembros', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [miembros] = await db.query(`
            SELECT u.id, u.nombres, CONCAT(u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) AS apellidos,
                   u.boleta, i.rol_en_club, i.estatus
            FROM inscripciones i
            JOIN usuarios u ON i.usuario_id = u.id
            WHERE i.club_id = ? AND i.rol_en_club != 'encargado_profesor'
            ORDER BY i.estatus DESC, u.nombres ASC
        `, [req.params.id]);

        res.status(200).json(miembros);
    } catch (error) {
        console.error("Error al obtener firmas:", error);
        res.status(500).json({ message: "Error al cargar la lista de firmas" });
    }
});

// ==========================================
// --- INFORMACIÓN DE EMERGENCIA DE UN MIEMBRO (SOLO ENCARGADOS Y ADMIN) ---
// ==========================================
router.get('/:idClub/miembros/:idUsuario/emergencia', verificarToken, requireVerificado, async (req, res) => {
    const { idClub, idUsuario } = req.params;
    const solicitanteId = req.user.id;
    const solicitanteRol = Number(req.user.rol);

    try {
        // 1. Barrera de Seguridad: Verificar que el solicitante sea Administrador (rol 1) o Encargado Activo de ESTE club
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

        // 2. Verificar que el miembro pertenezca al club especificado
        const [perteneceAlClub] = await db.query(`
            SELECT id, rol_en_club, estatus FROM inscripciones 
            WHERE club_id = ? AND usuario_id = ?
            LIMIT 1
        `, [idClub, idUsuario]);

        if (perteneceAlClub.length === 0) {
            return res.status(404).json({ message: "El usuario no pertenece a este club." });
        }

        // 3. Consultar datos del usuario
        const [filasUsuario] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos,
                   boleta, num_empleado, correo, nss, tipo_sangre, condiciones_preexistentes
            FROM usuarios
            WHERE id = ?
        `, [idUsuario]);

        if (filasUsuario.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        const usuario = filasUsuario[0];

        // 4. Consultar contactos de emergencia
        const [contactos] = await db.query(`
            SELECT id, nombre, telefono, parentesco
            FROM contactos_emergencia
            WHERE usuario_id = ?
            ORDER BY id ASC
        `, [idUsuario]);

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

// ==========================================
// --- INFORMACIÓN DE EMERGENCIA DE TODOS LOS MIEMBROS (SOLO ENCARGADOS Y ADMIN) ---
// ==========================================
router.get('/:idClub/emergencias', verificarToken, requireVerificado, async (req, res) => {
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

        // 1. Barrera de Seguridad: Verificar que el solicitante sea Administrador (rol 1) o Encargado Activo de ESTE club
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

        // 2. Obtener datos del club
        const [clubes] = await db.query(`SELECT id, nombre FROM clubes WHERE id = ?`, [idClub]);
        if (clubes.length === 0) {
            return res.status(404).json({ message: "Club no encontrado." });
        }
        const club = clubes[0];

        // 3. Obtener todos los miembros activos del club
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

        // 4. Obtener contactos de emergencia de los miembros
        const memberIds = miembros.map(m => m.usuario_id);
        const [contactos] = await db.query(`
            SELECT id, usuario_id, nombre, telefono, parentesco
            FROM contactos_emergencia
            WHERE usuario_id IN (?)
            ORDER BY id ASC
        `, [memberIds]);

        // Mapear contactos por usuario_id
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

module.exports = router;