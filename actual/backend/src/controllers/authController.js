const authService = require('../services/authService');

/**
 * Controlador de Autenticación
 * Maneja las peticiones HTTP para Login y Registro
 */

const login = async (req, res) => {
    try {
        console.log("Intento de login recibido:", req.body); 

        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ 
                message: 'Correo y contraseña son requeridos'
            });
        }

        const result = await authService.login(correo, password);

        // Envía el token y datos del usuario (nombres, apellidos, role_id)
        res.status(200).json(result);

    } catch (error) {
        // Retorna errores de credenciales o bloqueos de seguridad
        res.status(401).json({ message: error.message });
    }
};

const register = async (req, res) => {
    try {
        console.log("Datos de registro recibidos:", req.body);
        const { nombres, apellidos, nss, boleta, correo, password } = req.body;

        // 1. Validaciones de longitud institucional para ESCOM
        if (!nss || nss.length !== 11) {
            return res.status(400).json({ message: "El NSS debe tener exactamente 11 dígitos" });
        }
        if (!boleta || boleta.length !== 10) {
            return res.status(400).json({ message: "La boleta debe tener exactamente 10 dígitos" });
        }

        // 2. Llamada al servicio para procesar el registro
        // El servicio se encargará de verificar duplicados y encriptar la contraseña
        const result = await authService.register({ 
            nombres, 
            apellidos, 
            nss, 
            boleta, 
            correo, 
            password 
        });

        res.status(201).json(result);
    } catch (error) {
        // Captura errores como "Correo ya registrado"
        res.status(400).json({ message: error.message });
    }
};

// EXPORTACIÓN UNIFICADA: Esto evita el ReferenceError al iniciar el servidor
module.exports = { login, register };