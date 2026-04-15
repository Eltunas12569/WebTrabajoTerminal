const authService = require('../services/authService');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

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
        const { 
            nombres, 
            apellido_paterno, 
            apellido_materno, 
            nss, 
            boleta, 
            correo, 
            password, 
            rol_id, 
            carrera, 
            num_empleado 
        } = req.body;

        // Validaciones básicas
        if (!nombres || !nombres.trim()) {
            return res.status(400).json({ message: "Los nombres son requeridos" });
        }
        if (!apellido_paterno || !apellido_paterno.trim()) {
            return res.status(400).json({ message: "El apellido paterno es requerido" });
        }
        if (!nss || nss.length !== 11) {
            return res.status(400).json({ message: "El NSS debe tener exactamente 11 dígitos" });
        }
        if (!correo || !correo.trim()) {
            return res.status(400).json({ message: "El correo es requerido" });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
        }
        if (!rol_id || ![2, 3].includes(rol_id)) {
            return res.status(400).json({ message: "Rol inválido" });
        }

        // Validaciones específicas por rol
        if (rol_id === 2) { // Alumno
            if (!boleta || boleta.length !== 10) {
                return res.status(400).json({ message: "La boleta debe tener exactamente 10 dígitos para alumnos" });
            }
            if (!carrera || !carrera.trim()) {
                return res.status(400).json({ message: "La carrera es requerida para alumnos" });
            }
        } else if (rol_id === 3) { // Profesor
            if (!num_empleado || !num_empleado.trim()) {
                return res.status(400).json({ message: "El número de empleado es requerido para profesores" });
            }
        }

        // 2. Llamada al servicio para procesar el registro
        const result = await authService.register({ 
            nombres: nombres.trim(),
            apellido_paterno: apellido_paterno.trim(),
            apellido_materno: apellido_materno ? apellido_materno.trim() : null,
            correo: correo.trim().toLowerCase(),
            password,
            rol_id,
            nss: nss.trim(),
            boleta: rol_id === 2 ? boleta.trim() : null,
            carrera: rol_id === 2 ? carrera.trim() : null,
            num_empleado: rol_id === 3 ? num_empleado.trim() : null
        });

        res.status(201).json(result);
    } catch (error) {
        // Captura errores como "Correo ya registrado"
        console.error("Error en registro:", error);
        res.status(400).json({ message: error.message });
    }
};

// --- NUEVAS FUNCIONES PARA PERFIL ---

const getPerfil = async (req, res) => {
    try {
        const [users] = await db.query('SELECT nombres, apellido_paterno, apellido_materno, correo FROM usuarios WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.status(200).json(users[0]);
    } catch (error) {
        console.error("Error en getPerfil:", error);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
};

const updatePerfil = async (req, res) => {
    try {
        const { nombres, apellido_paterno, apellido_materno, currentPassword, newPassword } = req.body;
        
        // 1. Actualizar datos básicos
        await db.query(
            'UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ? WHERE id = ?',
            [nombres, apellido_paterno, apellido_materno, req.user.id]
        );

        // 2. Si el usuario ingresó contraseñas para cambiarlas
        if (currentPassword && newPassword) {
            const [users] = await db.query('SELECT password FROM usuarios WHERE id = ?', [req.user.id]);
            if (users.length > 0) {
                const isMatch = await bcrypt.compare(currentPassword, users[0].password);
                if (!isMatch) {
                    return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
                }
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(newPassword, salt);
                await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
            }
        }

        res.status(200).json({ message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error("Error en updatePerfil:", error);
        res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
};

// EXPORTACIÓN UNIFICADA: Esto evita el ReferenceError al iniciar el servidor
module.exports = { login, register, getPerfil, updatePerfil };