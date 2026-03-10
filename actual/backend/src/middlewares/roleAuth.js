const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        // req.user viene del middleware anterior (verifyToken)
        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ 
                message: `Acceso denegado: Se requiere rol de ${rolesPermitidos.join(' o ')}` 
            });
        }
        next();
    };
};

module.exports = checkRole;