const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware'); // NUEVO

// Convierte cualquier valor de fecha recibido del cliente a formato DATETIME de MySQL.
// Devuelve null si el valor no es una fecha válida, para que el endpoint pueda rechazarla.
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
            FROM chat_club c JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.club_id = ? ORDER BY c.fecha_envio ASC
        `, [req.params.id]);
        res.status(200).json(mensajes);
    } catch (error) { res.status(500).json({ message: "Error al cargar chat" }); }
});

router.get('/:id/avisos', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [avisos] = await db.query(`
            SELECT a.*, CONCAT(u.nombres, ' ', u.apellido_paterno) AS autor_nombre
            FROM avisos_club a JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.club_id = ? AND a.activo = 1 ORDER BY a.fecha_envio DESC
        `, [req.params.id]);
        res.status(200).json(avisos);
    } catch (error) { res.status(500).json({ message: "Error al cargar avisos" }); }
});

router.post('/:id/avisos', verificarToken, requireVerificado, async (req, res) => {
    const { contenido } = req.body;
    try {
        await db.query(`INSERT INTO avisos_club (club_id, usuario_id, contenido) VALUES (?, ?, ?)`, [req.params.id, req.user.id, contenido]);

        // Se emite desde un endpoint REST ya protegido por verificarToken, no desde un
        // socket sin autenticar, así que no requiere ajustes tras proteger el handshake.
        const io = req.app.get('socketio');
        io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'aviso' });

        res.status(201).json({ message: "Aviso publicado" });
    } catch (error) { res.status(500).json({ message: "Error al crear aviso" }); }
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
    const { titulo, descripcion, fecha_evento, lugar } = req.body;

    // Validamos y convertimos la fecha ANTES de tocar la base de datos,
    // ahora que la columna es DATETIME y no acepta cualquier texto.
    const fechaConvertida = convertirAFechaMySQL(fecha_evento);
    if (!fechaConvertida) {
        return res.status(400).json({ message: "La fecha del evento no es válida. Usa un formato como 'YYYY-MM-DDTHH:mm:ss'." });
    }

    try {
        await db.query(
            `INSERT INTO eventos_club (club_id, usuario_id, titulo, descripcion, fecha_evento, lugar) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, titulo, descripcion, fechaConvertida, lugar]
        );

        const io = req.app.get('socketio');
        io.to(`club_${req.params.id}`).emit('notificacion_interna', { tipo: 'evento' });

        res.status(201).json({ message: "Evento creado" });
    } catch (error) { res.status(500).json({ message: "Error al crear evento" }); }
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

router.post('/:id/recursos', verificarToken, requireVerificado, async (req, res) => {
    const { tipo_club, tipo_recurso, nombre_recurso, cantidad, unidad, especificaciones, opciones_marcas, motivo } = req.body;
    try {
        await db.query(
            `INSERT INTO solicitudes_recursos (club_id, usuario_id, tipo_club, tipo_recurso, nombre_recurso, cantidad, unidad, especificaciones, opciones_marcas, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, tipo_club, tipo_recurso, nombre_recurso, cantidad, unidad, especificaciones, opciones_marcas, motivo]
        );
        res.status(201).json({ message: "Solicitud enviada a revisión." });
    } catch (error) { res.status(500).json({ message: "Error al solicitar recurso" }); }
});

// ==========================================
// --- OBTENER CLUBES GLOBALES ---
// ==========================================
router.get('/', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [filas] = await db.query(`
            SELECT c.*,
                p.id AS profesor_encargado_id, p.nombres AS profesor_nombres, CONCAT(p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS profesor_apellidos,
                p.correo AS profesor_correo, pd.num_empleado AS profesor_num_empleado,
                a.id AS alumno_encargado_id, a.nombres AS alumno_nombres, CONCAT(a.apellido_paterno, ' ', IFNULL(a.apellido_materno, '')) AS alumno_apellidos,
                a.correo AS alumno_correo, ad.boleta AS alumno_boleta
            FROM clubes c
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN profesores_detalles pd ON p.id = pd.usuario_id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
            LEFT JOIN alumnos_detalles ad ON a.id = ad.usuario_id
        `);
        const clubesTratados = filas.map(club => ({ ...club, cronograma: club.cronograma ? JSON.stringify(club.cronograma) : null }));
        res.status(200).json(clubesTratados);
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.get('/user/:idUsuario', verificarToken, requireVerificado, async (req, res) => {
    const { idUsuario } = req.params;
    try {
        const [filas] = await db.query(`
            SELECT c.*,
                p.id AS profesor_encargado_id, p.nombres AS profesor_nombres, CONCAT(p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS profesor_apellidos,
                p.correo AS profesor_correo, pd.num_empleado AS profesor_num_empleado,
                a.id AS alumno_encargado_id, a.nombres AS alumno_nombres, CONCAT(a.apellido_paterno, ' ', IFNULL(a.apellido_materno, '')) AS alumno_apellidos,
                a.correo AS alumno_correo, ad.boleta AS alumno_boleta,
                i.estatus AS inscripcion_estatus, i.fecha_inscripcion, i.rol_en_club AS mi_rol_interno,
                (SELECT COUNT(*) FROM inscripciones WHERE club_id = c.id AND estatus = 'activo' AND rol_en_club != 'encargado_profesor') AS aceptados_count
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id AND i.usuario_id = ?
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN profesores_detalles pd ON p.id = pd.usuario_id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
            LEFT JOIN alumnos_detalles ad ON a.id = ad.usuario_id
        `, [idUsuario]);

        const clubesTratados = filas.map(club => ({ ...club, cronograma: club.cronograma ? JSON.stringify(club.cronograma) : null }));
        res.status(200).json(clubesTratados);
    } catch (error) { res.status(500).json({ message: "Error" }); }
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
            `UPDATE clubes SET nombre = ?, descripcion = ?, objetivo = ?, cronograma = ?, detalle_actividades = ?, espacios_tiempos = ?, impacto = ?, estatus = 'en_revision', motivo_rechazo = NULL WHERE id = ?`,
            [nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, id]
        );

        const [profesoresActuales] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_profesor'`, [id]);
        const [alumnosActuales] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_alumno'`, [id]);

        const idProfesorAnterior = profesoresActuales.length > 0 ? profesoresActuales[0].usuario_id : null;
        const idAlumnoAnterior = alumnosActuales.length > 0 ? alumnosActuales[0].usuario_id : null;

        if (idProfesorAnterior && idProfesorAnterior !== nuevo_profesor_id) await db.query(`UPDATE inscripciones SET rol_en_club = 'miembro' WHERE club_id = ? AND usuario_id = ?`, [id, idProfesorAnterior]);
        if (idAlumnoAnterior && idAlumnoAnterior !== nuevo_alumno_id) await db.query(`UPDATE inscripciones SET rol_en_club = 'miembro' WHERE club_id = ? AND usuario_id = ?`, [id, idAlumnoAnterior]);

        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_profesor', estatus = 'activo'`, [nuevo_profesor_id, id]);
        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_alumno', estatus = 'activo'`, [nuevo_alumno_id, id]);

        res.status(200).json({ message: "Editado y reenviado a revisión correctamente" });
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
                   ad.boleta, i.rol_en_club, i.estatus
            FROM inscripciones i
            JOIN usuarios u ON i.usuario_id = u.id
            LEFT JOIN alumnos_detalles ad ON u.id = ad.usuario_id
            WHERE i.club_id = ? AND i.rol_en_club != 'encargado_profesor'
            ORDER BY i.estatus DESC, u.nombres ASC
        `, [req.params.id]);

        res.status(200).json(miembros);
    } catch (error) {
        console.error("Error al obtener firmas:", error);
        res.status(500).json({ message: "Error al cargar la lista de firmas" });
    }
});

module.exports = router;