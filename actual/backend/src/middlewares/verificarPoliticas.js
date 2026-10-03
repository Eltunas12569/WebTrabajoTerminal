const db = require('../config/db');

/**
 * Middleware para asegurar que ningún usuario pueda realizar operaciones en el sistema
 * si no ha aceptado la versión vigente del Aviso de Privacidad y Términos y Condiciones.
 */
let cacheVersionVigente = null;
let ultimaConsultaCache = 0;
const TIEMPO_CACHE_MS = 60 * 1000; // 1 minuto de cache para no saturar la BD en cada request

const obtenerVersionVigente = async () => {
    const ahora = Date.now();
    if (cacheVersionVigente && (ahora - ultimaConsultaCache) < TIEMPO_CACHE_MS) {
        return cacheVersionVigente;
    }
    const [filas] = await db.query(
        `SELECT version FROM politicas_versiones WHERE activo = 1 ORDER BY id DESC LIMIT 1`
    );
    cacheVersionVigente = filas[0]?.version || '1.0';
    ultimaConsultaCache = ahora;
    return cacheVersionVigente;
};

// Permite invalidar la caché inmediatamente cuando el admin publica una nueva versión
const invalidarCachePoliticas = () => {
    cacheVersionVigente = null;
    ultimaConsultaCache = 0;
};

const verificarPoliticasVigentes = async (req, res, next) => {
    // Si no hay usuario autenticado en la petición (rutas públicas), continuar
    if (!req.user || !req.user.id) {
        return next();
    }

    try {
        const versionVigente = await obtenerVersionVigente();

        const [usuarios] = await db.query(
            `SELECT version_aviso_privacidad, version_terminos, acepta_privacidad, acepta_terminos 
             FROM usuarios WHERE id = ?`,
            [req.user.id]
        );

        if (usuarios.length === 0) {
            return next();
        }

        const usuario = usuarios[0];
        const tieneVersionVigente = usuario.version_aviso_privacidad === versionVigente &&
                                   usuario.version_terminos === versionVigente &&
                                   Boolean(usuario.acepta_privacidad) &&
                                   Boolean(usuario.acepta_terminos);

        if (!tieneVersionVigente) {
            return res.status(403).json({
                code: 'POLITICAS_PENDIENTES',
                message: 'Debe aceptar la nueva versión del Aviso de Privacidad y Términos y Condiciones para utilizar la plataforma.',
                version_requerida: versionVigente,
                version_actual_usuario: usuario.version_aviso_privacidad || 'Ninguna'
            });
        }

        next();
    } catch (error) {
        console.error('Error en middleware verificarPoliticasVigentes:', error);
        // Si hay error en la comprobación, no rompemos el servidor pero lo dejamos pasar o reportamos
        next();
    }
};

module.exports = {
    verificarPoliticasVigentes,
    invalidarCachePoliticas
};
