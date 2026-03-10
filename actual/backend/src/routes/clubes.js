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

// Ruta para crear un nuevo club
// Protegida por el middleware de autenticación
router.post('/', verifyToken, async (req, res) => {
    const { nombre, descripcion, profesor_encargado_id, alumno_encargado_id } = req.body;
    const estatus = 'en_revision'; // El estatus por defecto al crear un club
    const fecha_creacion = new Date(); // Fecha y hora actual

    // Validaciones básicas
    if (!nombre || !descripcion || !profesor_encargado_id || !alumno_encargado_id) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios: nombre, descripción, profesor_encargado_id, alumno_encargado_id.' });
    }
    
    try {
        const [result] = await db.query(
            `INSERT INTO clubes (nombre, descripcion, profesor_encargado_id, alumno_encargado_id, estatus, fecha_creacion)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, profesor_encargado_id, alumno_encargado_id, estatus, fecha_creacion]
        );

        res.status(201).json({
            message: 'Club creado exitosamente y en estado pendiente de aprobación.',
            clubId: result.insertId,
            estatus: estatus
        });

        // Registrar al profesor encargado en la tabla de inscripciones
        await db.query(
            `INSERT INTO inscripciones (usuario_id, club_id, estatus)
             VALUES (?, ?, ?)`,
            [profesor_encargado_id, result.insertId, 'activo'] // Estatus 'activo' por defecto para encargados
        );
        console.log(`Profesor ${profesor_encargado_id} inscrito en el club ${result.insertId}.`);

        // Registrar al alumno encargado en la tabla de inscripciones
        await db.query(
            `INSERT INTO inscripciones (usuario_id, club_id, estatus)
             VALUES (?, ?, ?)`,
            [alumno_encargado_id, result.insertId, 'activo'] // Estatus 'activo' por defecto para encargados
        );
        console.log(`Alumno ${alumno_encargado_id} inscrito en el club ${result.insertId}.`);

    } catch (error) {
        console.error("Error al crear el club:", error);
        res.status(500).json({
            message: "Error interno del servidor al crear el club."
        });
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