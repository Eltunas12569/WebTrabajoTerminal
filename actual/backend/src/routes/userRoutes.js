const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware'); 
const checkRole = require('../middlewares/roleAuth');
const ROLES = require('../config/roles');

router.get('/professors', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [profesores] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos
            FROM usuarios WHERE role_id = ?
        `, [ROLES.PROFESOR]);
        res.status(200).json(profesores);
    } catch (error) { res.status(500).json({ message: "Error al obtener profesores" }); }
});

router.get('/students-in-charge', verificarToken, requireVerificado, async (req, res) => {
    try {

        const [alumnos] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos, boleta
            FROM usuarios WHERE role_id IN (?, ?)
        `, [ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE]);
        res.status(200).json(alumnos);
    } catch (error) { res.status(500).json({ message: "Error al obtener alumnos" }); }
});

router.get('/all-for-admin', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {

        const [usuarios] = await db.query(`
            SELECT id, nombres, apellido_paterno, apellido_materno, correo, role_id, verificado, 
                   acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, 
                   boleta, carrera, num_empleado
            FROM usuarios
            WHERE id <> ? AND eliminado = 0
            ORDER BY nombres ASC, apellido_paterno ASC
        `, [req.user.id]);
        res.status(200).json(usuarios);
    } catch (error) { res.status(500).json({ message: 'Error al obtener los usuarios' }); }
});

router.get('/:id/admin-edit', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT id, nombres, apellido_paterno, apellido_materno, correo, role_id, boleta, carrera, num_empleado
            FROM usuarios 
            WHERE id = ? AND role_id <> ? AND eliminado = 0
        `, [req.params.id, ROLES.ADMINISTRADOR]);

        if (usuarios.length === 0) return res.status(404).json({ message: 'Usuario no encontrado o no editable.' });
        res.status(200).json(usuarios[0]);
    } catch (error) { res.status(500).json({ message: 'Error al cargar el usuario' }); }
});

router.put('/:id/admin-edit', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    const idUsuario = Number(req.params.id);
    const { nombres, apellido_paterno, apellido_materno, correo, boleta, carrera, num_empleado } = req.body;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ message: 'Identificador de usuario inválido.' });
    if (!nombres?.trim() || !apellido_paterno?.trim() || !correo?.trim()) return res.status(400).json({ message: 'Nombres, apellido paterno y correo son obligatorios.' });

    const correoLimpio = correo.trim().toLowerCase();
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        const [usuarios] = await conexion.query('SELECT role_id FROM usuarios WHERE id = ? AND eliminado = 0 FOR UPDATE', [idUsuario]);
        if (usuarios.length === 0 || Number(usuarios[0].role_id) === ROLES.ADMINISTRADOR) {
            await conexion.rollback();
            return res.status(403).json({ message: 'No está permitido modificar administradores.' });
        }

        const [correoExistente] = await conexion.query('SELECT id FROM usuarios WHERE correo = ? AND id <> ? LIMIT 1', [correoLimpio, idUsuario]);
        if (correoExistente.length > 0) {
            await conexion.rollback();
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        const rolObjetivo = Number(usuarios[0].role_id);
        
        if ([ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE].includes(rolObjetivo)) {
            if (!boleta?.trim() || !carrera?.trim()) {
                await conexion.rollback();
                return res.status(400).json({ message: 'La boleta y la carrera son obligatorias para alumnos.' });
            }
            await conexion.query(
                `UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ?, correo = ?, boleta = ?, carrera = ? WHERE id = ?`,
                [nombres.trim(), apellido_paterno.trim(), apellido_materno?.trim() || null, correoLimpio, boleta.trim(), carrera.trim(), idUsuario]
            );
        } else if (rolObjetivo === ROLES.PROFESOR) {
            if (!num_empleado?.trim()) {
                await conexion.rollback();
                return res.status(400).json({ message: 'El número de empleado es obligatorio para profesores.' });
            }
            await conexion.query(
                `UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ?, correo = ?, num_empleado = ? WHERE id = ?`,
                [nombres.trim(), apellido_paterno.trim(), apellido_materno?.trim() || null, correoLimpio, num_empleado.trim(), idUsuario]
            );
        }

        await conexion.commit();
        res.status(200).json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        await conexion.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'La boleta o el número de empleado ya está registrado.' });
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    } finally {
        conexion.release();
    }
});

router.get('/', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR]), async (req, res) => {
    const { busqueda } = req.query;
    if (!busqueda || busqueda.trim().length < 2) return res.status(400).json({ message: "Escribe al menos 2 caracteres para buscar." });
    const terminoBusqueda = `%${busqueda.trim()}%`;

    try {
        const [usuarios] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos, boleta, num_empleado, role_id
            FROM usuarios
            WHERE CONCAT(nombres, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) LIKE ? 
               OR boleta LIKE ? 
               OR num_empleado LIKE ?
            LIMIT 20
        `, [terminoBusqueda, terminoBusqueda, terminoBusqueda]);
        res.status(200).json(usuarios);
    } catch (error) { 
        console.error("Error en búsqueda:", error);
        res.status(500).json({ message: "Error en búsqueda" }); 
    }
});

module.exports = router;