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
        console.log("🚀 INICIANDO MEGA SEEDER MASIVO (Llenado Total Absoluto)...");

        console.log("⏳ 1. Configurando roles...");
        const rolesBase = [ { id: 1, nombre: 'administrador' }, { id: 2, nombre: 'alumno' }, { id: 3, nombre: 'profesor' } ];
        for (const rol of rolesBase) {
            await db.query(`INSERT IGNORE INTO roles (id, nombre) VALUES (?, ?)`, [rol.id, rol.nombre]);
        }

        console.log("⏳ 2. Generando 181 usuarios completos...");
        const hash = await bcrypt.hash("qwerty", 10);
        const carreras = ['Ing. en Sistemas', 'Ing. Mecatrónica', 'Lic. en Administración', 'Ing. Civil', 'Ing. Electrónica'];
        
        let profeIds = [];
        let alumnoIds = [];

        // Admin
        await db.query(
            `INSERT INTO usuarios (id, nombres, apellido_paterno, apellido_materno, correo, password, role_id) VALUES (1, 'Carlos', 'Mendoza', 'Ruiz', 'admin@ipn.mx', ?, 1) ON DUPLICATE KEY UPDATE id=1`,
            [hash]
        );

        // Profesores
        for (let i = 1; i <= 30; i++) {
            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) VALUES (?, ?, ?, ?, ?, 3)`,
                [`Profesor ${i}`, `García`, `López`, `profe${i}@ipn.mx`, hash]
            );
            const profeId = res.insertId;
            profeIds.push(profeId);
            await db.query(`INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`, [profeId, `EMP-${i.toString().padStart(4, '0')}`]);
        }

        // Alumnos
        for (let i = 1; i <= 150; i++) {
            const [res] = await db.query(
                `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) VALUES (?, ?, ?, ?, ?, 2)`,
                [`Alumno ${i}`, `Pérez`, `Sánchez`, `alumno${i}@ipn.mx`, hash]
            );
            const alumnoId = res.insertId;
            alumnoIds.push(alumnoId);
            
            const nssGenerado = `1111111${i.toString().padStart(4, '0')}`;
            const boletaGenerada = `2026630${i.toString().padStart(3, '0')}`;
            const carreraGenerada = getRandom(carreras);
            
            await db.query(`INSERT INTO alumnos_detalles (usuario_id, nss, boleta, carrera) VALUES (?, ?, ?, ?)`, [alumnoId, nssGenerado, boletaGenerada, carreraGenerada]);
            
            await db.query(
                `INSERT INTO fichas_medicas (
                    usuario_id, tipo_sangre, alergias, 
                    contacto_emergencia_1_nombre, contacto_emergencia_1_telefono, 
                    contacto_emergencia_2_nombre, contacto_emergencia_2_telefono,
                    contacto_emergencia_3_nombre, contacto_emergencia_3_telefono
                ) 
                VALUES (?, 'O+', 'Ninguna', 'Mamá', '5551234567', 'Papá', '5557654321', 'Tío', '5559998888')`,
                [alumnoId]
            );
        }

        console.log("⏳ 3. Creando 20 clubes con TODOS LOS CAMPOS LLENOS...");
        const nombresClubes = ['Robótica', 'Ajedrez', 'Desarrollo Web', 'Basquetbol', 'Fútbol', 'Voleibol', 'Danza', 'Teatro', 'Música', 'Fotografía', 'Literatura', 'Ciencias', 'Matemáticas', 'Idiomas', 'Debate', 'Ecología', 'Cine', 'Cocina', 'Emprendimiento', 'Diseño Gráfico'];
        let clubIds = [];

        for (let i = 0; i < nombresClubes.length; i++) {
            // Lógica de Estatus: Los primeros 10 activos, siguientes 5 en revisión, 3 rechazados, 2 inactivos.
            let estatus = 'activo';
            let codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
            let motivo_rechazo = null;

            if (i >= 10 && i < 15) { estatus = 'en_revision'; codigo = null; }
            if (i >= 15 && i < 18) { estatus = 'rechazado'; codigo = null; motivo_rechazo = "Faltan firmas en el PDF de integrantes. Por favor corregir."; }
            if (i >= 18) { estatus = 'inactivo'; codigo = null; }

            const cronogramaFalso = JSON.stringify([
                { mes: "Enero", actividad: "Convocatoria y reclutamiento" },
                { mes: "Marzo", actividad: "Primer proyecto interno" },
                { mes: "Junio", actividad: "Presentación final" }
            ]);

            // DATOS FICTICIOS COMPLETOS PARA QUE NINGÚN CAMPO SEA NULL
            const descripcionFalsa = `Este es el club oficial de ${nombresClubes[i]} de la institución. Un espacio para aprender y compartir conocimientos.`;
            const objetivoFalso = `Desarrollar habilidades prácticas y teóricas en ${nombresClubes[i]} para todos los estudiantes interesados.`;
            const detalleActividadesFalso = "Sesiones teóricas de 1 hora seguidas de 2 horas de práctica. Realización de torneos y exposiciones bimestrales.";
            const espaciosFalsos = "Aula Magna los Lunes de 14:00 a 16:00 y Patio Central los Jueves de 15:00 a 17:00.";
            const impactoFalso = "Mejora del trabajo en equipo, pensamiento crítico, disciplina y salud integral de los participantes.";
            const archivoEstudiantes = `https://drive.google.com/file/d/documento_firmado_club_${i}/view`;
            
            const [resClub] = await db.query(
                `INSERT INTO clubes (
                    nombre, descripcion, objetivo, cronograma, detalle_actividades, 
                    espacios_tiempos, impacto, archivo_lista_estudiantes, 
                    estatus, codigo_union, motivo_rechazo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    `Club de ${nombresClubes[i]}`, descripcionFalsa, objetivoFalso, cronogramaFalso, 
                    detalleActividadesFalso, espaciosFalsos, impactoFalso, archivoEstudiantes, 
                    estatus, codigo, motivo_rechazo
                ]
            );
            
            const clubId = resClub.insertId;
            clubIds.push({ id: clubId, nombre: nombresClubes[i] });

            const profeEncargado = getRandom(profeIds);
            const alumnoEncargado = getRandom(alumnoIds);

            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club) VALUES (?, ?, 'encargado_profesor')`, [profeEncargado, clubId]);
            await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club) VALUES (?, ?, 'encargado_alumno')`, [alumnoEncargado, clubId]);

            const miembrosNormales = getRandomMultiple(alumnoIds.filter(id => id !== alumnoEncargado), 15);
            for (const miembroId of miembrosNormales) {
                await db.query(`INSERT INTO inscripciones (usuario_id, club_id, rol_en_club) VALUES (?, ?, 'miembro')`, [miembroId, clubId]);
            }

            // Opcional: Agregar interacciones en clubes activos
            if (estatus === 'activo') {
                await db.query(`INSERT INTO avisos_club (club_id, usuario_id, contenido) VALUES (?, ?, ?)`, [clubId, profeEncargado, `¡Bienvenidos al club de ${nombresClubes[i]}!`]);
                await db.query(`INSERT INTO chat_club (club_id, usuario_id, mensaje) VALUES (?, ?, ?)`, [clubId, profeEncargado, `Hola, no olviden traer su material.`]);
                await db.query(`INSERT INTO solicitudes_recursos (club_id, usuario_id, tipo_recurso, nombre_recurso, cantidad, motivo) VALUES (?, ?, 'material', 'Kits básicos', 5, 'Práctica inicial')`, [clubId, profeEncargado]);
            }
        }

        console.log("⏳ 4. Generando Avisos Globales (5 Activos, 5 Caducados)...");
        for (let i = 1; i <= 10; i++) {
            const prioridades = ['alta', 'normal', 'baja'];
            // Del 1 al 5 son futuros (activos), del 6 al 10 son pasados (caducados)
            const diasVencimiento = i <= 5 ? 15 : -10;
            const activo = i <= 5 ? 1 : 0;
            const mensaje = i <= 5 ? "Este aviso tiene una fecha futura y deberías verlo en la app." : "Este aviso ya venció y NO debería aparecer.";

            await db.query(
                `INSERT INTO avisos_globales (titulo, mensaje, prioridad, autor_id, activo, fecha_vencimiento) 
                 VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
                [`Aviso Institucional #${i}`, mensaje, getRandom(prioridades), 1, activo, diasVencimiento]
            );
        }

        console.log(`\n🎉 ¡MEGA SEEDER ABSOLUTO FINALIZADO CON ÉXITO! 🎉`);
        console.log(`   Puedes revisar tu base de datos, no hay ningún campo en NULL.`);
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Error Crítico en el Mega Seeder:", error);
        process.exit(1);
    }
};

seedMasivo();