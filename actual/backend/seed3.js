const db = require('./src/config/db');
require('dotenv').config();

const getDateOffsetStr = (daysOffset, hour = 10, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(0);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
};

const seedClub19 = async () => {
    try {
        console.log("⏳ Buscando profesor y 19 alumnos existentes en la base de datos...");
        const AES_KEY = process.env.AES_KEY || 'PassKeyLlaveSecretaSeguraTTB0512026!';
        await db.query("SET block_encryption_mode = 'aes-256-ecb';");

        const [profesores] = await db.query(
            `SELECT id, correo,
                    CONCAT_WS(' ',
                        CAST(AES_DECRYPT(nombres, ?) AS CHAR),
                        CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR),
                        CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR)
                    ) AS nombre_completo
             FROM usuarios WHERE role_id = 3 ORDER BY id ASC LIMIT 1`,
            [AES_KEY, AES_KEY, AES_KEY]
        );
        if (!profesores.length) {
            throw new Error("No se encontró ningún profesor (role_id = 3) en la base de datos.");
        }

        const [alumnos] = await db.query(
            `SELECT id, correo,
                    CONCAT_WS(' ',
                        CAST(AES_DECRYPT(nombres, ?) AS CHAR),
                        CAST(AES_DECRYPT(apellido_paterno, ?) AS CHAR),
                        CAST(AES_DECRYPT(apellido_materno, ?) AS CHAR)
                    ) AS nombre_completo
             FROM usuarios WHERE role_id = 2 ORDER BY id ASC LIMIT 20`,
            [AES_KEY, AES_KEY, AES_KEY]
        );
        if (alumnos.length < 20) {
            throw new Error(`Se necesitan al menos 20 alumnos (role_id = 2: 1 representante pendiente + 19 miembros activos), pero solo hay ${alumnos.length}.`);
        }

        const profesor = profesores[0];
        const alumnoRepresentante = alumnos[0];
        const miembros = alumnos.slice(1, 20); // 19 miembros activos + 1 representante pendiente
        const codigoEspecial = 'CLUB19';

        const [clubRes] = await db.query(
            `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, codigo_union, fecha_creacion) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'esperando_firmas', ?, ?)`,
            [
                'Club de Prueba 19 Alumnos',
                'Club en espera de firma del profesor encargado, con 19 alumnos ya aceptados.',
                'Validar el flujo de aceptación del encargado cuando el club ya cuenta con 19 alumnos activos.',
                JSON.stringify([{ mes: "Septiembre", actividad: "Inicio de actividades" }]),
                'Sesiones semanales de práctica.',
                'Lunes y Miércoles de 14:00 a 16:00 hrs.',
                'Impacto académico y estudiantil.',
                codigoEspecial,
                getDateOffsetStr(-5)
            ]
        );

        const clubId = clubRes.insertId || clubRes[0]?.insertId;

        // Encargado profesor ACTIVO (creador del club)
        await db.query(
            `INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_profesor', 'activo', ?)`,
            [clubId, profesor.id, getDateOffsetStr(-5)]
        );

        // Alumno representante PENDIENTE por aceptar
        await db.query(
            `INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_alumno', 'pendiente', ?)`,
            [clubId, alumnoRepresentante.id, getDateOffsetStr(-5)]
        );

        // 19 alumnos miembros ACTIVOS
        for (const m of miembros) {
            await db.query(
                `INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'miembro', 'activo', ?)`,
                [clubId, m.id, getDateOffsetStr(-3)]
            );
        }

        console.log(`✅ Club creado sin limpiar la BD: "Club de Prueba 19 Alumnos" (ID: ${clubId}, código: ${codigoEspecial})`);
        console.log("\n📊 RESUMEN DE ENCARGADOS POR CLUB:");
        console.table([{
            Club: 'Club de Prueba 19 Alumnos',
            'Profesor Encargado (ACTIVO)': `${profesor.nombre_completo || profesor.correo} (${profesor.correo})`,
            'Alumno Representante (PENDIENTE)': `${alumnoRepresentante.nombre_completo || alumnoRepresentante.correo} (${alumnoRepresentante.correo})`
        }]);
    } catch (error) {
        console.error("❌ ERROR EN SEED3:", error.message || error);
    } finally {
        process.exit(0);
    }
};

seedClub19();
