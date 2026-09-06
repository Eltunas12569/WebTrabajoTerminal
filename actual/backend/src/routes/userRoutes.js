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