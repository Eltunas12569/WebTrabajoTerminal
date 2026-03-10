const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Obtenemos el token del encabezado de la petición
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

    if (!token) {
        return res.status(403).json({ message: 'No se proporcionó un token de acceso' });
    }

    try {
        // 2. Verificamos que el token sea auténtico con nuestra clave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Guardamos los datos del usuario (id y rol) en el objeto 'req'
        // Esto permite que las siguientes capas sepan quién está operando
        req.user = decoded;
        
        next(); // Continuar a la siguiente función
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

module.exports = verifyToken;