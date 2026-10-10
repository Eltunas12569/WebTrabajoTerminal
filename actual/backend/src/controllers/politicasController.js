const db = require('../config/db');
const { invalidarCachePoliticas } = require('../middlewares/verificarPoliticas');

/**
 * Controlador de Políticas Legales (Aviso de Privacidad y Términos y Condiciones)
 * Garantiza cumplimiento estricto con los Artículos 28, 31, 43, 63 y 250 de la LGPDPPSO.
 */

// 1. Obtener la versión activa del Aviso de Privacidad y Términos con métricas de aceptación
const obtenerPoliticaActiva = async (req, res) => {
    try {
        const [filas] = await db.query(`
            SELECT id, version, titulo, resumen_cambios, fecha_publicacion, activo 
            FROM politicas_versiones 
            WHERE activo = 1 
            ORDER BY id DESC LIMIT 1
        `);

        const politica = filas.length > 0 ? filas[0] : {
            version: '1.1',
            titulo: 'Aviso de Privacidad y Términos de Servicio',
            resumen_cambios: 'Versión vigente de políticas institucionales.',
            fecha_publicacion: new Date(),
            activo: 1
        };

        const versionVigente = politica.version || '1.1';

        const [totalUsuarios] = await db.query(`SELECT COUNT(*) AS total FROM usuarios`);
        const [usuariosAceptados] = await db.query(`
            SELECT COUNT(*) AS total FROM usuarios 
            WHERE version_aviso_privacidad = ? 
              AND acepta_privacidad = 1
        `, [versionVigente]);

        const total = totalUsuarios[0]?.total || 0;
        const aceptados = usuariosAceptados[0]?.total || 0;
        const faltantes = Math.max(0, total - aceptados);

        res.status(200).json({
            ...politica,
            version_actual: versionVigente,
            usuarios_aceptados: aceptados,
            usuarios_faltantes: faltantes,
            total_usuarios: total
        });
    } catch (error) {
        console.error('Error al obtener política activa con métricas:', error);
        res.status(500).json({ message: 'Error interno al consultar la versión de políticas' });
    }
};

// 2. Verificar el estado de aceptación del usuario en sesión
const obtenerEstadoUsuario = async (req, res) => {
    try {
        const [politicaActiva] = await db.query(`
            SELECT id, version, titulo, resumen_cambios, fecha_publicacion 
            FROM politicas_versiones 
            WHERE activo = 1 
            ORDER BY id DESC LIMIT 1
        `);
        const versionVigente = politicaActiva[0]?.version || '1.0';

        const [usuarios] = await db.query(`
            SELECT id, version_aviso_privacidad, version_terminos, acepta_privacidad, acepta_terminos, fecha_aceptacion_privacidad
            FROM usuarios WHERE id = ?
        `, [req.user.id]);

        if (usuarios.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const usuario = usuarios[0];

        const alDia = usuario.version_aviso_privacidad === versionVigente &&
                      usuario.version_terminos === versionVigente &&
                      Boolean(usuario.acepta_privacidad) &&
                      Boolean(usuario.acepta_terminos);

        res.status(200).json({
            al_dia: alDia,
            version_actual: versionVigente,
            version_usuario_privacidad: usuario.version_aviso_privacidad,
            version_usuario_terminos: usuario.version_terminos,
            fecha_aceptacion: usuario.fecha_aceptacion_privacidad,
            politica_actual: politicaActiva[0] || {
                version: '1.0',
                titulo: 'Aviso de Privacidad y Términos de Servicio',
                resumen_cambios: 'Versión vigente.'
            }
        });
    } catch (error) {
        console.error('Error al consultar estado de políticas del usuario:', error);
        res.status(500).json({ message: 'Error interno al consultar estatus de políticas' });
    }
};

// 3. Registrar la aceptación expresa de las nuevas políticas
const aceptarPoliticas = async (req, res) => {
    try {
        const { version, acepta_aviso, acepta_terminos } = req.body;

        if (acepta_aviso !== true || acepta_terminos !== true) {
            return res.status(400).json({
                message: 'Debe aceptar expresamente tanto el Aviso de Privacidad como los Términos y Condiciones.'
            });
        }

        const [politicaActiva] = await db.query(`
            SELECT version FROM politicas_versiones WHERE activo = 1 ORDER BY id DESC LIMIT 1
        `);
        const versionVigente = politicaActiva[0]?.version || '1.0';

        if (version && String(version) !== String(versionVigente)) {
            return res.status(400).json({
                message: `La versión especificada (${version}) no corresponde a la versión vigente en el sistema (${versionVigente}).`
            });
        }

        const versionAceptada = versionVigente;

        // Actualizar datos del usuario
        await db.query(`
            UPDATE usuarios 
            SET version_aviso_privacidad = ?,
                version_terminos = ?,
                acepta_privacidad = 1,
                acepta_terminos = 1,
                fecha_aceptacion_privacidad = NOW(),
                fecha_aceptacion_terminos = NOW()
            WHERE id = ?
        `, [versionAceptada, versionAceptada, req.user.id]);

        // Registrar en bitácora inalterable de auditoría (LGPDPPSO Art. 63)
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;

        await db.query(`
            INSERT INTO historial_aceptacion_politicas 
            (usuario_id, version_aceptada, tipo, fecha_aceptacion, ip_origen, user_agent)
            VALUES (?, ?, 'aviso_y_terminos', NOW(), ?, ?)
        `, [req.user.id, versionAceptada, ip, userAgent ? userAgent.substring(0, 255) : null]);

        res.status(200).json({
            success: true,
            message: 'Términos y condiciones y Aviso de Privacidad aceptados exitosamente.',
            version: versionAceptada
        });
    } catch (error) {
        console.error('Error al registrar aceptación de políticas:', error);
        res.status(500).json({ message: 'Error interno al registrar la aceptación' });
    }
};

// 4. Actualizar versión de políticas y detonar alerta global (Solo Administrador)
const actualizarVersionPolitica = async (req, res) => {
    try {
        const { version, titulo, resumen_cambios } = req.body;

        if (!version || !version.trim()) {
            return res.status(400).json({ message: 'El número de versión es obligatorio (ej. 1.2 o 2.0).' });
        }
        if (!titulo || !titulo.trim()) {
            return res.status(400).json({ message: 'El título de la actualización es obligatorio.' });
        }
        if (!resumen_cambios || !resumen_cambios.trim()) {
            return res.status(400).json({ message: 'El resumen explicativo de los cambios es obligatorio.' });
        }

        const versionLimpia = version.trim();

        // Verificar si la versión ya existe
        const [existente] = await db.query(
            `SELECT id FROM politicas_versiones WHERE version = ?`,
            [versionLimpia]
        );
        if (existente.length > 0) {
            return res.status(400).json({
                message: `La versión ${versionLimpia} ya ha sido registrada previamente. Indique un identificador de versión distinto.`
            });
        }

        // Desactivar versiones activas anteriores
        await db.query(`UPDATE politicas_versiones SET activo = 0 WHERE activo = 1`);

        // Registrar la nueva versión
        const [resultado] = await db.query(`
            INSERT INTO politicas_versiones (version, titulo, resumen_cambios, fecha_publicacion, activo, creado_por)
            VALUES (?, ?, ?, NOW(), 1, ?)
        `, [versionLimpia, titulo.trim(), resumen_cambios.trim(), req.user.id]);

        // Registrar la aceptación del administrador como autor de la versión
        await db.query(`
            UPDATE usuarios 
            SET version_aviso_privacidad = ?,
                version_terminos = ?,
                acepta_privacidad = 1,
                acepta_terminos = 1,
                fecha_aceptacion_privacidad = NOW(),
                fecha_aceptacion_terminos = NOW()
            WHERE id = ?
        `, [versionLimpia, versionLimpia, req.user.id]);

        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        await db.query(`
            INSERT INTO historial_aceptacion_politicas 
            (usuario_id, version_aceptada, tipo, fecha_aceptacion, ip_origen, user_agent)
            VALUES (?, ?, 'publicacion_y_aceptacion_admin', NOW(), ?, ?)
        `, [req.user.id, versionLimpia, ip, userAgent ? userAgent.substring(0, 255) : null]);

        const nuevaPolitica = {
            id: resultado.insertId,
            version: versionLimpia,
            titulo: titulo.trim(),
            resumen_cambios: resumen_cambios.trim(),
            fecha_publicacion: new Date()
        };

        // =========================================================================
        // --- DETONAR ALERTA EN TIEMPO REAL VÍA SOCKET.IO A TODOS LOS USUARIOS ---
        // =========================================================================
        const io = req.app.get('socketio');
        if (io) {
            io.emit('actualizacion_politicas_requerida', {
                version: nuevaPolitica.version,
                titulo: nuevaPolitica.titulo,
                resumen_cambios: nuevaPolitica.resumen_cambios,
                fecha_publicacion: nuevaPolitica.fecha_publicacion
            });
        }
        invalidarCachePoliticas();

        res.status(201).json({
            success: true,
            message: `Versión ${nuevaPolitica.version} publicada exitosamente. Se ha emitido la alerta obligatoria a todos los usuarios.`,
            politica: nuevaPolitica
        });
    } catch (error) {
        console.error('Error al actualizar versión de políticas:', error);
        res.status(500).json({ message: 'Error interno al actualizar versión de políticas' });
    }
};

// 5. Estadísticas de cumplimiento y auditoría de políticas (Solo Administrador)
const obtenerHistorialYEstadisticas = async (req, res) => {
    try {
        const [versiones] = await db.query(`
            SELECT pv.*, CONCAT(u.nombres, ' ', u.apellido_paterno) AS autor
            FROM politicas_versiones pv
            LEFT JOIN usuarios u ON pv.creado_por = u.id
            ORDER BY pv.id DESC
        `);

        const [politicaActiva] = await db.query(`
            SELECT version FROM politicas_versiones WHERE activo = 1 ORDER BY id DESC LIMIT 1
        `);
        const versionVigente = politicaActiva[0]?.version || '1.0';

        const [totalUsuarios] = await db.query(`
            SELECT COUNT(*) AS total FROM usuarios
        `);
        const [usuariosAceptados] = await db.query(`
            SELECT COUNT(*) AS total FROM usuarios 
            WHERE version_aviso_privacidad = ? 
              AND version_terminos = ?
              AND acepta_privacidad = 1 
              AND acepta_terminos = 1
        `, [versionVigente, versionVigente]);

        const total = totalUsuarios[0]?.total || 0;
        const aceptados = usuariosAceptados[0]?.total || 0;
        const pendientes = Math.max(0, total - aceptados);
        const porcentaje = total > 0 ? Math.round((aceptados / total) * 100) : 100;

        const [ultimasAceptaciones] = await db.query(`
            SELECT hap.id, hap.version_aceptada, hap.fecha_aceptacion, hap.ip_origen,
                   CONCAT(u.nombres, ' ', u.apellido_paterno) AS nombre_usuario,
                   u.correo, u.role_id
            FROM historial_aceptacion_politicas hap
            JOIN usuarios u ON hap.usuario_id = u.id
            ORDER BY hap.id DESC LIMIT 15
        `);

        res.status(200).json({
            version_vigente: versionVigente,
            estadisticas: {
                total_usuarios: total,
                usuarios_al_dia: aceptados,
                usuarios_pendientes: pendientes,
                porcentaje_cumplimiento: porcentaje
            },
            versiones,
            ultimas_aceptaciones: ultimasAceptaciones
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de políticas:', error);
        res.status(500).json({ message: 'Error interno al consultar estadísticas' });
    }
};

module.exports = {
    obtenerPoliticaActiva,
    obtenerEstadoUsuario,
    aceptarPoliticas,
    actualizarVersionPolitica,
    obtenerHistorialYEstadisticas
};
