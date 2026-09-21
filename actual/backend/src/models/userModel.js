const db = require('../config/db');

const User = {
    findByEmail: async (email) => {

        const [rows] = await db.execute(
            `SELECT u.*, r.nombre AS rol_nombre
             FROM usuarios u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.correo = ?`, 
            [email]
        );
        return rows[0];
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

module.exports = User;