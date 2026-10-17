const db = require('./src/config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomMultiple = (arr, num) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
};

// Función para generar fechas distribuidas en diferentes días
const getRandomDateStr = (minDaysOffset, maxDaysOffset) => {
    const date = new Date();
    const offset = Math.floor(Math.random() * (maxDaysOffset - minDaysOffset + 1)) + minDaysOffset;
    date.setDate(date.getDate() + offset);
    date.setHours(Math.floor(Math.random() * 10) + 8); // Entre 8 AM y 5 PM
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(0);
    // Ajuste de zona horaria local a formato MySQL YYYY-MM-DD HH:mm:ss
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
    return localISOTime;
};

const seedMasivo = async () => {
    try {
        console.log("🧹 1. LIMPIANDO BASE DE DATOS...");
        await db.query('SET FOREIGN_KEY_CHECKS = 0;');
        const tablas = [
            'roles', 'usuarios', 'contactos_emergencia', 'clubes', 'inscripciones',
            'historial_encargados', 'avisos', 'chat_mensajes',
            'eventos_club', 'asistencias_eventos'
        ];
        for (const tabla of tablas) {
            await db.query(`TRUNCATE TABLE ${tabla}`);
        }
        await db.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log("🚀 INICIANDO MEGA SEEDER MASIVO...");

        console.log("⏳ 2. Configurando roles estrictos...");
        const rolesBase = [
            { id: 1, nombre: 'administrador' },
            { id: 2, nombre: 'alumno' },
            { id: 3, nombre: 'profesor' },
            { id: 4, nombre: 'alumno_representante' }
        ];
        for (const rol of rolesBase) {
            await db.query(`INSERT INTO roles (id, nombre) VALUES (?, ?)`, [rol.id, rol.nombre]);
        }

        console.log("⏳ 3. Generando usuarios unificados y contactos...");
        const hash = await bcrypt.hash("qwerty", 10);
        const carreras = ['Ing. en Sistemas Computacionales', 'Ing. en Inteligencia Artificial', 'Lic. en Ciencia de Datos', 'Ing. Mecatrónica'];
        const parentescos = ['Madre', 'Padre', 'Tutor', 'Hermano/a', 'Tío/a'];

        let profeIds = [];
        let alumnoIds = [];
        let resumenClubes = []; // Array para almacenar la relación de encargados

        // ADMIN
        await db.query(
            `INSERT INTO usuarios (id, nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad) 
               VALUES (1, 'Administración', 'ESCOM', 'IPN', 'admin@ipn.mx', ?, 1, 1, 1, '1.0', NOW())`, [hash]
        );

        // 30 PROFESORES
        for (let i = 1; i <= 30; i++) {
            const numEmpleado = `EMP${2000 + i}`;
            const tipoSangre = getRandom(['O+', 'A+', 'B+', 'AB+']);
            // Se actualizó 'Ninguna' por 'NINGUNA'
            const preexistencias = getRandom(['NINGUNA', 'Hipertensión controlada', 'Asma leve']);
            const nombreCompleto = `Profesor ${i} García López`;

            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, num_empleado, tipo_sangre, condiciones_preexistentes) 
                 VALUES (?, ?, ?, ?, ?, 3, 1, 1, '1.0', NOW(), ?, ?, ?)`,
                [`Profesor ${i}`, 'García', 'López', `profe${i}@ipn.mx`, hash, numEmpleado, tipoSangre, preexistencias]
            );
            const profeId = res.insertId;
            // Guardamos el objeto para tener el nombre referenciado
            profeIds.push({ id: profeId, nombre: nombreCompleto });

            // Se fuerza la creación de obligatoriamente 2 contactos para los profesores
            for (let c = 1; c <= 2; c++) {
                await db.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)`,
                    [profeId, `Familiar ${c} Profe ${i}`, `55100${c}${i.toString().padStart(4, '0')}`, getRandom(parentescos)]
                );
            }
        }

        // 150 ALUMNOS
        for (let i = 1; i <= 150; i++) {
            const nssGenerado = `12345678${i.toString().padStart(3, '0')}`;
            const boletaGenerada = `202600${(5000 + i).toString().padStart(4, '0')}`;
            const carreraGenerada = getRandom(carreras);
            const tipoSangre = getRandom(['O+', 'A+', 'O-', 'B+']);
            // Se actualizó 'Ninguna' por 'NINGUNA' en todas las posiciones
            const preexistencias = getRandom(['NINGUNA', 'Alergia a la penicilina', 'NINGUNA', 'Miopía', 'NINGUNA']);
            const nombreCompleto = `Alumno ${i} Martínez Sánchez`;

            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, nss, boleta, carrera, tipo_sangre, condiciones_preexistentes) 
                 VALUES (?, ?, ?, ?, ?, 2, 1, 1, '1.0', NOW(), ?, ?, ?, ?, ?)`,
                [`Alumno ${i}`, 'Martínez', 'Sánchez', `alumno${i}@alumno.ipn.mx`, hash, nssGenerado, boletaGenerada, carreraGenerada, tipoSangre, preexistencias]
            );
            const alumnoId = res.insertId;
            alumnoIds.push({ id: alumnoId, nombre: nombreCompleto });

            // Se elimina el Math.random() para obligar a 2 contactos
            for (let c = 1; c <= 2; c++) {
                await db.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)`,
                    [alumnoId, `Familiar ${c} Alumno ${i}`, `55200${c}${i.toString().padStart(4, '0')}`, getRandom(parentescos)]
                );
            }
        }

        console.log("⏳ 4. Creando Clubes Activos con Historial Lleno, Recursos, Chat y Eventos...");
        const nombresClub = [
            'Robótica Avanzada', 'Ajedrez ESCOM', 'Selección Básquetbol', 'Desarrollo Web',
            'Ciberseguridad y Hacking', 'Emprendimiento Tech', 'Danza Folclórica', 'Fútbol Femenil',
            'Inteligencia Artificial', 'Club de Matemáticas', 'IoT y Hardware', 'Inglés Conversacional'
        ];

        for (const nombre of nombresClub) {
            const pEncargadoObj = getRandom(profeIds);
            const aEncargadoObj = getRandom(alumnoIds);
            const pAnteriorObj = getRandom(profeIds.filter(p => p.id !== pEncargadoObj.id));
            const aAnteriorObj = getRandom(alumnoIds.filter(a => a.id !== aEncargadoObj.id));

            const pEncargado = pEncargadoObj.id;
            const aEncargado = aEncargadoObj.id;
            const pAnterior = pAnteriorObj.id;
            const aAnterior = aAnteriorObj.id;

            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Guardamos en el resumen
            resumenClubes.push({
                Club: nombre,
                'Profesor Encargado': pEncargadoObj.nombre,
                'Alumno Representante': aEncargadoObj.nombre
            });

            const fechaCreacion = getRandomDateStr(-60, -30); // Creado hace 30-60 días

            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, codigo_union, fecha_creacion) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?)`,
                [
                    nombre, `Espacio dedicado al desarrollo integral mediante el ${nombre}.`, `Preparar a los alumnos para competencias.`,
                    JSON.stringify([{ mes: "Agosto", actividad: "Integración" }, { mes: "Diciembre", actividad: "Torneo interno" }]),
                    `Práctica intensa. Revisión quincenal.`, `Martes y jueves de 14:00 a 16:00 hrs.`, `Desarrollo de Soft Skills.`, codigo, fechaCreacion
                ]
            );
            const clubId = clubRes.insertId;

            // Historial anterior
            await db.query(
                `INSERT INTO historial_encargados (club_id, usuario_id, rol_desempenado, fecha_inicio, fecha_fin) 
                 VALUES (?, ?, 'encargado_profesor', DATE_SUB(NOW(), INTERVAL 6 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH))`,
                [clubId, pAnterior]
            );
            await db.query(
                `INSERT INTO historial_encargados (club_id, usuario_id, rol_desempenado, fecha_inicio, fecha_fin) 
                 VALUES (?, ?, 'encargado_alumno', DATE_SUB(NOW(), INTERVAL 6 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH))`,
                [clubId, aAnterior]
            );

            const fechaInscripcionEncargados = getRandomDateStr(-25, -20);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_profesor', 'activo', ?)`, [clubId, pEncargado, fechaInscripcionEncargados]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_alumno', 'activo', ?)`, [clubId, aEncargado, fechaInscripcionEncargados]);

            const integrantes = getRandomMultiple(alumnoIds.filter(a => a.id !== aEncargado && a.id !== aAnterior), 18);
            for (const m of integrantes) {
                const fechaInscripcion = getRandomDateStr(-15, -1);
                await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'miembro', 'activo', ?)`, [clubId, m.id, fechaInscripcion]);
            }

            // Dispersando fechas de avisos y chats
            const fechaAviso = getRandomDateStr(-10, -1);
            await db.query(`INSERT INTO avisos (club_id, usuario_id, titulo, contenido, fecha_envio) VALUES (?, ?, ?, ?, ?)`, [clubId, pEncargado, `Bienvenida - ${nombre}`, `¡Bienvenidos al club ${nombre}! Empezamos la próxima semana.`, fechaAviso]);

            await db.query(`INSERT INTO chat_mensajes (club_id, usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, ?, 'club', ?, ?)`, [clubId, pEncargado, 'Hola a todos, este es el chat oficial.', getRandomDateStr(-5, -3)]);
            await db.query(`INSERT INTO chat_mensajes (usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, 'directivos', ?, ?)`, [pEncargado, `Buen día directivos, el club ${nombre} ya tiene planificada su primera sesión.`, getRandomDateStr(-7, -4)]);
            await db.query(`INSERT INTO chat_mensajes (usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, 'encargados', ?, ?)`, [aEncargado, `Hola a todos los representantes, coordinando espacios para ${nombre}.`, getRandomDateStr(-2, 0)]);

            // Dispersando fechas de eventos (Futuros)
            const fechaEvento = getRandomDateStr(2, 15); // Evento en los próximos 2 a 15 días
            const [eventoRes] = await db.query(`INSERT INTO eventos_club (club_id, usuario_id, titulo, descripcion, fecha_evento, lugar, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clubId, aEncargado, 'Reunión de Integración', 'Primer encuentro oficial.', fechaEvento, 'Salón Múltiple', getRandomDateStr(-3, 0)]);

            for (const asisObj of getRandomMultiple(integrantes, 12)) {
                await db.query(`INSERT INTO asistencias_eventos (evento_id, usuario_id, asistira, fecha_respuesta) VALUES (?, ?, 1, ?)`, [eventoRes.insertId, asisObj.id, getRandomDateStr(-1, 0)]);
            }
        }

        // Imprimimos la tabla resumen de clubes
        console.log("\n📊 RESUMEN DE ENCARGADOS POR CLUB:");
        console.table(resumenClubes);

        console.log("⏳ 5. Creando Clubes RECHAZADOS...");
        const clubesRechazados = ['Club de Literatura de Terror', 'Torneos de eSports', 'Club de Gastronomía'];
        const motivosRechazo = [
            'El cronograma está incompleto. Faltan detallar las actividades de los meses de Octubre y Noviembre.',
            'No se especificaron claramente los espacios y tiempos solicitados. Favor de indicar si requieren el auditorio o un salón normal.',
            'La justificación del impacto académico es muy vaga. Rehacer el plan de trabajo alineado a los valores de la institución.'
        ];

        for (let i = 0; i < clubesRechazados.length; i++) {
            const pEncargado = getRandom(profeIds).id;
            const aEncargado = getRandom(alumnoIds).id;

            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, motivo_rechazo, fecha_creacion) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'rechazado', ?, ?)`,
                [
                    clubesRechazados[i], `Club propuesto para ${clubesRechazados[i]}.`, `Objetivo pendiente de mejora.`,
                    JSON.stringify([{ mes: "Agosto", actividad: "Inicio" }]), `Actividades pendientes.`, `Horario por definir.`, `Impacto estudiantil.`,
                    motivosRechazo[i], getRandomDateStr(-40, -10)
                ]
            );
            const clubId = clubRes.insertId;

            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_profesor', 'activo', ?)`, [clubId, pEncargado, getRandomDateStr(-40, -10)]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_alumno', 'activo', ?)`, [clubId, aEncargado, getRandomDateStr(-40, -10)]);
        }

        console.log("⏳ 6. Generando 15 Avisos Globales...");
        for (let i = 1; i <= 15; i++) {
            const fechaEnvio = getRandomDateStr(-5, 5); // Desde hace 5 días hasta dentro de 5 días
            const fechaVenc = getRandomDateStr(15, 30); // Vencimiento en 15-30 días
            await db.query(
                `INSERT INTO avisos (club_id, titulo, contenido, prioridad, usuario_id, activo, fecha_envio, fecha_vencimiento) 
                 VALUES (NULL, ?, ?, ?, 1, 1, ?, ?)`,
                [`Aviso Institucional ${i}`, `Lineamientos de protección civil y uso de instalaciones para la semana ${i}.`, getRandom(['alta', 'normal', 'baja']), fechaEnvio, fechaVenc]
            );
        }

        console.log(`\n🎉 SEED MEGA-COMPLETO EXITOSO. Todas las tablas están listas.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL SEED:", error);
        process.exit(1);
    }
};

seedMasivo();