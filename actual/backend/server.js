const express = require('express');
const cors = require('cors');
// Carga las variables del archivo .env (PORT, DB_HOST, etc.)
require('dotenv').config();

// 1. Importación de rutas
// Asegúrate de que los archivos existan en la carpeta 'src/routes/'
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const clubRoutes = require('./src/routes/clubes'); 
const avisoRoutes = require('./src/routes/avisos'); 

const app = express();

// 2. Configuración de CORS
// Permite que tu Frontend en el puerto 5173 acceda a la API
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Middleware para entender formatos JSON en las peticiones
app.use(express.json());

// 3. Registro de Endpoints (Rutas de la API)
// Estas rutas conectan tu lógica con la base de datos sistema_tt
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Asegúrate de que esta línea esté presente
app.use('/api/clubes', clubRoutes);
app.use('/api/avisos', avisoRoutes);

// 4. Configuración del Puerto
// Usa el puerto definido en el .env, si no existe usa el 3000 por defecto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`📡 Conectado a la base de datos: ${process.env.DB_NAME}`);
});