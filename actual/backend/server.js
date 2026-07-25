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
                `INSERT INTO chat_club (club_id, usuario_id, mensaje) VALUES (?, ?, ?)`,
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