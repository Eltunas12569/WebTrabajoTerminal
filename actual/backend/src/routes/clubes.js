const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middlewares/authMiddleware');

// ==========================================
// --- SISTEMA DE INVITACIONES Y NOTIFICACIONES ---
// ==========================================

router.get('/invitaciones/pendientes', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await db.query(`
            SELECT c.id AS club_id, c.nombre, i.rol_en_club AS rol_invitado
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id
            WHERE i.usuario_id = ? AND i.estatus = 'pendiente'
        `, [userId]);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.put('/invitaciones/:clubId/responder', verifyToken, async (req, res) => {
    const { clubId } = req.params;
    const { accion } = req.body; 
    const userId = req.user.id;

    try {
        if (accion === 'aceptar') {
            await db.query(`UPDATE inscripciones SET estatus = 'activo' WHERE club_id = ? AND usuario_id = ?`, [clubId, userId]);
            res.status(200).json({ message: "¡Bienvenido al club!" });
        } else {
            await db.query(`DELETE FROM inscripciones WHERE club_id = ? AND usuario_id = ? AND estatus = 'pendiente'`, [clubId, userId]);
            res.status(200).json({ message: "Invitación rechazada" });
        }
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.put('/:id/enviar-revision', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        // 👇 CORRECCIÓN: Contamos solo a los alumnos activos (Excluimos al profe) 👇
        const [countRes] = await db.query(`
            SELECT COUNT(*) as total 
            FROM inscripciones 
            WHERE club_id = ? AND estatus = 'activo' AND rol_en_club != 'encargado_profesor'
        `, [id]);
        
        if (countRes[0].total < 20) {
            return res.status(400).json({ message: `Aún faltan confirmaciones. Solo han aceptado ${countRes[0].total} de 20 alumnos.` });
        }
        await db.query(`UPDATE clubes SET estatus = 'en_revision' WHERE id = ?`, [id]);
        res.status(200).json({ message: "Club enviado a revisión exitosamente" });
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

// ==========================================
// --- OBTENER CLUBES ---
// ==========================================

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, 
                p.id AS profesor_encargado_id, p.nombres AS profesor_nombres, CONCAT(p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS profesor_apellidos,
                a.id AS alumno_encargado_id, a.nombres AS alumno_nombres, CONCAT(a.apellido_paterno, ' ', IFNULL(a.apellido_materno, '')) AS alumno_apellidos
            FROM clubes c
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
        `);
        const clubesTratados = rows.map(club => ({ ...club, cronograma: club.cronograma ? JSON.stringify(club.cronograma) : null }));
        res.status(200).json(clubesTratados);
    } catch (error) { res.status(500).json({ message: "Error interno" }); }
});

router.get('/user/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.*, 
                p.id AS profesor_encargado_id, p.nombres AS profesor_nombres, CONCAT(p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS profesor_apellidos,
                a.id AS alumno_encargado_id, a.nombres AS alumno_nombres, CONCAT(a.apellido_paterno, ' ', IFNULL(a.apellido_materno, '')) AS alumno_apellidos,
                i.estatus AS inscripcion_estatus, i.fecha_inscripcion, i.rol_en_club AS mi_rol_interno,
                (SELECT COUNT(*) FROM inscripciones WHERE club_id = c.id AND estatus = 'activo' AND rol_en_club != 'encargado_profesor') AS aceptados_count
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id AND i.usuario_id = ? 
            LEFT JOIN inscripciones ip ON c.id = ip.club_id AND ip.rol_en_club = 'encargado_profesor' AND ip.estatus = 'activo'
            LEFT JOIN usuarios p ON ip.usuario_id = p.id
            LEFT JOIN inscripciones ia ON c.id = ia.club_id AND ia.rol_en_club = 'encargado_alumno' AND ia.estatus = 'activo'
            LEFT JOIN usuarios a ON ia.usuario_id = a.id
        `, [userId]);

        const clubesTratados = rows.map(club => ({ ...club, cronograma: club.cronograma ? JSON.stringify(club.cronograma) : null }));
        res.status(200).json(clubesTratados);
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

// ==========================================
// --- CREACIÓN (NUEVO SISTEMA DE INVITACIONES) ---
// ==========================================

router.post('/', verifyToken, async (req, res) => {
    const { nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, profesor_encargado_id, alumno_encargado_id, miembros_ids } = req.body;
    const estatus = 'esperando_firmas'; 
    const fecha_creacion = new Date();

    // 👇 CORRECCIÓN: Ahora solo pedimos 19 alumnos en la lista (19 + 1 representante = 20) 👇
    if (!nombre || !profesor_encargado_id || !alumno_encargado_id || !miembros_ids || miembros_ids.length < 19) return res.status(400).json({ message: 'Faltan campos o alumnos.' });
    
    try {
        const [result] = await db.query(
            `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, fecha_creacion]
        );
        const newClubId = result.insertId;

        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [profesor_encargado_id, newClubId]);
        await db.query(`UPDATE usuarios SET role_id = 2 WHERE id = ? AND role_id != 1`, [profesor_encargado_id]);
        
        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'pendiente')`, [alumno_encargado_id, newClubId]);
        
        for (const miembroId of miembros_ids) {
            if (miembroId !== alumno_encargado_id) await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'miembro', 'pendiente')`, [miembroId, newClubId]);
        }
        res.status(201).json({ message: 'Club creado. Esperando confirmación.', clubId: newClubId });
    } catch (error) { res.status(500).json({ message: "Error interno." }); }
});

// ==========================================
// --- ACCIONES DE ADMINISTRADOR Y EDICIÓN ---
// ==========================================

router.put('/:id/aprobar', verifyToken, async (req, res) => {
    const { id } = req.params;
    const codigoGenerado = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.query(`UPDATE clubes SET estatus = 'activo', codigo_union = ?, motivo_rechazo = NULL WHERE id = ?`, [codigoGenerado, id]);
        res.status(200).json({ message: "Aprobado", codigo: codigoGenerado });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/rechazar', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;
    try {
        await db.query(`UPDATE clubes SET estatus = 'rechazado', motivo_rechazo = ? WHERE id = ?`, [motivo, id]);
        res.status(200).json({ message: "Rechazado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/pausar', verifyToken, async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'inactivo' WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: "Pausado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id/reactivar', verifyToken, async (req, res) => {
    try {
        await db.query(`UPDATE clubes SET estatus = 'activo' WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: "Reactivado" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [encargados] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno')`, [id]);
        await db.query('DELETE FROM clubes WHERE id = ?', [id]);
        
        const actualizarRolSiEsNecesario = async (usuarioId) => {
            if (!usuarioId) return;
            const [otrosClubes] = await db.query(`SELECT id FROM inscripciones WHERE usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo'`, [usuarioId]);
            if (otrosClubes.length === 0) await db.query('UPDATE usuarios SET role_id = 4 WHERE id = ? AND role_id != 1', [usuarioId]);
        };
        for (let encargado of encargados) await actualizarRolSiEsNecesario(encargado.usuario_id);
        res.status(200).json({ message: "Eliminado exitosamente" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    // 👇 AHORA RECIBIMOS TODOS LOS CAMPOS 👇
    const { nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, nuevo_profesor_id, nuevo_alumno_id } = req.body;
    try {
        await db.query(
            `UPDATE clubes SET nombre = ?, descripcion = ?, objetivo = ?, cronograma = ?, detalle_actividades = ?, espacios_tiempos = ?, impacto = ?, estatus = 'en_revision', motivo_rechazo = NULL WHERE id = ?`, 
            [nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, id]
        );
        
        const [profesoresActuales] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_profesor'`, [id]);
        const [alumnosActuales] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'encargado_alumno'`, [id]);
        
        const viejo_profesor_id = profesoresActuales.length > 0 ? profesoresActuales[0].usuario_id : null;
        const viejo_alumno_id = alumnosActuales.length > 0 ? alumnosActuales[0].usuario_id : null;

        if (viejo_profesor_id && viejo_profesor_id !== nuevo_profesor_id) await db.query(`UPDATE inscripciones SET rol_en_club = 'miembro' WHERE club_id = ? AND usuario_id = ?`, [id, viejo_profesor_id]);
        if (viejo_alumno_id && viejo_alumno_id !== nuevo_alumno_id) await db.query(`UPDATE inscripciones SET rol_en_club = 'miembro' WHERE club_id = ? AND usuario_id = ?`, [id, viejo_alumno_id]);

        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_profesor', estatus = 'activo'`, [nuevo_profesor_id, id]);
        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_alumno', estatus = 'activo'`, [nuevo_alumno_id, id]);

        await db.query(`UPDATE usuarios SET role_id = 2 WHERE id = ? AND role_id != 1`, [nuevo_profesor_id]);
        await db.query(`UPDATE usuarios SET role_id = 3 WHERE id = ? AND role_id != 1`, [nuevo_alumno_id]);

        res.status(200).json({ message: "Editado correctamente" });
    } catch (error) { res.status(500).json({ message: "Error interno al editar" }); }
});

router.post('/unirse', verifyToken, async (req, res) => {
    const { codigo } = req.body;
    const usuarioId = req.user.id;
    if (!codigo) return res.status(400).json({ message: "Código obligatorio" });
    try {
        const [clubes] = await db.query('SELECT id FROM clubes WHERE codigo_union = ? AND estatus = "activo"', [codigo]);
        if (clubes.length === 0) return res.status(404).json({ message: "Código inválido o club inactivo" });
        await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'miembro', 'activo') ON DUPLICATE KEY UPDATE estatus = 'activo'`, [usuarioId, clubes[0].id]);
        res.status(200).json({ message: "¡Te has unido!" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

module.exports = router;