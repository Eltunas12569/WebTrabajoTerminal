const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Tu conexión que ya usa .env
const verifyToken = require('../middlewares/authMiddleware'); // Importa el middleware de autenticación

// Obtener todos los clubes de la base de datos sistema_tt
router.get('/', async (req, res) => {
    try {
        // Ejecutamos la consulta asegurando los nombres de tu script SQL
        const [rows] = await db.query(`
            SELECT 
                c.id, 
                nombre, 
                descripcion, 
                estatus,
                fecha_creacion,
                profesor_encargado_id,
                alumno_encargado_id,
                p.nombres AS profesor_nombres,
                p.apellidos AS profesor_apellidos,
                a.nombres AS alumno_nombres,
                a.apellidos AS alumno_apellidos
            FROM clubes c
            LEFT JOIN usuarios p ON c.profesor_encargado_id = p.id
            LEFT JOIN usuarios a ON c.alumno_encargado_id = a.id
        `);
        
        // Enviamos la respuesta al frontend en formato JSON
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener clubes:", error);
        res.status(500).json({ 
            message: "Error interno del servidor al consultar la base de datos" 
        });
    }
});


router.post('/', verifyToken, async (req, res) => {
    const { nombre, descripcion, profesor_encargado_id, alumno_encargado_id } = req.body;
    const estatus = 'en_revision'; 
    const fecha_creacion = new Date();

    if (!nombre || !descripcion || !profesor_encargado_id || !alumno_encargado_id) {
        return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }
    
    try {
        // 1. Crear el club
        const [result] = await db.query(
            `INSERT INTO clubes (nombre, descripcion, profesor_encargado_id, alumno_encargado_id, estatus, fecha_creacion)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, profesor_encargado_id, alumno_encargado_id, estatus, fecha_creacion]
        );

        const newClubId = result.insertId;

        // 2. Inscribir al Profesor
        await db.query(
            `INSERT INTO inscripciones (usuario_id, club_id, estatus) VALUES (?, ?, ?)`,
            [profesor_encargado_id, newClubId, 'activo']
        );

        // 3. Inscribir al Alumno (SOLO si es una persona distinta al profesor)
        if (profesor_encargado_id !== alumno_encargado_id) {
            await db.query(
                `INSERT INTO inscripciones (usuario_id, club_id, estatus) VALUES (?, ?, ?)`,
                [alumno_encargado_id, newClubId, 'activo']
            );
        }

        // 4. Enviar respuesta final solo después de completar todo
        res.status(201).json({
            message: 'Club creado exitosamente.',
            clubId: newClubId
        });

    } catch (error) {
        console.error("Error al crear el club:", error);
        // Evitamos enviar doble respuesta si ya se envió arriba
        if (!res.headersSent) {
            res.status(500).json({ message: "Error interno", error: error.message });
        }
    }
});

// Obtener clubes a los que un usuario está inscrito
router.get('/user/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT
                c.id,
                c.nombre,
                c.descripcion,
                c.estatus,
                c.fecha_creacion,
                c.profesor_encargado_id,
                c.alumno_encargado_id,
                p.nombres AS profesor_nombres,
                p.apellidos AS profesor_apellidos,
                a.nombres AS alumno_nombres,
                a.apellidos AS alumno_apellidos,
                i.estatus AS inscripcion_estatus,
                i.fecha_inscripcion
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id
            LEFT JOIN usuarios p ON c.profesor_encargado_id = p.id
            LEFT JOIN usuarios a ON c.alumno_encargado_id = a.id
            WHERE i.usuario_id = ? AND i.estatus = 'activo';
        `, [userId]);

        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener los clubes del usuario:", error);
        res.status(500).json({
            message: "Error interno del servidor al consultar los clubes del usuario."
        });
    }
});
module.exports = router;