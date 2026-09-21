const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const limitadorPeticiones = require('express-rate-limit');
const { Server } = require('socket.io');
const db = require('./src/config/db');
require('dotenv').config();

const app = express();

// ==========================================
// --- CORS: lista blanca de orígenes permitidos ---
// ==========================================
const origenesPermitidos = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origen => origen.trim())
    : ['http://localhost:5173']; 

const opcionesCors = {
    origin: (origenSolicitante, callback) => {
        if (!origenSolicitante || origenesPermitidos.includes(origenSolicitante)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por política de CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};

app.use(cors(opcionesCors));
app.use(express.json({ limit: '1mb' }));




// ==========================================
// --- RATE LIMITING GLOBAL ---
// ==========================================
const limitadorGeneral = limitadorPeticiones({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: 'Demasiadas peticiones desde esta IP. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limitadorGeneral);

const limitadorLogin = limitadorPeticiones({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Demasiados intentos de inicio de sesión. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/auth/login', limitadorLogin);

// ==========================================
// --- CONFIGURACIÓN DE SOCKET.IO (CHAT Y NOTIFICACIONES) ---
// ==========================================
const server = http.createServer(app);
const io = new Server(server, {
    cors: opcionesCors
});

app.set('socketio', io);

// Rechaza cualquier conexión de socket que no traiga un JWT válido.
io.use(async (socket, siguiente) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return siguiente(new Error('Autenticación requerida'));
    }
    try {
        const datosDecodificados = jwt.verify(token, process.env.JWT_SECRET);

        const [filasUsuario] = await db.query(
            `SELECT nombres, apellido_paterno FROM usuarios WHERE id = ?`,
            [datosDecodificados.id]
        );
        if (filasUsuario.length === 0) {
            return siguiente(new Error('Usuario no encontrado'));
        }

        socket.datosUsuario = {
            id: datosDecodificados.id,
            rol: datosDecodificados.rol,
            nombreCompleto: `${filasUsuario[0].nombres} ${filasUsuario[0].apellido_paterno}`
        };
        siguiente();
    } catch (error) {
        siguiente(new Error('Token inválido o expirado'));
    }
});

io.on('connection', (socket) => {
    console.log('✅ Usuario conectado al socket:', socket.id, '- Usuario:', socket.datosUsuario.id);

    socket.on('unirse_club', async (idClub) => {
        try {
            if (socket.datosUsuario.rol !== 1) {
                const [inscripcionActiva] = await db.query(
                    `SELECT id FROM inscripciones WHERE usuario_id = ? AND club_id = ? AND estatus = 'activo' LIMIT 1`,
                    [socket.datosUsuario.id, idClub]
                );
                if (inscripcionActiva.length === 0) {
                    return socket.emit('error_socket', 'No perteneces a este club');
                }
            }
            socket.join(`club_${idClub}`);
            console.log(`Usuario ${socket.datosUsuario.id} se unió al chat del club ${idClub}`);
        } catch (error) {
            console.error('Error al verificar pertenencia al club:', error);
            socket.emit('error_socket', 'Error al unirse al club');
        }
    });

    socket.on('enviar_mensaje', async (data) => {
        const { club_id: idClub, mensaje } = data;
        try {
            const [resultado] = await db.query(
                `INSERT INTO chat_mensajes (club_id, usuario_id, tipo_sala, mensaje) VALUES (?, ?, 'club', ?)`,
                [idClub, socket.datosUsuario.id, mensaje]
            );
            const nuevoMensaje = {
                id: resultado.insertId,
                club_id: idClub,
                usuario_id: socket.datosUsuario.id,
                autor_nombre: socket.datosUsuario.nombreCompleto,
                mensaje,
                fecha_envio: new Date().toISOString()
            };

            io.to(`club_${idClub}`).emit('nuevo_mensaje', nuevoMensaje);
        } catch (error) {
            console.error('Error guardando mensaje en socket:', error);
        }
    });


    socket.on('unirse_chat_directivos', async () => {
        try {
            if (socket.datosUsuario.rol !== 1) {
                const [esEncargado] = await db.query(
                    `SELECT id FROM inscripciones 
                     WHERE usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo' LIMIT 1`,
                    [socket.datosUsuario.id]
                );
                if (esEncargado.length === 0) {
                    return socket.emit('error_socket', 'Acceso denegado: No eres encargado ni administrador');
                }
            }
            socket.join('sala_directivos');
            console.log(`Usuario ${socket.datosUsuario.id} se unió al chat de directivos`);
        } catch (error) {
            console.error('Error al verificar permisos de directivos:', error);
            socket.emit('error_socket', 'Error al unirse al chat de directivos');
        }
    });

    socket.on('enviar_mensaje_directivos', async (data) => {
        const { mensaje } = data;
        try {
            // Guardar en la nueva tabla
            const [resultado] = await db.query(
                `INSERT INTO chat_mensajes (usuario_id, tipo_sala, mensaje) VALUES (?, 'directivos', ?)`,
                [socket.datosUsuario.id, mensaje]
            );

            // Obtener a qué clubes representa para la etiqueta en vivo
            const [etiquetas] = await db.query(`
                SELECT GROUP_CONCAT(DISTINCT CONCAT(
                    IF(i.rol_en_club = 'encargado_profesor', 'Profe Titular', 'Alumno Rep.'), 
                    ' - ', cl.nombre
                ) SEPARATOR ', ') AS etiqueta_encargado
                FROM inscripciones i
                JOIN clubes cl ON i.club_id = cl.id
                WHERE i.usuario_id = ? AND i.rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND i.estatus = 'activo'
            `, [socket.datosUsuario.id]);

            const etiqueta = etiquetas[0]?.etiqueta_encargado || null;

            // Armar el payload para los clientes
            const nuevoMensaje = {
                id: resultado.insertId,
                usuario_id: socket.datosUsuario.id,
                autor_nombre: socket.datosUsuario.nombreCompleto,
                rol_usuario: socket.datosUsuario.rol, 
                etiqueta_encargado: etiqueta, // NUEVO
                mensaje,
                fecha_envio: new Date().toISOString()
            };

            // Emitir solo a los que están en la sala
            io.to('sala_directivos').emit('nuevo_mensaje_directivos', nuevoMensaje);
        } catch (error) {
            console.error('Error guardando mensaje de directivos:', error);
        }
    });


    // ==========================================
    // --- NUEVO: CHAT EXCLUSIVO DE ENCARGADOS ---
    // ==========================================
    socket.on('unirse_chat_encargados', async () => {
        try {
            const [esEncargado] = await db.query(
                `SELECT id FROM inscripciones 
                 WHERE usuario_id = ? AND rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND estatus = 'activo' LIMIT 1`,
                [socket.datosUsuario.id]
            );
            if (esEncargado.length === 0) {
                return socket.emit('error_socket', 'Acceso denegado: Exclusivo para encargados de clubes');
            }
            socket.join('sala_encargados');
        } catch (error) {
            console.error('Error al verificar permisos de encargados:', error);
            socket.emit('error_socket', 'Error al unirse al chat de encargados');
        }
    });

    socket.on('enviar_mensaje_encargados', async (data) => {
        const { mensaje } = data;
        try {
            const [resultado] = await db.query(
                `INSERT INTO chat_mensajes (usuario_id, tipo_sala, mensaje) VALUES (?, 'encargados', ?)`,
                [socket.datosUsuario.id, mensaje]
            );

            // Extraer a qué club(es) representa
            const [etiquetas] = await db.query(`
                SELECT GROUP_CONCAT(DISTINCT CONCAT(
                    IF(i.rol_en_club = 'encargado_profesor', 'Profe Titular', 'Alumno Rep.'), 
                    ' - ', cl.nombre
                ) SEPARATOR ', ') AS etiqueta_encargado
                FROM inscripciones i
                JOIN clubes cl ON i.club_id = cl.id
                WHERE i.usuario_id = ? AND i.rol_en_club IN ('encargado_profesor', 'encargado_alumno') AND i.estatus = 'activo'
            `, [socket.datosUsuario.id]);

            const nuevoMensaje = {
                id: resultado.insertId,
                usuario_id: socket.datosUsuario.id,
                autor_nombre: socket.datosUsuario.nombreCompleto,
                rol_usuario: socket.datosUsuario.rol,
                etiqueta_encargado: etiquetas[0]?.etiqueta_encargado || null,
                mensaje,
                fecha_envio: new Date().toISOString()
            };

            io.to('sala_encargados').emit('nuevo_mensaje_encargados', nuevoMensaje);
        } catch (error) {
            console.error('Error guardando mensaje de encargados:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Usuario desconectado:', socket.id);
    });
});

// ==========================================
// --- REGISTRO DE RUTAS API REST ---
// ==========================================
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/clubes', require('./src/routes/clubes'));
app.use('/api/avisos', require('./src/routes/avisos'));

const PUERTO = process.env.PORT || 3000;

server.listen(PUERTO, () => {
    console.log(`🚀 Servidor y WebSockets corriendo en puerto ${PUERTO}`);
});