const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middlewares/authMiddleware');

// Obtener profesores
router.get('/professors', verifyToken, async (req, res) => {
    try {
        const [profesores] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos 
            FROM usuarios WHERE role_id = 3
        `);
        res.status(200).json(profesores);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener profesores" });
    }
});

// Obtener alumnos para encargados
router.get('/students-in-charge', verifyToken, async (req, res) => {
    try {
        const [alumnos] = await db.query(`
            SELECT id, nombres, CONCAT(apellido_paterno, ' ', IFNULL(apellido_materno, '')) AS apellidos, 
            (SELECT boleta FROM alumnos_detalles WHERE usuario_id = usuarios.id) as boleta
            FROM usuarios WHERE role_id IN (2, 4)
        `);
        res.status(200).json(alumnos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener alumnos" });
    }
});

// Buscador universal (CORREGIDO)
router.get('/', verifyToken, async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT 
                u.id, 
                u.nombres, 
                CONCAT(u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) AS apellidos, 
                a.boleta, 
                p.num_empleado, 
                u.role_id   /* ⬅️ CORRECCIÓN: Quitamos el "AS rol". Ahora se llama role_id */
            FROM usuarios u
            LEFT JOIN alumnos_detalles a ON u.id = a.usuario_id
            LEFT JOIN profesores_detalles p ON u.id = p.usuario_id
        `);
        res.status(200).json(usuarios);
    } catch (error) {
        res.status(500).json({ message: "Error en búsqueda" });
    }
});

module.exports = router;