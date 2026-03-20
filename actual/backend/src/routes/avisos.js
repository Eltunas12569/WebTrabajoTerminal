const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/', async (req, res) => {
    try {
        // Traemos solo los activos. La fecha la filtramos en React
        const [rows] = await db.query('SELECT * FROM avisos_globales WHERE activo = 1');
        res.status(200).json(rows);
    } catch (error) {
        console.error("DB Error:", error.message);
        res.status(500).json({ message: "Error de conexión" });
    }
});

// NUEVA RUTA: Avisos combinados para un usuario (Globales + Clubs inscritos)
router.get('/user/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    try {
        // 1. Avisos globales
        const [globales] = await db.query(`
            SELECT id, titulo, mensaje AS descripcion, prioridad, fecha_creacion AS tiempo, 'global' AS tipo 
            FROM avisos_globales 
            WHERE activo = 1
        `);

        // 2. Avisos de los clubes del usuario
        const [clubes] = await db.query(`
            SELECT ac.id, CONCAT('Aviso de ', c.nombre) AS titulo, ac.contenido AS descripcion, 'normal' AS prioridad, ac.fecha_envio AS tiempo, 'club' AS tipo
            FROM avisos_club ac
            JOIN clubes c ON ac.club_id = c.id
            JOIN inscripciones i ON c.id = i.club_id
            WHERE ac.activo = 1 AND i.usuario_id = ? AND i.estatus = 'activo'
        `, [userId]);

        // 3. Unir y ordenar por fecha (más recientes primero)
        const todos = [...globales, ...clubes].sort((a, b) => new Date(b.tiempo) - new Date(a.tiempo));

        res.status(200).json(todos);
    } catch (error) {
        console.error("Error al obtener avisos mixtos:", error.message);
        res.status(500).json({ message: "Error al cargar los avisos" });
    }
});

module.exports = router;