const db = require('./src/config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomMultiple = (arr, num) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
};

const getRandomDateStr = (minDaysOffset, maxDaysOffset) => {
    const date = new Date();
    const offset = Math.floor(Math.random() * (maxDaysOffset - minDaysOffset + 1)) + minDaysOffset;
    date.setDate(date.getDate() + offset);
    date.setHours(Math.floor(Math.random() * 10) + 8);
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(0);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
};

const seedMasivo = async () => {
    // IMPORTANTE: Obtenemos una sola conexión para que el modo AES-256 no se pierda en el pool
    const conexion = await db.getConnection();

    try {
        console.log("🧹 1. LIMPIANDO BASE DE DATOS...");
        await conexion.query('SET FOREIGN_KEY_CHECKS = 0;');
        await conexion.query("SET block_encryption_mode = 'aes-256-ecb';");

        const tablas = [
            'roles', 'usuarios', 'contactos_emergencia', 'clubes', 'inscripciones',
            'historial_encargados', 'avisos', 'chat_mensajes',
            'eventos_club', 'asistencias_eventos'
        ];
        for (const tabla of tablas) {
            await conexion.query(`TRUNCATE TABLE ${tabla}`);
        }
        await conexion.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log("🚀 INICIANDO MEGA SEEDER MASIVO CON AES-256...");

        const rolesBase = [
            { id: 1, nombre: 'administrador' },
            { id: 2, nombre: 'alumno' },
            { id: 3, nombre: 'profesor' },
            { id: 4, nombre: 'alumno_representante' }
        ];
        for (const rol of rolesBase) {
            await conexion.query(`INSERT INTO roles (id, nombre) VALUES (?, ?)`, [rol.id, rol.nombre]);
        }

        const hash = await bcrypt.hash("qwerty", 10);
        const AES_KEY = process.env.AES_KEY || 'PassKeyLlaveSecretaSeguraTTB0512026!';

        const carreras = ['Ing. en Sistemas Computacionales', 'Ing. en Inteligencia Artificial', 'Lic. en Ciencia de Datos', 'Ing. Mecatrónica'];
        const parentescos = ['Madre', 'Padre', 'Tutor', 'Hermano/a', 'Pareja', 'Tío/a'];

        let profeIds = [];
        let alumnoIds = [];

        // ADMIN
        await conexion.query(
            `INSERT INTO usuarios (id, nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad) 
               VALUES (1, AES_ENCRYPT('Administración', ?), AES_ENCRYPT('ESCOM', ?), AES_ENCRYPT('IPN', ?), 'admin@ipn.mx', ?, 1, 1, 1, '1.0', NOW())`,
            [AES_KEY, AES_KEY, AES_KEY, hash]
        );

        // PROFESORES
        for (let i = 1; i <= 30; i++) {
            const numEmpleado = `EMP${2000 + i}`;
            const tipoSangre = getRandom(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']);
            const preexistencias = getRandom(['Ninguna', 'Hipertensión controlada', 'Ninguna', 'Asma leve']);
            const correoProfe = `profe${i}@ipn.mx`;

            const [res] = await conexion.query(
                `INSERT INTO usuarios (
                    nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, 
                    acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, num_empleado, tipo_sangre, condiciones_preexistentes
                ) VALUES (
                    AES_ENCRYPT(?, ?), AES_ENCRYPT('García', ?), AES_ENCRYPT('López', ?), 
                    ?, ?, 3, 1, 1, '1.0', NOW(), AES_ENCRYPT(?, ?), ?, AES_ENCRYPT(?, ?)
                )`,
                [`Profesor ${i}`, AES_KEY, AES_KEY, AES_KEY, correoProfe, hash, numEmpleado, AES_KEY, tipoSangre, preexistencias, AES_KEY]
            );
            const profeId = res.insertId;
            profeIds.push({ id: profeId, nombre: `Profesor ${i} García López` });

            for (let c = 1; c <= 2; c++) {
                await conexion.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) 
                     VALUES (?, AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?))`,
                    [profeId, `Familiar ${c} Profe ${i}`, AES_KEY, `55100${c}${i.toString().padStart(4, '0')}`, AES_KEY, getRandom(parentescos), AES_KEY]
                );
            }
        }

        // ALUMNOS
        for (let i = 1; i <= 150; i++) {
            const nssGenerado = `12345678${i.toString().padStart(3, '0')}`;
            const boletaGenerada = `202600${(5000 + i).toString().padStart(4, '0')}`;
            const tipoSangre = getRandom(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']);
            const preexistencias = getRandom(['Ninguna', 'Alergia a la penicilina', 'Ninguna', 'Miopía', 'Ninguna', 'Asma']);
            const correoAlumno = `alumno${i}@alumno.ipn.mx`;

            const [res] = await conexion.query(
                `INSERT INTO usuarios (
                    nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, 
                    acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, nss, boleta, carrera, tipo_sangre, condiciones_preexistentes
                ) VALUES (
                    AES_ENCRYPT(?, ?), AES_ENCRYPT('Martínez', ?), AES_ENCRYPT('Sánchez', ?), 
                    ?, ?, 2, 1, 1, '1.0', NOW(), AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), ?, ?, AES_ENCRYPT(?, ?)
                )`,
                [`Alumno ${i}`, AES_KEY, AES_KEY, AES_KEY, correoAlumno, hash, nssGenerado, AES_KEY, boletaGenerada, AES_KEY, getRandom(carreras), tipoSangre, preexistencias, AES_KEY]
            );
            const alumnoId = res.insertId;
            alumnoIds.push({ id: alumnoId, nombre: `Alumno ${i} Martínez Sánchez` });

            for (let c = 1; c <= 2; c++) {
                await conexion.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) 
                     VALUES (?, AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?))`,
                    [alumnoId, `Familiar ${c} Alumno ${i}`, AES_KEY, `55200${c}${i.toString().padStart(4, '0')}`, AES_KEY, getRandom(parentescos), AES_KEY]
                );
            }
        }

        console.log("⏳ 4. Creando Clubes Activos...");
        const nombresClub = ['Robótica Avanzada', 'Ajedrez ESCOM', 'Selección Básquetbol', 'Desarrollo Web'];

        for (const nombre of nombresClub) {
            const pEncargado = getRandom(profeIds).id;
            const aEncargado = getRandom(alumnoIds).id;
            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

            const [clubRes] = await conexion.query(
                `INSERT INTO clubes (nombre, descripcion, estatus, codigo_union, fecha_creacion) VALUES (?, ?, 'activo', ?, NOW())`,
                [nombre, `Descripción de ${nombre}`, codigo]
            );

            await conexion.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [clubRes.insertId, pEncargado]);
            await conexion.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo')`, [clubRes.insertId, aEncargado]);
        }

        console.log(`\n🎉 SEED MEGA-COMPLETO EXITOSO. Datos encriptados uniformemente.`);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL SEED:", error);
    } finally {
        conexion.release(); // Soltamos la conexión de vuelta al pool
        process.exit(0);
    }
};

seedMasivo(); 