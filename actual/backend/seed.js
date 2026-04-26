const db = require('./src/config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomMultiple = (arr, num) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
};

const seedMasivo = async () => {
    try {
        console.log("🚀 INICIANDO MEGA SEEDER MASIVO (ALINEADO AL DIAGRAMA ER)...");

        console.log("⏳ 1. Configurando roles...");
        const rolesBase = [ 
            { id: 1, nombre: 'administrador' }, 
            { id: 2, nombre: 'alumno' }, 
            { id: 3, nombre: 'profesor' },
            { id: 4, nombre: 'usuario_basico' }
        ];
        for (const rol of rolesBase) {
            await db.query(`INSERT IGNORE INTO roles (id, nombre) VALUES (?, ?)`, [rol.id, rol.nombre]);
        }

        console.log("⏳ 2. Generando usuarios y fichas médicas...");
        const hash = await bcrypt.hash("qwerty", 10);
        const carreras = ['Ing. en Sistemas', 'Ing. Mecatrónica', 'Lic. en Computación', 'Ing. en Datos'];
        
        let profeIds = [];
        let alumnoIds = [];

        // ADMIN
        await db.query(
            `INSERT IGNORE INTO usuarios (id, nombres, apellido_paterno, apellido_materno, correo, password, role_id) 
             VALUES (1, 'Admin', 'General', 'Sistema', 'admin@ipn.mx', ?, 1)`, [hash]
        );

        // PROFESORES
        for (let i = 1; i <= 30; i++) {
            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) 
                 VALUES (?, ?, ?, ?, ?, 3)`, 
                [`Profesor ${i}`, 'García', 'López', `profe${i}@ipn.mx`, hash]
            );
            const profeId = res.insertId;
            profeIds.push(profeId);

            await db.query(`INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`, [profeId, `EMP${2000 + i}`]);

            await db.query(
                `INSERT INTO fichas_medicas (
                    usuario_id, tipo_sangre, condiciones_preexistentes, 
                    contacto_emergencia_1_nombre, contacto_emergencia_1_telefono,
                    contacto_emergencia_2_nombre, contacto_emergencia_2_telefono,
                    contacto_emergencia_3_nombre, contacto_emergencia_3_telefono
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [profeId, 'A+', 'Ninguna', 'Contacto 1', '5500000000', 'N/A', '000', 'N/A', '000']
            );
        }

        // ALUMNOS
        for (let i = 1; i <= 150; i++) {
            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) 
                 VALUES (?, ?, ?, ?, ?, 2)`, 
                [`Alumno ${i}`, 'Martínez', 'Sánchez', `alumno${i}@ipn.mx`, hash]
            );
            const alumnoId = res.insertId;
            alumnoIds.push(alumnoId);

            await db.query(`INSERT INTO alumnos_detalles (usuario_id, nss, boleta, carrera) VALUES (?, ?, ?, ?)`, 
                [alumnoId, `NSS-${100000 + i}`, `2026${5000 + i}`, getRandom(carreras)]);

            await db.query(
                `INSERT INTO fichas_medicas (
                    usuario_id, tipo_sangre, condiciones_preexistentes, 
                    contacto_emergencia_1_nombre, contacto_emergencia_1_telefono,
                    contacto_emergencia_2_nombre, contacto_emergencia_2_telefono,
                    contacto_emergencia_3_nombre, contacto_emergencia_3_telefono
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [alumnoId, getRandom(['O+', 'A+']), 'Estudiante sano', 'Padre/Madre', '5512345678', 'N/A', '000', 'N/A', '000']
            );
        }

        console.log("⏳ 3. Creando Clubes e Interacción...");
        const nombresClub = ['Club de Robótica', 'Cine Debate', 'Ajedrez ESCOM', 'Selección de Básquetbol'];
        
        for (const nombre of nombresClub) {
            const pEncargado = getRandom(profeIds);
            const aEncargado = getRandom(alumnoIds);
            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 👇 SE AGREGARON LOS CAMPOS FALTANTES: cronograma, detalle_actividades, espacios_tiempos, impacto 👇
            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, codigo_union) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', ?)`,
                [
                    nombre, 
                    `Descripción completa del ${nombre}`, 
                    `Objetivo principal del ${nombre}`, 
                    JSON.stringify([{ mes: "Agosto", actividad: "Reunión inicial y planeación" }, { mes: "Septiembre", actividad: "Inicio de actividades" }]), 
                    `Detalles de las actividades que se desarrollarán en el ${nombre} durante el semestre.`, 
                    `Lunes y Miércoles de 14:00 a 16:00 en el Aula asignada.`, 
                    `Impacto positivo en la comunidad escolar fomentando el desarrollo integral.`, 
                    codigo
                ]
            );
            const clubId = clubRes.insertId;

            // Los encargados se guardan en la tabla inscripciones con su rol
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [clubId, pEncargado]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo')`, [clubId, aEncargado]);

            const integrantes = getRandomMultiple(alumnoIds.filter(id => id !== aEncargado), 10);
            for (const mId of integrantes) {
                await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'miembro', 'activo')`, [clubId, mId]);
            }
        }

        console.log("⏳ 4. Generando Avisos Globales...");
        for (let i = 1; i <= 5; i++) {
            await db.query(
                `INSERT INTO avisos_globales (titulo, mensaje, prioridad, autor_id, activo, fecha_vencimiento) 
                 VALUES (?, ?, ?, 1, 1, DATE_ADD(NOW(), INTERVAL 15 DAY))`,
                [`Aviso ${i}`, `Contenido de prueba institucional ${i}`, 'normal']
            );
        }

        console.log(`\n🎉 SEED EXITOSO. La base de datos está lista.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL SEED:", error);
        process.exit(1);
    }
};

seedMasivo();