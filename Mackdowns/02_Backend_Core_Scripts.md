# 02. Backend: Core, WebSockets y Scripts de Base de Datos

Este documento describe la configuración principal del servidor Node.js, las dependencias clave, la integración en tiempo real y los scripts de mantenimiento de la base de datos.

## 1. Configuración del Servidor y WebSockets (`server.js`)
El servidor utiliza Express y envuelve un servidor HTTP para soportar WebSockets [cite: 8].
- **CORS y Middlewares:** Configurado para aceptar todos los orígenes (`*`) y parsear JSON (`express.json()`) [cite: 8].
- **Rutas Montadas:** 
  - `/api/auth` -> Rutas de autenticación [cite: 8].
  - `/api/users` -> Rutas de usuarios [cite: 8].
  - `/api/clubes` -> Rutas de clubes [cite: 8].
  - `/api/avisos` -> Rutas de avisos [cite: 8].
- **Socket.io (Chat en Tiempo Real):** 
  - Se guarda la instancia global de WebSockets para usarla en controladores: `app.set('socketio', io)` [cite: 8].
  - **Eventos principales:** 
    - `unirse_club`: Conecta al usuario a la sala `club_{clubId}` [cite: 8].
    - `enviar_mensaje`: Recibe un payload, lo inserta en la tabla `chat_club` de la base de datos y emite `nuevo_mensaje` a todos los conectados en la sala [cite: 8].

## 2. Dependencias y Entorno (`package.json` & `.env`)
- **Variables de Entorno (`.env`):** Define el puerto (`PORT=3000`), credenciales de la DB (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), la firma secreta de JWT (`JWT_SECRET`) y la URL de la API para el frontend (`VITE_API_URL`) [cite: 2].
- **Paquetes Principales:** Utiliza `express`, `socket.io` (tiempo real), `mysql2` (conexión a base de datos), `jsonwebtoken` y `bcryptjs` (seguridad y auth), `cors`, y `dotenv` [cite: 5].

## 3. Scripts de Mantenimiento de Base de Datos
La arquitectura incluye scripts independientes para resetear y poblar la base de datos sin afectar el flujo del servidor.

### `limpiarDB.js`
- **Función:** Vacía completamente la base de datos reiniciando los IDs (TRUNCATE) [cite: 4].
- **Manejo de dependencias:** Apaga temporalmente `FOREIGN_KEY_CHECKS` para permitir el vaciado en cualquier orden, y lo vuelve a encender al finalizar [cite: 4].
- **Tablas incluidas (15 en total):** Incluye la nueva tabla `contactos_emergencia`, junto con roles, usuarios, detalles de alumnos/profesores, fichas médicas, clubes, inscripciones, historial, chats, recursos y eventos [cite: 4].

### `seed.js` (Mega Seeder Masivo)
- **Función:** Genera un entorno de pruebas hiperrealista y completo [cite: 7].
- **Datos generados:**
  - Roles base (Administrador, Alumno, Profesor) [cite: 7].
  - 1 Usuario Administrador [cite: 7].
  - 30 Profesores (con `profesores_detalles`, `fichas_medicas` y `contactos_emergencia`) [cite: 7].
  - 150 Alumnos (con `alumnos_detalles` incluyendo boleta y carrera, `fichas_medicas` y contactos múltiples) [cite: 7].
- **Lógica de Clubes:**
  - Crea clubes **Activos** con historial de encargados anteriores (con `fecha_fin`) y encargados actuales [cite: 7].
  - Inscribe miembros regulares, genera solicitudes de recursos, inserta mensajes iniciales en el chat y crea eventos con asistencias confirmadas [cite: 7].
  - Crea clubes **Rechazados** con sus respectivos motivos de rechazo detallados [cite: 7].
- **Avisos:** Genera 15 avisos globales institucionales con diferentes prioridades [cite: 7].

### `avisos_globales.js`
- **Función:** Un seeder rápido e independiente exclusivo para vaciar y generar 10 avisos institucionales en la tabla `avisos_globales` [cite: 3].
