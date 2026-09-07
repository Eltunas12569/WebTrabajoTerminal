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
        console.log("🧹 1. LIMPIANDO BASE DE DATOS...");
        await db.query('SET FOREIGN_KEY_CHECKS = 0;');
        const tablas = [
            'roles', 'usuarios', 'profesores_detalles', 'alumnos_detalles', 
            'fichas_medicas', 'contactos_emergencia', 'clubes', 'inscripciones', 
            'historial_encargados', 'avisos_club', 'chat_club', 'solicitudes_recursos', 
            'avisos_globales', 'eventos_club', 'asistencias_eventos'
        ];
        for (const tabla of tablas) {
            await db.query(`TRUNCATE TABLE ${tabla}`);
        }
        await db.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log("🚀 INICIANDO MEGA SEEDER MASIVO...");

        console.log("⏳ 2. Configurando roles estrictos (Sin usuario_basico)...");
        const rolesBase = [ 
            { id: 1, nombre: 'administrador' }, 
            { id: 2, nombre: 'alumno' }, 
            { id: 3, nombre: 'profesor' }
        ];
        for (const rol of rolesBase) {
            await db.query(`INSERT INTO roles (id, nombre) VALUES (?, ?)`, [rol.id, rol.nombre]);
        }

        console.log("⏳ 3. Generando usuarios, fichas médicas y contactos normalizados...");
        const hash = await bcrypt.hash("qwerty", 10);
        const carreras = ['Ing. en Sistemas Computacionales', 'Ing. en Inteligencia Artificial', 'Lic. en Ciencia de Datos', 'Ing. Mecatrónica'];
        const parentescos = ['Madre', 'Padre', 'Tutor', 'Hermano/a', 'Tío/a'];
        
        let profeIds = [];
        let alumnoIds = [];

        // ADMIN (Marcado como verificado para no bloquearlo)
        await db.query(
              `INSERT INTO usuarios (id, nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad) 
               VALUES (1, 'Administración', 'ESCOM', 'IPN', 'admin@ipn.mx', ?, 1, 1, 1, '1.0', NOW())`, [hash]
        );

        // 30 PROFESORES (Marcados como verificados)
        for (let i = 1; i <= 30; i++) {
            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad) 
                 VALUES (?, ?, ?, ?, ?, 3, 1, 1, '1.0', NOW())`, 
                [`Profesor ${i}`, 'García', 'López', `profe${i}@ipn.mx`, hash]
            );
            const profeId = res.insertId;
            profeIds.push(profeId);

            await db.query(`INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`, [profeId, `EMP${2000 + i}`]);

            await db.query(
                `INSERT INTO fichas_medicas (usuario_id, tipo_sangre, condiciones_preexistentes) VALUES (?, ?, ?)`, 
                [profeId, getRandom(['O+', 'A+', 'B+', 'AB+']), getRandom(['Ninguna', 'Hipertensión controlada', 'Asma leve'])]
            );
            
            await db.query(
                `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)`,
                [profeId, `Familiar Profe ${i}`, `551000${i.toString().padStart(4, '0')}`, getRandom(parentescos)]
            );
        }

        // 150 ALUMNOS (Marcados como verificados)
        for (let i = 1; i <= 150; i++) {
            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad) 
                 VALUES (?, ?, ?, ?, ?, 2, 1, 1, '1.0', NOW())`, 
                [`Alumno ${i}`, 'Martínez', 'Sánchez', `alumno${i}@alumno.ipn.mx`, hash]
            );
            const alumnoId = res.insertId;
            alumnoIds.push(alumnoId);

            const nssGenerado = `12345678${i.toString().padStart(3, '0')}`;
            const boletaGenerada = `202600${(5000 + i).toString().padStart(4, '0')}`;

            await db.query(`INSERT INTO alumnos_detalles (usuario_id, nss, boleta, carrera) VALUES (?, ?, ?, ?)`, 
                [alumnoId, nssGenerado, boletaGenerada, getRandom(carreras)]);

            await db.query(
                `INSERT INTO fichas_medicas (usuario_id, tipo_sangre, condiciones_preexistentes) VALUES (?, ?, ?)`, 
                [alumnoId, getRandom(['O+', 'A+', 'O-', 'B+']), getRandom(['Ninguna', 'Alergia a la penicilina', 'Ninguna', 'Miopía', 'Ninguna'])]
            );
            
            const numContactos = Math.random() > 0.5 ? 2 : 1;
            for(let c = 1; c <= numContactos; c++) {
                await db.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)`,
                    [alumnoId, `Familiar ${c} Alumno ${i}`, `552000${i.toString().padStart(4, '0')}`, getRandom(parentescos)]
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
            const pEncargado = getRandom(profeIds);
            const aEncargado = getRandom(alumnoIds);
            
            const pAnterior = getRandom(profeIds.filter(id => id !== pEncargado));
            const aAnterior = getRandom(alumnoIds.filter(id => id !== aEncargado));

            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, codigo_union) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', ?)`,
                [
                    nombre, `Espacio dedicado al desarrollo integral mediante el ${nombre}.`, `Preparar a los alumnos para competencias.`, 
                    JSON.stringify([{ mes: "Agosto", actividad: "Integración" }, { mes: "Diciembre", actividad: "Torneo interno" }]), 
                    `Práctica intensa. Revisión quincenal.`, `Martes y jueves de 14:00 a 16:00 hrs.`, `Desarrollo de Soft Skills.`, codigo
                ]
            );
            const clubId = clubRes.insertId;

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

            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [clubId, pEncargado]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo')`, [clubId, aEncargado]);

            await db.query(
                `INSERT INTO historial_encargados (club_id, usuario_id, rol_desempenado, fecha_inicio) 
                 VALUES (?, ?, 'encargado_profesor', DATE_SUB(NOW(), INTERVAL 1 MONTH))`, 
                [clubId, pEncargado]
            );
            await db.query(
                `INSERT INTO historial_encargados (club_id, usuario_id, rol_desempenado, fecha_inicio) 
                 VALUES (?, ?, 'encargado_alumno', DATE_SUB(NOW(), INTERVAL 1 MONTH))`, 
                [clubId, aEncargado]
            );

            const integrantes = getRandomMultiple(alumnoIds.filter(id => id !== aEncargado && id !== aAnterior), 18);
            for (const mId of integrantes) {
                await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'miembro', 'activo')`, [clubId, mId]);
            }

            const recursos = ['Proyector', 'Balones oficiales', 'Kits Arduino Uno', 'Tableros de Ajedrez', 'Bocina Bluetooth'];
            await db.query(
                `INSERT INTO solicitudes_recursos (club_id, usuario_id, tipo_club, tipo_recurso, nombre_recurso, cantidad, unidad, especificaciones, opciones_marcas, motivo, estatus) 
                 VALUES (?, ?, 'Académico/Deportivo', ?, ?, ?, 'Piezas', 'Especificaciones estándar', 'Cualquier marca', 'Material necesario para el desarrollo de las prácticas del semestre.', ?)`,
                [clubId, pEncargado, getRandom(['material', 'espacio']), getRandom(recursos), Math.floor(Math.random() * 10) + 1, getRandom(['pendiente', 'aprobado'])]
            );

            await db.query(`INSERT INTO avisos_club (club_id, usuario_id, contenido) VALUES (?, ?, ?)`, [clubId, pEncargado, `¡Bienvenidos al club ${nombre}! Empezamos la próxima semana.`]);
            const [eventoRes] = await db.query(`INSERT INTO eventos_club (club_id, usuario_id, titulo, descripcion, fecha_evento, lugar) VALUES (?, ?, ?, ?, ?, ?)`, [clubId, aEncargado, 'Reunión de Integración', 'Primer encuentro oficial.', '2026-08-21 14:00:00', 'Salón Múltiple']);
            for (const asisId of getRandomMultiple(integrantes, 12)) {
                await db.query(`INSERT INTO asistencias_eventos (evento_id, usuario_id, asistira) VALUES (?, ?, 1)`, [eventoRes.insertId, asisId]);
            }
            await db.query(`INSERT INTO chat_club (club_id, usuario_id, mensaje) VALUES (?, ?, ?)`, [clubId, pEncargado, 'Hola a todos, este es el chat oficial.']);
        }

        console.log("⏳ 5. Creando Clubes RECHAZADOS (Con motivos llenos)...");
        const clubesRechazados = ['Club de Literatura de Terror', 'Torneos de eSports', 'Club de Gastronomía'];
        const motivosRechazo = [
            'El cronograma está incompleto. Faltan detallar las actividades de los meses de Octubre y Noviembre.',
            'No se especificaron claramente los espacios y tiempos solicitados. Favor de indicar si requieren el auditorio o un salón normal.',
            'La justificación del impacto académico es muy vaga. Rehacer el plan de trabajo alineado a los valores de la institución.'
        ];

        for (let i = 0; i < clubesRechazados.length; i++) {
            const pEncargado = getRandom(profeIds);
            const aEncargado = getRandom(alumnoIds);

            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, motivo_rechazo) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'rechazado', ?)`,
                [
                    clubesRechazados[i], `Club propuesto para ${clubesRechazados[i]}.`, `Objetivo pendiente de mejora.`, 
                    JSON.stringify([{ mes: "Agosto", actividad: "Inicio" }]), `Actividades pendientes.`, `Horario por definir.`, `Impacto estudiantil.`,
                    motivosRechazo[i]
                ]
            );
            const clubId = clubRes.insertId;

            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_profesor', 'activo')`, [clubId, pEncargado]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus) VALUES (?, ?, 'encargado_alumno', 'activo')`, [clubId, aEncargado]);
            
            await db.query(`INSERT INTO historial_encargados (club_id, usuario_id, rol_desempenado, fecha_inicio) VALUES (?, ?, 'encargado_profesor', NOW())`, [clubId, pEncargado]);
            await db.query(`INSERT INTO historial_encargados (club_id, usuario_id, rol_desempenado, fecha_inicio) VALUES (?, ?, 'encargado_alumno', NOW())`, [clubId, aEncargado]);
        }

        console.log("⏳ 6. Generando 15 Avisos Globales...");
        for (let i = 1; i <= 15; i++) {
            await db.query(
                `INSERT INTO avisos_globales (titulo, mensaje, prioridad, autor_id, activo, fecha_vencimiento) 
                 VALUES (?, ?, ?, 1, 1, DATE_ADD(NOW(), INTERVAL 20 DAY))`,
                [`Aviso Institucional ${i}`, `Lineamientos de protección civil y uso de instalaciones para la semana ${i}.`, getRandom(['alta', 'normal', 'baja'])]
            );
        }

        console.log(`\n🎉 SEED MEGA-COMPLETO EXITOSO. Todas las tablas (incluyendo el historial anterior con fechas completas) están listas.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL SEED:", error);
        process.exit(1);
    }
};

seedMasivo();