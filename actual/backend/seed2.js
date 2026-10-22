const db = require('./src/config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomMultiple = (arr, num) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
};

// Función para generar fechas distribuidas en días pasados o futuros
const getDateOffsetStr = (daysOffset, hour = 10, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(0);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
};

const seedMasivo = async () => {
    try {
        console.log("🧹 1. LIMPIANDO BASE DE DATOS...");
        await db.query('SET FOREIGN_KEY_CHECKS = 0;');
        await db.query("SET block_encryption_mode = 'aes-256-ecb';");

        const tablas = [
            'historial_aceptacion_politicas', 'politicas_versiones', 'contactos_emergencia',
            'asistencias_eventos', 'eventos_club', 'chat_mensajes', 'avisos',
            'historial_encargados', 'inscripciones', 'clubes', 'usuarios', 'roles'
        ];
        for (const tabla of tablas) {
            await db.query(`TRUNCATE TABLE ${tabla}`);
        }
        await db.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log("🚀 INICIANDO MEGA SEEDER COMPLETO CON ENCRIPTACIÓN...");

        console.log("⏳ 2. Creando Roles...");
        const rolesBase = [
            { id: 1, nombre: 'administrador' },
            { id: 2, nombre: 'alumno' },
            { id: 3, nombre: 'profesor' },
            { id: 4, nombre: 'alumno_representante' }
        ];
        for (const rol of rolesBase) {
            await db.query(`INSERT INTO roles (id, nombre) VALUES (?, ?)`, [rol.id, rol.nombre]);
        }

        const hash = await bcrypt.hash("qwerty", 10);
        const AES_KEY = process.env.AES_KEY || 'PassKeyLlaveSecretaSeguraTTB0512026!';

        const versionAviso = '2.1';
        const versionTerminos = '2.1';

        console.log("⏳ 3. Creando Administrador con políticas aceptadas...");
        await db.query(
            `INSERT INTO usuarios (
                id, nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, 
                acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad,
                acepta_terminos, version_terminos, fecha_aceptacion_terminos
            ) VALUES (
                1, AES_ENCRYPT('Administración', ?), AES_ENCRYPT('ESCOM', ?), AES_ENCRYPT('IPN', ?), 
                'admin@ipn.mx', ?, 1, 1, 
                1, ?, NOW(), 
                1, ?, NOW()
            )`,
            [AES_KEY, AES_KEY, AES_KEY, hash, versionAviso, versionTerminos]
        );

        console.log("⏳ 4. Inyectando Historial de Políticas y Versiones...");
        const historialesPoliticas = [
            { version: '1.0', titulo: 'Aviso de Privacidad y Términos Inicial', resumen_cambios: 'Versión inicial de lanzamiento.', fecha: getDateOffsetStr(-365) },
            { version: '2.0', titulo: 'Actualización Normativa', resumen_cambios: 'Actualización con normativas de protección de datos.', fecha: getDateOffsetStr(-180) },
            { version: '2.1', titulo: 'Versión Actual Vigente', resumen_cambios: 'Ajustes menores en cláusulas de retención de datos de clubes.', fecha: getDateOffsetStr(-30) }
        ];

        for (const pol of historialesPoliticas) {
            await db.query(
                `INSERT INTO politicas_versiones (version, titulo, resumen_cambios, fecha_publicacion, activo, creado_por) VALUES (?, ?, ?, ?, 1, 1)`,
                [pol.version, pol.titulo, pol.resumen_cambios, pol.fecha]
            );
        }

        const carreras = ['Ing. en Sistemas Computacionales', 'Ing. en Inteligencia Artificial', 'Lic. en Ciencia de Datos', 'Ing. Mecatrónica'];
        const parentescos = ['Madre', 'Padre', 'Tutor', 'Hermano/a', 'Pareja', 'Tío/a'];

        let profeIds = [];
        let alumnoIds = [];
        let clubesCreados = [];
        let resumenClubes = [];
        let todosLosClubes = []; // Array maestro para inyectar avisos internos a TODOS los clubes

        console.log("⏳ 5. Creando Profesores...");
        for (let i = 1; i <= 30; i++) {
            const numEmpleado = `EMP${2000 + i}`;
            const tipoSangre = getRandom(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']);
            const preexistencias = getRandom(['NINGUNA', 'Hipertensión controlada', 'NINGUNA', 'Asma leve']);
            const correoProfe = `profe${i}@ipn.mx`;
            const fechaAceptacion = getDateOffsetStr(-Math.floor(Math.random() * 25) - 1);
            const nombreCompleto = `Profesor ${i} García López`;

            const [res] = await db.query(
                `INSERT INTO usuarios (
                    nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, 
                    acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad,
                    acepta_terminos, version_terminos, fecha_aceptacion_terminos,
                    num_empleado, tipo_sangre, condiciones_preexistentes
                ) VALUES (
                    AES_ENCRYPT(?, ?), AES_ENCRYPT('García', ?), AES_ENCRYPT('López', ?), 
                    ?, ?, 3, 1, 
                    1, ?, ?,
                    1, ?, ?,
                    AES_ENCRYPT(?, ?), ?, AES_ENCRYPT(?, ?)
                )`,
                [
                    `Profesor ${i}`, AES_KEY, AES_KEY, AES_KEY,
                    correoProfe, hash,
                    versionAviso, fechaAceptacion,
                    versionTerminos, fechaAceptacion,
                    numEmpleado, AES_KEY, tipoSangre, preexistencias, AES_KEY
                ]
            );
            const profeId = res.insertId || res[0]?.insertId;
            profeIds.push({ id: profeId, nombre: nombreCompleto });

            for (let c = 1; c <= 2; c++) {
                await db.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) 
                     VALUES (?, AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?))`,
                    [profeId, `Familiar ${c} Profe ${i}`, AES_KEY, `55100${c}${i.toString().padStart(4, '0')}`, AES_KEY, getRandom(parentescos), AES_KEY]
                );
            }
        }

        console.log("⏳ 6. Creando Alumnos...");
        for (let i = 1; i <= 150; i++) {
            const nssGenerado = `12345678${i.toString().padStart(3, '0')}`;
            const boletaGenerada = `202600${(5000 + i).toString().padStart(4, '0')}`;
            const tipoSangre = getRandom(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']);
            const preexistencias = getRandom(['NINGUNA', 'Alergia a la penicilina', 'NINGUNA', 'Miopía', 'NINGUNA', 'Asma']);
            const correoAlumno = `alumno${i}@alumno.ipn.mx`;
            const fechaAceptacion = getDateOffsetStr(-Math.floor(Math.random() * 25) - 1);
            const nombreCompleto = `Alumno ${i} Martínez Sánchez`;

            const [res] = await db.query(
                `INSERT INTO usuarios (
                    nombres, apellido_paterno, apellido_materno, correo, password, role_id, verificado, 
                    acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad,
                    acepta_terminos, version_terminos, fecha_aceptacion_terminos,
                    nss, boleta, carrera, tipo_sangre, condiciones_preexistentes
                ) VALUES (
                    AES_ENCRYPT(?, ?), AES_ENCRYPT('Martínez', ?), AES_ENCRYPT('Sánchez', ?), 
                    ?, ?, 2, 1, 
                    1, ?, ?,
                    1, ?, ?,
                    AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), ?, ?, AES_ENCRYPT(?, ?)
                )`,
                [
                    `Alumno ${i}`, AES_KEY, AES_KEY, AES_KEY,
                    correoAlumno, hash,
                    versionAviso, fechaAceptacion,
                    versionTerminos, fechaAceptacion,
                    nssGenerado, AES_KEY, boletaGenerada, AES_KEY, getRandom(carreras), tipoSangre, preexistencias, AES_KEY
                ]
            );
            const alumnoId = res.insertId || res[0]?.insertId;
            alumnoIds.push({ id: alumnoId, nombre: nombreCompleto });

            for (let c = 1; c <= 2; c++) {
                await db.query(
                    `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) 
                     VALUES (?, AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?))`,
                    [alumnoId, `Familiar ${c} Alumno ${i}`, AES_KEY, `55200${c}${i.toString().padStart(4, '0')}`, AES_KEY, getRandom(parentescos), AES_KEY]
                );
            }
        }

        console.log("⏳ 7. Creando Clubes Activos y Auditoría de Encargados...");
        const nombresClub = [
            'Robótica Avanzada', 'Ajedrez ESCOM', 'Selección Básquetbol', 'Desarrollo Web',
            'Ciberseguridad y Hacking', 'Inteligencia Artificial', 'Danza Folclórica', 'Fútbol Femenil',
            'Club de Matemáticas', 'IoT y Hardware', 'Inglés Conversacional'
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
            const fechaCreacion = getDateOffsetStr(-90);

            const objetivo = `Preparar a los alumnos para competencias y desarrollo integral en ${nombre}.`;
            const cronograma = JSON.stringify([
                { mes: "Agosto", actividad: "Integración y planeación" },
                { mes: "Octubre", actividad: "Prácticas intermedias" },
                { mes: "Diciembre", actividad: "Evaluación y torneo interno" }
            ]);
            const detalle_actividades = `Sesiones teóricas y prácticas intensivas con revisión quincenal.`;
            const espacios_tiempos = `Martes y Jueves de 14:00 a 16:00 hrs en el Edificio 2 / Cancha Asignada.`;
            const impacto = `Desarrollo de habilidades técnicas y soft skills.`;

            resumenClubes.push({
                Club: nombre,
                'Profesor Encargado': pEncargadoObj.nombre,
                'Alumno Representante': aEncargadoObj.nombre
            });

            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, codigo_union, fecha_creacion) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?)`,
                [nombre, `Espacio dedicado al fomento y práctica de ${nombre} en ESCOM.`, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, codigo, fechaCreacion]
            );

            const clubId = clubRes.insertId || clubRes[0]?.insertId;
            clubesCreados.push({ id: clubId, nombre, pEncargado, aEncargado });
            todosLosClubes.push({ id: clubId, nombre, pEncargado, aEncargado });

            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_profesor', 'activo', ?)`, [clubId, pEncargado, getDateOffsetStr(-30)]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_alumno', 'activo', ?)`, [clubId, aEncargado, getDateOffsetStr(-30)]);

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

            const miembros = getRandomMultiple(alumnoIds.filter(a => a.id !== aEncargado && a.id !== aAnterior), 18);
            for (const m of miembros) {
                await db.query(
                    `INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) 
                     VALUES (?, ?, 'miembro', 'activo', ?)`,
                    [clubId, m.id, getDateOffsetStr(-Math.floor(Math.random() * 20) - 1)]
                );
            }
        }

        console.log("\n📊 RESUMEN DE ENCARGADOS POR CLUB:");
        console.table(resumenClubes);

        console.log("⏳ 8. Creando Múltiples Eventos (2 meses en adelante)...");
        const titulosEventos = [
            'Taller Intensivo y Práctica', 'Torneo Interno Relámpago', 'Sesión de Asesoría Técnica',
            'Mesa Redonda y Estrategia', 'Presentación de Proyectos', 'Evaluación de Desempeño',
            'Clase Magistral de Invitado', 'Revisión de Avances'
        ];

        for (const club of clubesCreados) {
            for (let e = 0; e < 8; e++) {
                const diasOffset = Math.floor(Math.random() * 61);
                const fechaEvento = getDateOffsetStr(diasOffset, 10 + (Math.floor(Math.random() * 8)), 0);
                const tituloEv = `${getRandom(titulosEventos)} - Sesión ${e + 1}`;

                const [evRes] = await db.query(
                    `INSERT INTO eventos_club (club_id, usuario_id, titulo, descripcion, fecha_evento, lugar, fecha_creacion) 
                     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [club.id, club.aEncargado, tituloEv, `Evento programado para los miembros del club ${club.nombre}.`, fechaEvento, 'Edificio 2 / Canchas']
                );

                const eventoId = evRes.insertId || evRes[0]?.insertId;
                const [inscritos] = await db.query(`SELECT usuario_id FROM inscripciones WHERE club_id = ? AND rol_en_club = 'miembro'`, [club.id]);
                const filasInscritos = Array.isArray(inscritos) ? inscritos : [];

                for (const ins of filasInscritos.slice(0, 10)) {
                    await db.query(
                        `INSERT INTO asistencias_eventos (evento_id, usuario_id, asistira, fecha_respuesta) 
                         VALUES (?, ?, ?, NOW())`,
                        [eventoId, ins.usuario_id, getRandom([1, 1, 0])]
                    );
                }
            }
        }

        console.log("⏳ 9. Generando Mensajes en Salas de Chat...");
        for (const club of clubesCreados) {
            await db.query(
                `INSERT INTO chat_mensajes (club_id, usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, ?, 'club', ?, ?)`,
                [club.id, club.pEncargado, `Bienvenidos a todos los miembros de ${club.nombre}.`, getDateOffsetStr(-3, 9, 30)]
            );
            await db.query(
                `INSERT INTO chat_mensajes (club_id, usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, ?, 'club', ?, ?)`,
                [club.id, club.aEncargado, 'Hola profesor, ya tenemos listo el material de la sesión.', getDateOffsetStr(-2, 11, 15)]
            );
            await db.query(
                `INSERT INTO chat_mensajes (usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, 'directivos', ?, ?)`,
                [club.pEncargado, `Dirección, informo que el club ${club.nombre} tiene su lista de requerimientos.`, getDateOffsetStr(-4, 12, 0)]
            );
            await db.query(
                `INSERT INTO chat_mensajes (usuario_id, tipo_sala, mensaje, fecha_envio) VALUES (?, 'encargados', ?, ?)`,
                [club.aEncargado, `Compañeros, coordinemos los horarios de los espacios comunes para ${club.nombre}.`, getDateOffsetStr(-1, 16, 20)]
            );
        }

        console.log("⏳ 10. Creando Clubes en otros estados...");
        const otrosClubes = [
            { nombre: 'Desarrollo de Videojuegos', estatus: 'esperando_firmas' },
            { nombre: 'Club de Debate', estatus: 'esperando_firmas' },
            { nombre: 'Taller de Fotografía', estatus: 'en_revision' },
            { nombre: 'Club de Ecología', estatus: 'en_revision' },
            { nombre: 'Club de Francés', estatus: 'inactivo' },
            { nombre: 'Taller de Pintura', estatus: 'inactivo' }
        ];

        for (const cInfo of otrosClubes) {
            const pEncargado = getRandom(profeIds).id;
            const aEncargado = getRandom(alumnoIds).id;

            const [clubRes] = await db.query(
                `INSERT INTO clubes (nombre, descripcion, objetivo, cronograma, detalle_actividades, espacios_tiempos, impacto, estatus, fecha_creacion) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cInfo.nombre, `Propuesta de club enfocado en ${cInfo.nombre}.`, `Fomentar el interés en ${cInfo.nombre}.`,
                    JSON.stringify([{ mes: "Septiembre", actividad: "Inicio de actividades" }]), `Actividades por definir.`,
                    `Horarios propuestos pendientes.`, `Impacto cultural.`, cInfo.estatus, getDateOffsetStr(-15)
                ]
            );
            const clubId = clubRes.insertId || clubRes[0]?.insertId;
            todosLosClubes.push({ id: clubId, nombre: cInfo.nombre, pEncargado, aEncargado });

            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_profesor', 'activo', ?)`, [clubId, pEncargado, getDateOffsetStr(-15)]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_alumno', 'activo', ?)`, [clubId, aEncargado, getDateOffsetStr(-15)]);
        }

        console.log("⏳ 11. Creando Clubes RECHAZADOS...");
        const clubesRechazados = ['Club de Literatura de Terror', 'Torneos de eSports', 'Club de Gastronomía'];
        const motivosRechazo = [
            'El cronograma está incompleto. Faltan detallar las actividades de los meses de Octubre y Noviembre.',
            'No se especificaron claramente los espacios y tiempos solicitados.',
            'La justificación del impacto académico es muy vaga.'
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
                    motivosRechazo[i], getDateOffsetStr(-40)
                ]
            );
            const clubId = clubRes.insertId || clubRes[0]?.insertId;
            todosLosClubes.push({ id: clubId, nombre: clubesRechazados[i], pEncargado, aEncargado });

            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_profesor', 'activo', ?)`, [clubId, pEncargado, getDateOffsetStr(-40)]);
            await db.query(`INSERT INTO inscripciones (club_id, usuario_id, rol_en_club, estatus, fecha_inscripcion) VALUES (?, ?, 'encargado_alumno', 'activo', ?)`, [clubId, aEncargado, getDateOffsetStr(-40)]);
        }

        console.log("⏳ 12. Inyectando Avisos Globales e Internos de Clubes...");

        // --- 1. AVISOS GLOBALES ---
        // --- 1. AVISOS GLOBALES ---
        const avisosGlobales = [
            { titulo: 'Apertura de Convocatoria de Clubes', contenido: 'Se abre el registro formal para los talleres del semestre.', prioridad: 'alta' },
            { titulo: 'Mantenimiento en Instalaciones Deportivas', contenido: 'Las canchas permanecerán en mantenimiento preventivo.', prioridad: 'normal' },
            { titulo: 'Lineamientos de Protección Civil', contenido: 'Revisar las rutas de evacuación asignadas para los laboratorios.', prioridad: 'baja' },
            { titulo: 'Feria de Clubes 2026', contenido: 'Asiste a la explanada principal para conocer todos los clubes activos e inscribirte.', prioridad: 'alta' },
            { titulo: 'Actualización de Políticas', contenido: 'Recuerden que para seguir usando la plataforma deben leer y aceptar el nuevo aviso de privacidad.', prioridad: 'alta' },
            { titulo: 'Cierre de Ciclo de Registro', contenido: 'Últimos días para aceptar invitaciones pendientes antes de que caduquen automáticamente.', prioridad: 'normal' },
            { titulo: 'Taller de Primeros Auxilios', contenido: 'Sesión obligatoria de protección civil para todos los Profesores Titulares y Alumnos Representantes.', prioridad: 'alta' },
            { titulo: 'Torneo Inter-Clubes de Ajedrez', contenido: 'Las inscripciones están abiertas en el departamento de actividades extracurriculares.', prioridad: 'normal' },
            { titulo: 'Día de la Comunidad Académica', contenido: 'Suspensión de actividades vespertinas por la celebración del aniversario institucional.', prioridad: 'alta' },
            { titulo: 'Uso de Cubículos Compartidos', contenido: 'Recordatorio para todos los clubes: es obligatorio limpiar los cubículos al terminar las sesiones.', prioridad: 'baja' },
            { titulo: 'Préstamo de Material Deportivo', contenido: 'El préstamo de balones y redes se realizará únicamente presentando credencial vigente.', prioridad: 'normal' },
            { titulo: 'Convocatoria Beca Cultural', contenido: 'Revisa los requisitos y entrega de documentos para la beca de desempeño extracurricular.', prioridad: 'alta' },
            { titulo: 'Protocolo de Emergencia Médica', contenido: 'Se solicita a los encargados revisar el directorio médico de sus clubes y verificar contactos.', prioridad: 'alta' },
            { titulo: 'Campaña de Reciclaje Institucional', contenido: 'Se han instalado contenedores especiales de acopio tecnológico frente a la biblioteca.', prioridad: 'baja' },
            { titulo: 'Credenciales Institucionales', contenido: 'Pasa a recoger tu nueva credencial física a partir del próximo lunes en gestión escolar.', prioridad: 'normal' },
            { titulo: 'Auditoría Mensual de Clubes', contenido: 'Todos los clubes activos deben asegurar que su lista de asistencias esté al día.', prioridad: 'normal' }
        ];

        for (const aviso of avisosGlobales) {
            await db.query(
                `INSERT INTO avisos (club_id, titulo, contenido, prioridad, usuario_id, activo, fecha_envio, fecha_vencimiento) 
                 VALUES (NULL, ?, ?, ?, 1, 1, ?, ?)`,
                [aviso.titulo, aviso.contenido, aviso.prioridad, getDateOffsetStr(-5), getDateOffsetStr(20)]
            );
        }

        // --- 2. AVISOS INTERNOS (Para TODOS los clubes) ---
        const plantillasAvisos = [
            { t: 'Bienvenida oficial', c: 'Les damos la bienvenida a las actividades y organización de este grupo.', p: 'normal' },
            { t: 'Revisión de Cronograma', c: 'Por favor, asegúrense de leer las actividades planificadas para el próximo mes.', p: 'alta' },
            { t: 'Cambio de dinámica temporal', c: 'Debido a cuestiones logísticas, las próximas sesiones tendrán un formato híbrido.', p: 'baja' },
            { t: 'Cierre de formatos', c: 'Es importante que todos firmen el padrón interno antes del viernes.', p: 'alta' },
            { t: 'Material de apoyo compartido', c: 'Ya se subieron a la carpeta compartida las diapositivas de introducción.', p: 'normal' }
        ];

        for (const club of todosLosClubes) {
            // Seleccionamos 3 plantillas aleatorias para llenar el muro
            const avisosSeleccionados = getRandomMultiple(plantillasAvisos, 3);

            for (let k = 0; k < avisosSeleccionados.length; k++) {
                const aviso = avisosSeleccionados[k];
                // Intercalamos la autoría entre el profesor y el alumno representante
                const autorId = (k % 2 === 0) ? club.pEncargado : club.aEncargado;
                const diasAtras = -1 * (k * 5 + 1); // Fechas de hace 1, 6 y 11 días

                await db.query(
                    `INSERT INTO avisos (club_id, titulo, contenido, prioridad, usuario_id, activo, fecha_envio, fecha_vencimiento) 
                     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
                    [
                        club.id,
                        `${aviso.t} - ${club.nombre}`,
                        aviso.c,
                        aviso.p,
                        autorId,
                        getDateOffsetStr(diasAtras),
                        getDateOffsetStr(diasAtras + 30) // Vence 30 días después de su creación
                    ]
                );
            }
        }

        console.log(`\n🎉 SEED MEGA-COMPLETO EXITOSO. Todos los muros de Avisos Internos están listos.`);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL SEED:", error);
    } finally {
        process.exit(0);
    }
};

seedMasivo();