const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware');
const checkRole = require('../middlewares/roleAuth');
const ROLES = require('../config/roles');
const AES_KEY = process.env.AES_KEY;

router.get('/professors', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [profesores] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombres, ?) AS CHAR) AS nombres, 
                   CONCAT(CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR), ' ', IFNULL(CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR), '')) AS apellidos
            FROM usuarios WHERE role_id = ?
        `, [AES_KEY, AES_KEY, AES_KEY, ROLES.PROFESOR]);
    } catch (error) { res.status(500).json({ message: "Error al obtener profesores" }); }
});

router.get('/students-in-charge', verificarToken, requireVerificado, async (req, res) => {
    try {
        const [alumnos] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombres, ?) AS CHAR) AS nombres, 
                   CONCAT(CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR), ' ', IFNULL(CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR), '')) AS apellidos, 
                   CAST(AES_DECRYPT(boleta, ?) AS CHAR) AS boleta
            FROM usuarios WHERE role_id IN (?, ?)
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, ROLES.ALUMNO, ROLES.ALUMNO_REPRESENTANTE]);
        res.status(200).json(alumnos);
    } catch (error) { res.status(500).json({ message: "Error al obtener alumnos" }); }
});


router.get('/all-for-admin', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombres, ?) AS CHAR) AS nombres, 
                   CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR) AS apellido_paterno, 
                   CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR) AS apellido_materno, 
                   correo, role_id, verificado, 
                   acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, 
                   CAST(AES_DECRYPT(boleta, ?) AS CHAR) AS boleta, 
                   carrera, 
                   CAST(AES_DECRYPT(num_empleado, ?) AS CHAR) AS num_empleado, 
                   CAST(AES_DECRYPT(nss, ?) AS CHAR) AS nss
            FROM usuarios
            WHERE id <> ?
            ORDER BY CAST(AES_DECRYPT(nombres, ?) AS CHAR) ASC, CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR) ASC
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, req.user.id, AES_KEY, AES_KEY]);
        res.status(200).json(usuarios);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});

router.get('/:id/admin-edit', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombres, ?) AS CHAR) AS nombres, 
                   CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR) AS apellido_paterno, 
                   CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR) AS apellido_materno, 
                   correo, role_id, 
                   CAST(AES_DECRYPT(boleta, ?) AS CHAR) AS boleta, 
                   carrera, 
                   CAST(AES_DECRYPT(num_empleado, ?) AS CHAR) AS num_empleado, 
                   CAST(AES_DECRYPT(nss, ?) AS CHAR) AS nss
            FROM usuarios 
            WHERE id = ? AND role_id <> ?
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, req.params.id, ROLES.ADMINISTRADOR]);

        if (usuarios.length === 0) return res.status(404).json({ message: 'Usuario no encontrado o no editable.' });
        res.status(200).json(usuarios[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar el usuario' });
    }
});


router.put('/:id/admin-edit', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    const idUsuario = Number(req.params.id);
    const { nombres, apellido_paterno, apellido_materno, correo, boleta, carrera, num_empleado, nss } = req.body;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ message: 'Identificador de usuario inválido.' });
    if (!nombres?.trim() || !apellido_paterno?.trim() || !correo?.trim()) return res.status(400).json({ message: 'Nombres, apellido paterno y correo son obligatorios.' });

    const correoLimpio = correo.trim().toLowerCase();
    const conexion = await db.getConnection();

    try {
        await conexion.beginTransaction();

        const [usuarios] = await conexion.query('SELECT role_id FROM usuarios WHERE id = ? FOR UPDATE', [idUsuario]);
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
                `UPDATE usuarios SET 
                    nombres = AES_ENCRYPT(?, ?), 
                    apellido_paterno = AES_ENCRYPT(?, ?), 
                    apellido_materno = AES_ENCRYPT(?, ?), 
                    correo = ?, 
                    boleta = AES_ENCRYPT(?, ?), 
                    carrera = ?, 
                    nss = AES_ENCRYPT(?, ?) 
                WHERE id = ?`,
                [
                    nombres.trim(), AES_KEY,
                    apellido_paterno.trim(), AES_KEY,
                    apellido_materno?.trim() || null, AES_KEY,
                    correoLimpio,
                    boleta.trim(), AES_KEY,
                    carrera.trim(),
                    nss?.trim() || null, AES_KEY,
                    idUsuario
                ]
            );
        } else if (rolObjetivo === ROLES.PROFESOR) {
            if (!num_empleado?.trim()) {
                await conexion.rollback();
                return res.status(400).json({ message: 'El número de empleado es obligatorio para profesores.' });
            }
            await conexion.query(
                `UPDATE usuarios SET 
                    nombres = AES_ENCRYPT(?, ?), 
                    apellido_paterno = AES_ENCRYPT(?, ?), 
                    apellido_materno = AES_ENCRYPT(?, ?), 
                    correo = ?, 
                    num_empleado = AES_ENCRYPT(?, ?), 
                    carrera = ? 
                WHERE id = ?`,
                [
                    nombres.trim(), AES_KEY,
                    apellido_paterno.trim(), AES_KEY,
                    apellido_materno?.trim() || null, AES_KEY,
                    correoLimpio,
                    num_empleado.trim(), AES_KEY,
                    carrera?.trim() || null,
                    idUsuario
                ]
            );
        }

        await conexion.commit();
        res.status(200).json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        await conexion.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'La boleta, NSS o número de empleado ya está registrado.' });
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    } finally {
        conexion.release();
    }
});


router.delete('/:id/admin-delete', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR]), async (req, res) => {
    const idUsuario = Number(req.params.id);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({ message: 'Identificador de usuario inválido.' });
    }

    try {
        const [resultado] = await db.query('DELETE FROM usuarios WHERE id = ? AND role_id <> ?', [idUsuario, ROLES.ADMINISTRADOR]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o no se puede eliminar a otro administrador.' });
        }

        res.status(200).json({ message: 'Usuario eliminado permanentemente del sistema.' });
    } catch (error) {
        console.error("Error en borrado definitivo:", error);
        res.status(500).json({ message: 'Error interno al intentar eliminar al usuario.' });
    }
});

router.get('/', verificarToken, requireVerificado, checkRole([ROLES.ADMINISTRADOR, ROLES.PROFESOR, ROLES.ALUMNO_REPRESENTANTE, ROLES.ALUMNO]), async (req, res) => {
    const { busqueda } = req.query;
    if (!busqueda || busqueda.trim().length < 2) return res.status(400).json({ message: "Escribe al menos 2 caracteres para buscar." });
    const terminoBusqueda = `%${busqueda.trim()}%`;

    try {
        const [usuarios] = await db.query(`
            SELECT id, 
                   CAST(AES_DECRYPT(nombres, ?) AS CHAR) AS nombres, 
                   CONCAT(CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR), ' ', IFNULL(CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR), '')) AS apellidos, 
                   CAST(AES_DECRYPT(boleta, ?) AS CHAR) AS boleta, 
                   CAST(AES_DECRYPT(num_empleado, ?) AS CHAR) AS num_empleado, 
                   role_id
            FROM usuarios
            WHERE CONCAT(CAST(AES_DECRYPT(nombres, ?) AS CHAR), ' ', CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR), ' ', IFNULL(CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR), '')) LIKE ? 
               OR CAST(AES_DECRYPT(boleta, ?) AS CHAR) LIKE ? 
               OR CAST(AES_DECRYPT(num_empleado, ?) AS CHAR) LIKE ?
            LIMIT 20
        `, [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, terminoBusqueda, AES_KEY, terminoBusqueda, AES_KEY, terminoBusqueda]);
        res.status(200).json(usuarios);
    } catch (error) {
        console.error("Error en búsqueda:", error);
        res.status(500).json({ message: "Error en búsqueda" });
    }
});

module.exports = router;