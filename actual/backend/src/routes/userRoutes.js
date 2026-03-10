const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middlewares/authMiddleware'); // Asegúrate de que la ruta sea correcta

// Endpoint para obtener profesores (usuarios con role_id = 2)
// Protegido por el middleware de autenticación
router.get('/professors', verifyToken, async (req, res) => {
    try {
        const [profesores] = await db.query(`
            SELECT id, nombres, apellidos, boleta
            FROM usuarios
            WHERE role_id = 2;
        `);
        res.status(200).json(profesores);
    } catch (error) {
        console.error("Error al obtener profesores:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener profesores." });
    }
});

// Endpoint para obtener alumnos encargados y alumnos (usuarios con role_id = 3 o 4)
// Protegido por el middleware de autenticación
router.get('/students-in-charge', verifyToken, async (req, res) => {
    try {
        const [alumnos] = await db.query(`
            SELECT id, nombres, apellidos, boleta
            FROM usuarios
            WHERE role_id IN (3, 4);
        `);
        res.status(200).json(alumnos);
    } catch (error) {
        console.error("Error al obtener alumnos encargados:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener alumnos encargados." });
    }
});

module.exports = router;