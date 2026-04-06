const db = require('../config/db');

const User = {
    findByEmail: async (email) => {
        const [rows] = await db.execute(
            `SELECT u.*, r.nombre AS rol_nombre,
                    ad.nss, COALESCE(ad.boleta, pd.num_empleado) AS boleta
             FROM usuarios u 
             JOIN roles r ON u.role_id = r.id 
             LEFT JOIN alumnos_detalles ad ON u.id = ad.usuario_id
             LEFT JOIN profesores_detalles pd ON u.id = pd.usuario_id
             WHERE u.correo = ?`, 
            [email]
        );
        return rows[0];
    },

    create: async (nombres, apellidos, nss, boleta, correo, passwordHash, roleId) => {
        const actualRoleId = roleId || 4;
        const [result] = await db.execute(
            `INSERT INTO usuarios (nombres, apellidos, correo, password, role_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [nombres, apellidos, correo, passwordHash, actualRoleId]
        );
        const userId = result.insertId;

        if (actualRoleId === 2) {
            await db.execute(
                `INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`,
                [userId, boleta]
            );
        } else {
            await db.execute(
                `INSERT INTO alumnos_detalles (usuario_id, nss, boleta) VALUES (?, ?, ?)`,
                [userId, nss, boleta]
            );
        }
        return userId;
    },

    registrarIntentoFallido: async (id) => {
        return await db.execute(
            `UPDATE usuarios 
             SET intentos_fallidos = intentos_fallidos + 1,
                 bloqueado_hasta = IF(intentos_fallidos + 1 >= 5, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NULL)
             WHERE id = ?`,
            [id]
        );
    },

    resetearIntentos: async (id) => {
        return await db.execute(
            'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
            [id]
        );
    }
};

// EXPORTACIÓN CORRECTA PARA EL MODELO
module.exports = User;