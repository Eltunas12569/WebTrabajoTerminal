const db = require('../config/db');
const AES_KEY = process.env.AES_KEY;

const User = {
    findByEmail: async (email) => {

        const [rows] = await db.execute(
            `SELECT u.id, u.correo, u.password, u.role_id, u.verificado, u.bloqueado_hasta, u.intentos_fallidos,
                    CAST(AES_DECRYPT(u.nombres, ?) AS CHAR) AS nombres,
                    CAST(AES_DECRYPT(u.apellido_paterno, ?) AS CHAR) AS apellido_paterno,
                    CAST(AES_DECRYPT(u.apellido_materno, ?) AS CHAR) AS apellido_materno,
                    CAST(AES_DECRYPT(u.boleta, ?) AS CHAR) AS boleta,
                    CAST(AES_DECRYPT(u.num_empleado, ?) AS CHAR) AS num_empleado,
                    r.nombre AS rol_nombre
             FROM usuarios u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.correo = ?`,
            [AES_KEY, AES_KEY, AES_KEY, AES_KEY, AES_KEY, email]
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