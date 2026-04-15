const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/', async (req, res) => {
    try {
        // 1. Apagar (poner en 0) los avisos vencidos.
        // MAGIA AQUÍ: Si fecha_vencimiento es NULL, revisa si ya pasaron 7 días desde su creación y lo apaga.
        await db.query(`
            UPDATE avisos_globales 
            SET activo = 0 
            WHERE fecha_vencimiento < NOW() 
               OR (fecha_vencimiento IS NULL AND fecha_creacion < DATE_SUB(NOW(), INTERVAL 7 DAY))
        `);

        // 2. Encender (poner en 1) los avisos que aún son vigentes o tienen menos de 7 días si son NULL
        await db.query(`
            UPDATE avisos_globales 
            SET activo = 1 
            WHERE fecha_vencimiento >= NOW() 
               OR (fecha_vencimiento IS NULL AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 7 DAY))
        `);

        // 3. Traer solo los activos, ya limpios
        const [rows] = await db.query('SELECT * FROM avisos_globales WHERE activo = 1');
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("DB Error:", error.message);
        res.status(500).json({ message: "Error interno del servidor al procesar los avisos" });
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

// NUEVA RUTA: Para que el admin vea TODOS los avisos (globales y de club)
router.get('/all-for-admin', verifyToken, async (req, res) => {
    try {
        // Verificación infalible: Consultamos el rol directamente en la BD
        // usando el ID del usuario validado por el token.
        const [users] = await db.query('SELECT role_id FROM usuarios WHERE id = ?', [req.user.id]);
        
        if (!users.length || Number(users[0].role_id) !== 1) {
            return res.status(403).json({ message: 'Acceso denegado. Solo para administradores.' });
        }

        // 1. Todos los avisos globales (activos e inactivos)
        const [globales] = await db.query(`
            SELECT 
                id, titulo, mensaje, prioridad, activo, 
                fecha_creacion, fecha_vencimiento, 'global' as tipo
            FROM avisos_globales
        `);

        // 2. Todos los avisos de club
        const [clubes] = await db.query(`
            SELECT 
                ac.id, c.nombre as nombre_club, ac.contenido as mensaje, 
                ac.activo, ac.fecha_envio, 'club' as tipo
            FROM avisos_club ac
            JOIN clubes c ON ac.club_id = c.id
        `);

        // 3. Unir y ordenar por fecha (más recientes primero)
        const todos = [...globales, ...clubes].sort((a, b) => new Date(b.fecha_creacion || b.fecha_envio) - new Date(a.fecha_creacion || a.fecha_envio));

        res.status(200).json(todos);
    } catch (error) {
        console.error("Error al obtener todos los avisos para admin:", error.message);
        res.status(500).json({ message: "Error al cargar todos los avisos" });
    }
});

module.exports = router;