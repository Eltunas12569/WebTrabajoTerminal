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
                c.nombre, 
                c.descripcion, 
                c.estatus,
                c.fecha_creacion,
                p_insc.usuario_id AS profesor_encargado_id,
                a_insc.usuario_id AS alumno_encargado_id,
                p.nombres AS profesor_nombres,
                p.apellidos AS profesor_apellidos,
                a.nombres AS alumno_nombres,
                a.apellidos AS alumno_apellidos
            FROM clubes c
            LEFT JOIN inscripciones p_insc ON c.id = p_insc.club_id AND p_insc.rol_en_club = 'encargado_profesor'
            LEFT JOIN usuarios p ON p_insc.usuario_id = p.id
            LEFT JOIN inscripciones a_insc ON c.id = a_insc.club_id AND a_insc.rol_en_club = 'encargado_alumno'
            LEFT JOIN usuarios a ON a_insc.usuario_id = a.id
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


// --- 2. Crear un nuevo club (Con actualización de Roles) ---
router.post('/', verifyToken, async (req, res) => {
    const { nombre, descripcion, profesor_encargado_id, alumno_encargado_id } = req.body;
    const estatus = 'en_revision'; 
    const fecha_creacion = new Date();

    if (!nombre || !descripcion || !profesor_encargado_id || !alumno_encargado_id) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    
    try {
        // 1. Insertar el club
        const [result] = await db.query(
            `INSERT INTO clubes (nombre, descripcion, estatus, fecha_creacion)
             VALUES (?, ?, ?, ?)`,
            [nombre, descripcion, estatus, fecha_creacion]
        );

        const newClubId = result.insertId;

        // 2. Inscribir al Profesor y actualizar su rol a 2 (profesor_encargado)
        await db.query(
            `INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`,
            [profesor_encargado_id, newClubId]
        );
        // Actualizamos el rol, protegiendo al Admin (role_id = 1) para que no pierda sus permisos
        await db.query(
            `UPDATE usuarios SET role_id = 2 WHERE id = ? AND role_id != 1`, 
            [profesor_encargado_id]
        );

        // 3. Inscribir al Alumno y actualizar su rol a 3 (alumno_encargado)
        if (profesor_encargado_id !== alumno_encargado_id) {
            await db.query(
                `INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo')`,
                [alumno_encargado_id, newClubId]
            );
            // Actualizamos el rol, protegiendo al Admin (role_id = 1)
            await db.query(
                `UPDATE usuarios SET role_id = 3 WHERE id = ? AND role_id != 1`, 
                [alumno_encargado_id]
            );
        }

        res.status(201).json({ message: 'Club creado exitosamente y roles actualizados.', clubId: newClubId });

    } catch (error) {
        console.error("Error al crear el club:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Error interno al crear el club." });
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
                p_insc.usuario_id AS profesor_encargado_id,
                a_insc.usuario_id AS alumno_encargado_id,
                p.nombres AS profesor_nombres,
                p.apellidos AS profesor_apellidos,
                a.nombres AS alumno_nombres,
                a.apellidos AS alumno_apellidos,
                i.estatus AS inscripcion_estatus,
                i.fecha_inscripcion
            FROM clubes c
            JOIN inscripciones i ON c.id = i.club_id
            LEFT JOIN inscripciones p_insc ON c.id = p_insc.club_id AND p_insc.rol_en_club = 'encargado_profesor'
            LEFT JOIN usuarios p ON p_insc.usuario_id = p.id
            LEFT JOIN inscripciones a_insc ON c.id = a_insc.club_id AND a_insc.rol_en_club = 'encargado_alumno'
            LEFT JOIN usuarios a ON a_insc.usuario_id = a.id
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


// NUEVA RUTA: Aprobar un club (Cambiar estatus a 'activo')
router.put('/:id/aprobar', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            `UPDATE clubes SET estatus = 'activo' WHERE id = ?`,
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Club no encontrado" });
        }

        res.status(200).json({ message: "Club aprobado exitosamente" });
    } catch (error) {
        console.error("Error al aprobar club:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// NUEVA RUTA: Obtener un club específico por ID
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                c.id, 
                c.nombre, 
                c.descripcion, 
                c.estatus,
                c.fecha_creacion,
                p_insc.usuario_id AS profesor_encargado_id,
                a_insc.usuario_id AS alumno_encargado_id,
                p.nombres AS profesor_nombres,
                p.apellidos AS profesor_apellidos,
                p.correo AS profesor_correo,
                pd.num_empleado AS profesor_num_empleado,
                a.nombres AS alumno_nombres,
                a.apellidos AS alumno_apellidos,
                a.correo AS alumno_correo,
                ad.boleta AS alumno_boleta
            FROM clubes c
            LEFT JOIN inscripciones p_insc ON c.id = p_insc.club_id AND p_insc.rol_en_club = 'encargado_profesor'
            LEFT JOIN usuarios p ON p_insc.usuario_id = p.id
            LEFT JOIN profesores_detalles pd ON p.id = pd.usuario_id
            LEFT JOIN inscripciones a_insc ON c.id = a_insc.club_id AND a_insc.rol_en_club = 'encargado_alumno'
            LEFT JOIN usuarios a ON a_insc.usuario_id = a.id
            LEFT JOIN alumnos_detalles ad ON a.id = ad.usuario_id
            WHERE c.id = ?
        `, [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: "Club no encontrado" });
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error al obtener club:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Obtener quiénes eran los encargados ANTES de borrar el club
        const [clubes] = await db.query('SELECT id FROM clubes WHERE id = ?', [id]);
        
        if (clubes.length === 0) {
            return res.status(404).json({ message: "Club no encontrado" });
        }

        const [encargados] = await db.query('SELECT usuario_id, rol_en_club FROM inscripciones WHERE club_id = ? AND rol_en_club IN ("encargado_profesor", "encargado_alumno")', [id]);
        const profesor_encargado_id = encargados.find(e => e.rol_en_club === 'encargado_profesor')?.usuario_id;
        const alumno_encargado_id = encargados.find(e => e.rol_en_club === 'encargado_alumno')?.usuario_id;

        // 2. Eliminar el club de la base de datos
        await db.query('DELETE FROM clubes WHERE id = ?', [id]);

        // 3. Función auxiliar de seguridad para revisar y degradar el rol
        const actualizarRolSiEsNecesario = async (usuarioId) => {
            if (!usuarioId) return;
            
            // Buscamos si el usuario todavía está a cargo de algún OTRO club
            const [otrosClubes] = await db.query(
                'SELECT id FROM inscripciones WHERE usuario_id = ? AND rol_en_club IN ("encargado_profesor", "encargado_alumno")', 
                [usuarioId]
            );

            // Si el arreglo está vacío, significa que ya NO es encargado de NADA
            if (otrosClubes.length === 0) {
                // Lo regresamos a rol 4 (Alumno/Regular), protegiendo al Admin (rol 1)
                await db.query('UPDATE usuarios SET role_id = 4 WHERE id = ? AND role_id != 1', [usuarioId]);
            }
        };

        // 4. Ejecutamos la revisión para ambos encargados
        await actualizarRolSiEsNecesario(profesor_encargado_id);
        await actualizarRolSiEsNecesario(alumno_encargado_id);

        res.status(200).json({ message: "Club eliminado y roles restaurados exitosamente" });
    } catch (error) {
        console.error("Error al eliminar club:", error);
        res.status(500).json({ message: "Error al eliminar" });
    }
});

// NUEVA RUTA: Editar un club completo (Textos y Encargados)
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    
    // VERIFICACIÓN DE SEGURIDAD: Solo el Administrador (role_id = 1) puede reasignar encargados
    if (req.user.role_id !== 1 && req.user.rol !== 1) {
        return res.status(403).json({ message: "Acceso denegado. Solo los administradores pueden editar encargados." });
    }

    const { nombre, descripcion, nuevo_profesor_id, nuevo_alumno_id } = req.body;

    if (!nombre || !descripcion || !nuevo_profesor_id || !nuevo_alumno_id) {
        return res.status(400).json({ message: "Todos los campos son obligatorios para editar." });
    }

    try {
        const [clubes] = await db.query('SELECT id FROM clubes WHERE id = ?', [id]);
        if (clubes.length === 0) return res.status(404).json({ message: "Club no encontrado" });

        // 1. Obtener encargados actuales para ver si a alguien lo van a despedir
        const [encargados] = await db.query('SELECT usuario_id, rol_en_club FROM inscripciones WHERE club_id = ? AND rol_en_club IN ("encargado_profesor", "encargado_alumno")', [id]);
        const viejo_profesor_id = encargados.find(e => e.rol_en_club === 'encargado_profesor')?.usuario_id;
        const viejo_alumno_id = encargados.find(e => e.rol_en_club === 'encargado_alumno')?.usuario_id;

        // 2. Actualizar textos del club
        await db.query(
            'UPDATE clubes SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, id]
        );

        // 3. Modificar inscripciones
        if (viejo_profesor_id !== nuevo_profesor_id) {
            if (viejo_profesor_id) await db.query(`DELETE FROM inscripciones WHERE usuario_id = ? AND club_id = ? AND rol_en_club = 'encargado_profesor'`, [viejo_profesor_id, id]);
            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, estatus, rol_en_club) VALUES (?, ?, 'activo', 'encargado_profesor') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_profesor'`, [nuevo_profesor_id, id]);
        }
        if (viejo_alumno_id !== nuevo_alumno_id) {
            if (viejo_alumno_id) await db.query(`DELETE FROM inscripciones WHERE usuario_id = ? AND club_id = ? AND rol_en_club = 'encargado_alumno'`, [viejo_alumno_id, id]);
            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, estatus, rol_en_club) VALUES (?, ?, 'activo', 'encargado_alumno') ON DUPLICATE KEY UPDATE rol_en_club = 'encargado_alumno'`, [nuevo_alumno_id, id]);
        }

        // 4. Subir de puesto a los NUEVOS (Roles 2 y 3), protegiendo al Admin
        await db.query(`UPDATE usuarios SET role_id = 2 WHERE id = ? AND role_id != 1`, [nuevo_profesor_id]);
        await db.query(`UPDATE usuarios SET role_id = 3 WHERE id = ? AND role_id != 1`, [nuevo_alumno_id]);

        // 5. Función para destituir a los viejos si se quedaron sin clubes
        const actualizarRolSiEsNecesario = async (usuarioId) => {
            if (!usuarioId) return;
            const [otrosClubes] = await db.query('SELECT id FROM inscripciones WHERE usuario_id = ? AND rol_en_club IN ("encargado_profesor", "encargado_alumno")', [usuarioId]);
            if (otrosClubes.length === 0) {
                await db.query('UPDATE usuarios SET role_id = 4 WHERE id = ? AND role_id != 1', [usuarioId]);
            }
        };

        // Solo verificamos destitución si la persona realmente cambió
        if (viejo_profesor_id !== nuevo_profesor_id) await actualizarRolSiEsNecesario(viejo_profesor_id);
        if (viejo_alumno_id !== nuevo_alumno_id) await actualizarRolSiEsNecesario(viejo_alumno_id);

        res.status(200).json({ message: "Club editado y roles actualizados correctamente" });

    } catch (error) {
        console.error("Error al editar club:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

module.exports = router;