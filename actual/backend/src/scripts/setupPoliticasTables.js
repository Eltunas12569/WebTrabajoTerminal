const db = require('../config/db');

async function setupPoliticasTables() {
    try {
        console.log("Iniciando creación de tablas para políticas legales...");

        // 1. Tabla de versiones de políticas
        await db.query(`
            CREATE TABLE IF NOT EXISTS politicas_versiones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                version VARCHAR(20) NOT NULL UNIQUE,
                titulo VARCHAR(255) NOT NULL,
                resumen_cambios TEXT NOT NULL,
                fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                activo TINYINT(1) DEFAULT 1,
                creado_por INT NULL,
                INDEX (activo),
                FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Tabla politicas_versiones verificada / creada.");

        // 2. Tabla de historial de aceptaciones de políticas (Auditoría LGPDPPSO Art. 63)
        await db.query(`
            CREATE TABLE IF NOT EXISTS historial_aceptacion_politicas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                version_aceptada VARCHAR(20) NOT NULL,
                tipo VARCHAR(50) DEFAULT 'aviso_y_terminos',
                fecha_aceptacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_origen VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                INDEX (usuario_id),
                INDEX (version_aceptada),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Tabla historial_aceptacion_politicas verificada / creada.");

        // 3. Verificar si existen las columnas de términos en usuarios
        const [columnas] = await db.query(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
        `);
        const nombresColumnas = columnas.map(c => c.COLUMN_NAME);

        if (!nombresColumnas.includes('acepta_terminos')) {
            await db.query(`ALTER TABLE usuarios ADD COLUMN acepta_terminos TINYINT(1) DEFAULT 0 AFTER acepta_privacidad`);
            console.log("✅ Columna acepta_terminos agregada a usuarios.");
        }
        if (!nombresColumnas.includes('version_terminos')) {
            await db.query(`ALTER TABLE usuarios ADD COLUMN version_terminos VARCHAR(20) DEFAULT NULL AFTER version_aviso_privacidad`);
            console.log("✅ Columna version_terminos agregada a usuarios.");
        }
        if (!nombresColumnas.includes('fecha_aceptacion_terminos')) {
            await db.query(`ALTER TABLE usuarios ADD COLUMN fecha_aceptacion_terminos DATETIME DEFAULT NULL AFTER fecha_aceptacion_privacidad`);
            console.log("✅ Columna fecha_aceptacion_terminos agregada a usuarios.");
        }

        // 4. Si la tabla politicas_versiones está vacía, insertar versión inicial 1.0
        const [versiones] = await db.query(`SELECT COUNT(*) AS total FROM politicas_versiones`);
        if (versiones[0].total === 0) {
            await db.query(`
                INSERT INTO politicas_versiones (version, titulo, resumen_cambios, fecha_publicacion, activo)
                VALUES (
                    '1.0',
                    'Versión Inicial de Términos, Condiciones y Aviso de Privacidad',
                    'Publicación fundacional del Aviso de Privacidad y Términos de Servicio bajo los lineamientos de la LGPDPPSO y la normativa del IPN.',
                    NOW(),
                    1
                )
            `);
            console.log("✅ Versión 1.0 registrada como versión inicial activa.");
        }

        // 5. Homogeneizar usuarios existentes con version 1.0 para que tengan consistencia inicial
        await db.query(`
            UPDATE usuarios 
            SET acepta_terminos = 1,
                version_terminos = COALESCE(version_aviso_privacidad, '1.0'),
                fecha_aceptacion_terminos = COALESCE(fecha_aceptacion_privacidad, NOW())
            WHERE acepta_terminos = 0 AND (acepta_privacidad = 1 OR version_aviso_privacidad IS NOT NULL);
        `);
        console.log("✅ Usuarios iniciales sincronizados.");

        console.log("🚀 Migración de tablas de políticas legales completada con éxito.");
    } catch (error) {
        console.error("❌ Error en la migración de políticas:", error);
    } finally {
        process.exit(0);
    }
}

setupPoliticasTables();
