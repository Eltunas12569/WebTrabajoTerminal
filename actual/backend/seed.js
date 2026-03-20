const User = require('./src/models/userModel');
const db = require('./src/config/db'); // Agregamos la conexión para hacer los inserts directos
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedDB = async () => {
    try {
        // La contraseña para TODOS será 'qwerty'
        const passwordPlana = "qwerty"; 
        
        // Encriptamos la contraseña una sola vez y la reusamos para todos
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(passwordPlana, salt);

        console.log("⏳ Verificando catálogo de roles...");
        // Insertamos los 4 roles base asegurando sus IDs. Si ya existen, actualiza los nombres para tener consistencia.
        await db.query(`
            INSERT INTO roles (id, nombre) VALUES 
            (1, 'Administrador'), (2, 'Profesor'), (3, 'Alumno Encargado'), (4, 'Alumno')
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
        `);

        // Lista con correos simplificados para agilizar pruebas
        const usuariosData = [
            // 1 Administrador (role_id: 1)
            { nombres: "Carlos", apellidos: "Mendoza Ruiz", nss: "12345678901", boleta: "2015630001", correo: "admin@ipn.mx", role_id: 1 },
            
            // 2 Profesores (role_id: 2)
            { nombres: "Roberto", apellidos: "Sánchez Pérez", nss: "99999999991", boleta: "1990630001", correo: "profesor1@ipn.mx", role_id: 2 },
            { nombres: "Laura", apellidos: "Gómez Díaz", nss: "88888888882", boleta: "1995630002", correo: "profesor2@ipn.mx", role_id: 2 },

            // 8 Alumnos (role_id: 4)
            { nombres: "Andrea", apellidos: "García López", nss: "11111111111", boleta: "2021630101", correo: "alumno1@ipn.mx", role_id: 4 },
            { nombres: "Miguel Ángel", apellidos: "Torres Silva", nss: "22222222222", boleta: "2022630202", correo: "alumno2@ipn.mx", role_id: 4 },
            { nombres: "Valeria", apellidos: "Martínez Castro", nss: "33333333333", boleta: "2023630303", correo: "alumno3@ipn.mx", role_id: 4 },
            { nombres: "Jorge", apellidos: "Hernández Vega", nss: "44444444444", boleta: "2020630404", correo: "alumno4@ipn.mx", role_id: 4 },
            { nombres: "Sofía", apellidos: "Rojas Medina", nss: "55555555555", boleta: "2021630505", correo: "alumno5@ipn.mx", role_id: 4 },
            { nombres: "Daniel", apellidos: "Flores Vargas", nss: "66666666666", boleta: "2022630606", correo: "alumno6@ipn.mx", role_id: 4 },
            { nombres: "Fernanda", apellidos: "Ortiz Navarro", nss: "77777777777", boleta: "2023630707", correo: "alumno7@ipn.mx", role_id: 4 },
            { nombres: "Alejandro", apellidos: "Cruz Peña", nss: "88888888888", boleta: "2020630808", correo: "alumno8@ipn.mx", role_id: 4 }
        ];

        console.log("⏳ Ejecutando seed.js: Sembrando usuarios en la base de datos...");

        for (const u of usuariosData) {
            // 1. Insertar el usuario en la tabla general
            const [res] = await db.query(
                'INSERT INTO usuarios (nombres, apellidos, correo, password, role_id) VALUES (?, ?, ?, ?, ?)',
                [u.nombres, u.apellidos, u.correo, hash, u.role_id]
            );
            
            const userId = res.insertId;

            // 2. Insertar detalles en las tablas correspondientes según el rol
            if (u.role_id === 2) {
                await db.query('INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)', [userId, u.boleta]);
            } else if (u.role_id === 4 || u.role_id === 3) {
                await db.query('INSERT INTO alumnos_detalles (usuario_id, nss, boleta) VALUES (?, ?, ?)', [userId, u.nss, u.boleta]);
            }
            
            const rolNombre = u.role_id === 1 ? 'Admin' : (u.role_id === 2 ? 'Profesor' : 'Alumno');
            console.log(`✅ Creado: ${u.nombres} | Rol: ${rolNombre} | Correo: ${u.correo}`);
        }
        
        console.log(`\n⏳ Sembrando clubes y avisos de prueba...`);
        
        // Obtener los IDs de los usuarios recién insertados para las relaciones
        const [adminRows] = await db.query("SELECT id FROM usuarios WHERE correo = 'admin@ipn.mx'");
        const [profRows] = await db.query("SELECT id FROM usuarios WHERE correo = 'profesor1@ipn.mx'");
        const [alumRows] = await db.query("SELECT id FROM usuarios WHERE correo = 'alumno1@ipn.mx'");
        
        const admin = adminRows[0];
        const profesor1 = profRows[0];
        const alumno1 = alumRows[0];

        if (profesor1 && alumno1) {
            // 1. Crear un Club
            const [clubRes] = await db.query(`
                INSERT INTO clubes (nombre, descripcion, estatus, fecha_creacion)
                VALUES ('Club de Algoritmia ESCOM', 'Preparación para concursos de programación competitiva.', 'activo', NOW())
            `);
            const clubId = clubRes.insertId;

            // 2. Inscribir encargados en la tabla 'inscripciones'
            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [profesor1.id, clubId]);
            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo')`, [alumno1.id, clubId]);
            
            // 3. Promover el rol del alumno a 3 (Alumno Encargado)
            await db.query(`UPDATE usuarios SET role_id = 3 WHERE id = ?`, [alumno1.id]);
            console.log(`✅ Club 'Algoritmia ESCOM' creado con el Profesor 1 y el Alumno 1 como encargados.`);
        }

        if (admin) {
            // 4. Crear un aviso global activo
            await db.query(`INSERT INTO avisos_globales (titulo, mensaje, prioridad, autor_id, activo) VALUES ('¡Bienvenidos al Sistema!', 'El sistema de clubes ha sido actualizado exitosamente.', 'alta', ?, 1)`, [admin.id]);
            console.log(`✅ Aviso global de prueba generado por el Administrador.`);
        }

        console.log(`\n🎉 ¡Listo! Usuarios, profesores, clubes y avisos sembrados correctamente.`);
        console.log(`🔑 La contraseña para todos es: qwerty`);
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Error al ejecutar el seed:", error.message);
        process.exit(1);
    }
};

seedDB();