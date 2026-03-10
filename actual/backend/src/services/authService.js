const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Servicio de Autenticación con Seguridad Reforzada (RBAC + Anti-Fuerza Bruta)
 */

// --- FUNCIÓN DE LOGIN ---
const login = async (correo, password) => {
    // 1. Buscamos al usuario en la base de datos
    const user = await User.findByEmail(correo);
    
    if (!user) {
        throw new Error('El correo electrónico no está registrado');
    }

    // 2. Verificación de Bloqueo por seguridad
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        const tiempoRestante = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 60000);
        throw new Error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${tiempoRestante} minutos.`);
    }

    // 3. Comparación de contraseña (Bcrypt)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        await User.registrarIntentoFallido(user.id);
        const intentosRestantes = 5 - (user.intentos_fallidos + 1);
        
        if (intentosRestantes <= 0) {
            throw new Error('Has superado el límite de intentos. Cuenta bloqueada por seguridad.');
        }
        throw new Error(`Contraseña incorrecta. Intentos restantes: ${intentosRestantes}`);
    }

    // 4. Login Exitoso: Reset de seguridad
    await User.resetearIntentos(user.id);

    // 5. Generación del JWT
    const token = jwt.sign(
        { id: user.id, rol: user.role_id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '8h' } 
    );

    return {
        token,
        user: {
            id: user.id,
            nombres: user.nombres,
            apellidos: user.apellidos,
            rol: user.role_id,
            boleta: user.boleta
        }
    };
};

// --- NUEVA FUNCIÓN DE REGISTRO ---
const register = async (userData) => {
    const { nombres, apellidos, nss, boleta, correo, password } = userData;

    // 1. Encriptación de la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Llamada al modelo para insertar en la DB
    // El role_id 4 corresponde al rol de 'alumno' según tu tabla de roles
    await User.create(
        nombres, 
        apellidos, 
        nss, 
        boleta, 
        correo, 
        passwordHash, 
        4 
    );

    return { message: "Usuario creado exitosamente" };
};

// EXPORTACIÓN UNIFICADA: Vital para evitar ReferenceErrors en el controlador
module.exports = { login, register };