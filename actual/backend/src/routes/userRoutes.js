const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware'); // NUEVO
const checkRole = require('../middlewares/roleAuth');
const ROLES = require('../config/roles');

// Obtener profesores
router.get('/professors', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [profesores] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos
            FROM usuarios WHERE role_id = ?
        `, [ROLES.PROFESOR]);
        res.status(200).json(profesores);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener profesores" });
    }
});

// Obtener alumnos para encargados
router.get('/students-in-charge', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [alumnos] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos,
            (SELECT boleta FROM alumnos_detalles WHERE usuario_id = usuarios.id) as boleta
            FROM usuarios WHERE role_id IN (?, ?)
        `, [ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE]);
        res.status(200).json(alumnos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener alumnos" });
    }
});

// Listado completo para administración, excluyendo al administrador actual.
router.get('/all-for-admin', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT
                u.id,
                u.nombres,
                u.apellido_paterno,
                u.apellido_materno,
                u.correo,
                u.role_id,
                u.verificado,
                u.acepta_privacidad,
                u.version_aviso_privacidad,
                u.fecha_aceptacion_privacidad,
                a.boleta,
                a.carrera,
                p.num_empleado
            FROM usuarios u
            LEFT JOIN alumnos_detalles a ON a.usuario_id = u.id
            LEFT JOIN profesores_detalles p ON p.usuario_id = u.id
            WHERE u.id <> ? AND u.eliminado = 0
            ORDER BY u.nombres ASC, u.apellido_paterno ASC
        `, [req.user.id]);

        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios para administración:', error);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});

// Obtener los datos editables de un usuario no administrador.
router.get('/:id/admin-edit', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT
                u.id, u.nombres, u.apellido_paterno, u.apellido_materno,
                u.correo, u.role_id, a.boleta, a.carrera, p.num_empleado
            FROM usuarios u
            LEFT JOIN alumnos_detalles a ON a.usuario_id = u.id
            LEFT JOIN profesores_detalles p ON p.usuario_id = u.id
            WHERE u.id = ? AND u.role_id <> ? AND u.eliminado = 0
        `, [req.params.id, ROLES.ADMINISTRADOR]);

        if (usuarios.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o no editable.' });
        }

        res.status(200).json(usuarios[0]);
    } catch (error) {
        console.error('Error al cargar usuario editable:', error);
        res.status(500).json({ message: 'Error al cargar el usuario' });
    }
});

// Actualizar datos de un usuario no administrador. La autorización se valida aquí,
// en cada petición, aunque el frontend oculte los controles a otros roles.
router.put('/:id/admin-edit', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    const idUsuario = Number(req.params.id);
    const { nombres, apellido_paterno, apellido_materno, correo, boleta, carrera, num_empleado } = req.body;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({ message: 'Identificador de usuario inválido.' });
    }
    if (!nombres?.trim() || !apellido_paterno?.trim() || !correo?.trim()) {
        return res.status(400).json({ message: 'Nombres, apellido paterno y correo son obligatorios.' });
    }
    if (nombres.trim().length > 100 || apellido_paterno.trim().length > 100 || (apellido_materno?.trim().length || 0) > 100) {
        return res.status(400).json({ message: 'Los nombres o apellidos exceden la longitud permitida.' });
    }

    const correoLimpio = correo.trim().toLowerCase();
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        const [usuarios] = await conexion.query(
            'SELECT role_id FROM usuarios WHERE id = ? AND eliminado = 0 FOR UPDATE',
            [idUsuario]
        );
        if (usuarios.length === 0 || Number(usuarios[0].role_id) === ROLES.ADMINISTRADOR) {
            await conexion.rollback();
            return res.status(403).json({ message: 'No está permitido modificar administradores.' });
        }

        const [correoExistente] = await conexion.query(
            'SELECT id FROM usuarios WHERE correo = ? AND id <> ? LIMIT 1',
            [correoLimpio, idUsuario]
        );
        if (correoExistente.length > 0) {
            await conexion.rollback();
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        await conexion.query(
            `UPDATE usuarios
             SET nombres = ?, apellido_paterno = ?, apellido_materno = ?, correo = ?
             WHERE id = ? AND role_id <> ?`,
            [nombres.trim(), apellido_paterno.trim(), apellido_materno?.trim() || null, correoLimpio, idUsuario, ROLES.ADMINISTRADOR]
        );

        const rolObjetivo = Number(usuarios[0].role_id);
        if ([ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE].includes(rolObjetivo)) {
            if (!boleta?.trim() || !carrera?.trim()) {
                await conexion.rollback();
                return res.status(400).json({ message: 'La boleta y la carrera son obligatorias para alumnos.' });
            }
            await conexion.query(
                'UPDATE alumnos_detalles SET boleta = ?, carrera = ? WHERE usuario_id = ?',
                [boleta.trim(), carrera.trim(), idUsuario]
            );
        } else if (rolObjetivo === ROLES.PROFESOR) {
            if (!num_empleado?.trim()) {
                await conexion.rollback();
                return res.status(400).json({ message: 'El número de empleado es obligatorio para profesores.' });
            }
            await conexion.query(
                'UPDATE profesores_detalles SET num_empleado = ? WHERE usuario_id = ?',
                [num_empleado.trim(), idUsuario]
            );
        }

        await conexion.commit();
        res.status(200).json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        await conexion.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'La boleta o el número de empleado ya está registrado.' });
        }
        console.error('Error al actualizar usuario desde administración:', error);
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    } finally {
        conexion.release();
    }
});

// --- BUSCADOR UNIVERSAL (asegurado) ---
// Restringido a Administrador y Profesor, según tu confirmación.
// Requiere término de búsqueda (evita el dump completo de la tabla) y limita a 20 resultados.
router.get('/', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR]), async (req, res) => {
    const { busqueda } = req.query;

    if (!busqueda || busqueda.trim().length < 2) {
        return res.status(400).json({ message: "Escribe al menos 2 caracteres para buscar." });
    }

    const terminoBusqueda = `%${busqueda.trim()}%`;

    try {
        const [usuarios] = await db.query(`
            SELECT
                u.id,
                u.nombres,
                CONCAT(u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) AS apellidos,
                a.boleta,
                p.num_empleado,
                u.role_id
            FROM usuarios u
            LEFT JOIN alumnos_detalles a ON u.id = a.usuario_id
            LEFT JOIN profesores_detalles p ON u.id = p.usuario_id
            WHERE u.nombres LIKE ?
               OR u.apellido_paterno LIKE ?
               OR u.apellido_materno LIKE ?
               OR a.boleta LIKE ?
               OR p.num_empleado LIKE ?
            LIMIT 20
        `, [terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda]);
        res.status(200).json(usuarios);
    } catch (error) {
        res.status(500).json({ message: "Error en búsqueda" });
    }
});

module.exports = router;