const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
const db = require('./src/config/db'); 
require('dotenv').config();

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// ==========================================
// --- CONFIGURACIÓN DE SOCKET.IO (CHAT Y NOTIFICACIONES) ---
// ==========================================
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Guardamos 'io' globalmente para usarlo en el archivo de rutas (clubes.js)
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('✅ Usuario conectado al socket:', socket.id);

    // Unirse a la sala (room) específica del club
    socket.on('unirse_club', (clubId) => {
        socket.join(`club_${clubId}`);
        console.log(`Usuario se unió al chat del club ${clubId}`);
    });

    // Recibir mensaje y reenviarlo a todos en el club
    socket.on('enviar_mensaje', async (data) => {
        const { club_id, usuario_id, mensaje, autor_nombre } = data;
        try {
            const [result] = await db.query(
                `INSERT INTO chat_club (club_id, usuario_id, mensaje) VALUES (?, ?, ?)`,
                [club_id, usuario_id, mensaje]
            );
            
            const nuevoMensaje = {
                id: result.insertId,
                club_id,
                usuario_id,
                autor_nombre,
                mensaje,
                fecha_envio: new Date().toISOString()
            };

            // Emitir el mensaje a todos los de la sala
            io.to(`club_${club_id}`).emit('nuevo_mensaje', nuevoMensaje);
        } catch (error) {
            console.error("Error guardando mensaje en socket:", error);
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

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Servidor y WebSockets corriendo en puerto ${PORT}`);
});