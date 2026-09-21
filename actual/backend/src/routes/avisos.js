const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middlewares/authMiddleware');
const requireVerificado = require('../middlewares/verificarCuentaMiddleware'); 

router.get('/', async (req, res) => {
    try {
        await db.query(`
            UPDATE avisos 
            SET activo = 0 
            WHERE club_id IS NULL 
              AND (fecha_vencimiento < NOW() OR (fecha_vencimiento IS NULL AND fecha_envio < DATE_SUB(NOW(), INTERVAL 7 DAY)))
        `);

        await db.query(`
            UPDATE avisos 
            SET activo = 1 
            WHERE club_id IS NULL 
              AND (fecha_vencimiento >= NOW() OR (fecha_vencimiento IS NULL AND fecha_envio >= DATE_SUB(NOW(), INTERVAL 7 DAY)))
        `);

        const [rows] = await db.query(`
            SELECT id, titulo, contenido AS descripcion, prioridad, fecha_envio AS tiempo, 'global' AS tipo 
            FROM avisos 
            WHERE activo = 1 AND club_id IS NULL
            ORDER BY fecha_envio DESC
        `);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("DB Error:", error.message);
        res.status(500).json({ message: "Error interno del servidor al procesar los avisos" });
    }
});

router.get('/user/:userId', verifyToken, requireVerificado, async (req, res) => {
    const { userId } = req.params;
    try {
        const [globales] = await db.query(`
            SELECT id, titulo, contenido AS mensaje, prioridad, fecha_envio, 'global' AS tipo 
            FROM avisos 
            WHERE activo = 1 AND club_id IS NULL
        `);

        const [clubes] = await db.query(`
            SELECT a.id, CONCAT('Aviso de ', c.nombre) AS titulo, a.contenido AS mensaje, 'normal' AS prioridad, a.fecha_envio, 'club' AS tipo
            FROM avisos a
            JOIN clubes c ON a.club_id = c.id
            JOIN inscripciones i ON c.id = i.club_id
            WHERE a.activo = 1 AND a.club_id IS NOT NULL AND i.usuario_id = ? AND i.estatus = 'activo'
        `, [userId]);

        const todos = [...globales, ...clubes].sort((a, b) => new Date(b.fecha_envio) - new Date(a.fecha_envio));
        res.status(200).json(todos);
    } catch (error) {
        console.error("Error al cargar los avisos:", error.message);
        res.status(500).json({ message: "Error al cargar los avisos" });
    }
});

// NUEVA RUTA: Para que el admin vea TODOS los avisos (globales y de club)
router.get('/all-for-admin', verifyToken, requireVerificado, async (req, res) => {
    try {
        const [users] = await db.query('SELECT role_id FROM usuarios WHERE id = ?', [req.user.id]);
        
        if (!users.length || Number(users[0].role_id) !== 1) {
            return res.status(403).json({ message: 'Acceso denegado. Solo para administradores.' });
        }

        const [globales] = await db.query(`
            SELECT 
                id, titulo, contenido AS mensaje, prioridad, activo, 
                fecha_envio, fecha_vencimiento, 'global' AS tipo
            FROM avisos
            WHERE club_id IS NULL
        `);

        const [clubes] = await db.query(`
            SELECT 
                a.id, c.nombre AS nombre_club, a.contenido AS mensaje, 
                a.activo, a.fecha_envio, 'club' AS tipo
            FROM avisos a
            JOIN clubes c ON a.club_id = c.id
            WHERE a.club_id IS NOT NULL
        `);

        const todos = [...globales, ...clubes].sort((a, b) => new Date(b.fecha_envio) - new Date(a.fecha_envio));

        res.status(200).json(todos);
    } catch (error) {
        console.error("Error al obtener todos los avisos para admin:", error.message);
        res.status(500).json({ message: "Error al cargar todos los avisos" });
    }
});

router.delete('/:tipo/:id', verifyToken, requireVerificado, async (req, res) => {
    const { tipo, id } = req.params;

    if (!/^\d+$/.test(id)) return res.status(400).json({ message: 'Identificador de aviso inválido.' });

    try {
        const [usuarios] = await db.query('SELECT role_id FROM usuarios WHERE id = ?', [req.user.id]);
        if (!usuarios.length || Number(usuarios[0].role_id) !== 1) {
            return res.status(403).json({ message: 'Acceso denegado. Solo para administradores.' });
        }

        const [resultado] = await db.query(`DELETE FROM avisos WHERE id = ?`, [Number(id)]);
        if (resultado.affectedRows === 0) return res.status(404).json({ message: 'El aviso no existe o ya fue eliminado.' });

        res.status(200).json({ message: 'Aviso eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'No se pudo eliminar el aviso.' });
    }
});

module.exports = router;