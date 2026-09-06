const db = require('../config/db');

const requireVerificado = async (req, res, next) => {
    try {
        const usuarioId = req.user.id;
        const [rows] = await db.query('SELECT verificado FROM usuarios WHERE id = ?', [usuarioId]);

        if (rows.length === 0 || rows[0].verificado !== 1) {
            return res.status(403).json({
                error: 'Cuenta no verificada',
                codigo: 'CUENTA_NO_VERIFICADA',
                mensaje: 'Debes verificar tu correo institucional para poder realizar esta acción.'
            });
        }
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Error al comprobar estado de la cuenta' });
    }
};

module.exports = requireVerificado;