const authService = require('../services/authService');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
    try {
        console.log("Intento de login recibido:", req.body); 

        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
        }

        const result = await authService.login(correo, password);
        res.status(200).json(result);

    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

const register = async (req, res) => {
    try {
        console.log("Datos de registro recibidos:", req.body);
        const { 
            nombres, apellido_paterno, apellido_materno, 
            nss, boleta, correo, password, rol_id, 
            carrera, num_empleado 
        } = req.body;

        // Validaciones básicas generales
        if (!nombres || !nombres.trim()) return res.status(400).json({ message: "Los nombres son requeridos" });
        if (!apellido_paterno || !apellido_paterno.trim()) return res.status(400).json({ message: "El apellido paterno es requerido" });
        if (!correo || !correo.trim()) return res.status(400).json({ message: "El correo es requerido" });
        if (!password || password.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
        if (!rol_id || ![2, 3].includes(rol_id)) return res.status(400).json({ message: "Rol inválido" });

        const correoLimpio = correo.trim().toLowerCase();

        // Validaciones específicas por rol
        if (rol_id === 2) { // Alumno
            if (!correoLimpio.endsWith('@alumno.ipn.mx')) {
                return res.status(400).json({ message: "El correo del alumno debe terminar en @alumno.ipn.mx" });
            }
            if (!nss || nss.length !== 11) {
                return res.status(400).json({ message: "El NSS debe tener exactamente 11 dígitos" });
            }
            if (!boleta || boleta.length !== 10) {
                return res.status(400).json({ message: "La boleta debe tener exactamente 10 dígitos para alumnos" });
            }
            if (!carrera || !carrera.trim()) {
                return res.status(400).json({ message: "La carrera es requerida para alumnos" });
            }
        } else if (rol_id === 3) { // Profesor
            // Se valida que sea @ipn.mx pero que NO sea el de alumno
            if (!correoLimpio.endsWith('@ipn.mx') || correoLimpio.endsWith('@alumno.ipn.mx')) {
                return res.status(400).json({ message: "El correo del profesor debe terminar en @ipn.mx" });
            }
            if (!num_empleado || !num_empleado.trim()) {
                return res.status(400).json({ message: "El número de empleado es requerido para profesores" });
            }
        }

        const result = await authService.register({ 
            nombres: nombres.trim(),
            apellido_paterno: apellido_paterno.trim(),
            apellido_materno: apellido_materno ? apellido_materno.trim() : null,
            correo: correoLimpio,
            password,
            rol_id,
            nss: rol_id === 2 && nss ? nss.trim() : null,
            boleta: rol_id === 2 && boleta ? boleta.trim() : null,
            carrera: rol_id === 2 && carrera ? carrera.trim() : null,
            num_empleado: rol_id === 3 && num_empleado ? num_empleado.trim() : null
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(400).json({ message: error.message });
    }
};

const getPerfil = async (req, res) => {
    try {
        const [users] = await db.query('SELECT nombres, apellido_paterno, apellido_materno, correo FROM usuarios WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        
        // Obtener ficha médica y contactos de emergencia si existen
        const [fichas] = await db.query('SELECT * FROM fichas_medicas WHERE usuario_id = ?', [req.user.id]);
        let ficha_medica = null;
        
        if (fichas.length > 0) {
            ficha_medica = {
                tipo_sangre: fichas[0].tipo_sangre,
                alergias: fichas[0].condiciones_preexistentes || ''
            };

            // Consultar tabla de contactos relacionales
            const [contactos] = await db.query('SELECT nombre, telefono FROM contactos_emergencia WHERE usuario_id = ? ORDER BY id ASC LIMIT 3', [req.user.id]);

            if (contactos[0]) {
                ficha_medica.contacto_emergencia_1_nombre = contactos[0].nombre;
                ficha_medica.contacto_emergencia_1_telefono = contactos[0].telefono;
            }
            if (contactos[1]) {
                ficha_medica.contacto_emergencia_2_nombre = contactos[1].nombre;
                ficha_medica.contacto_emergencia_2_telefono = contactos[1].telefono;
            }
            if (contactos[2]) {
                ficha_medica.contacto_emergencia_3_nombre = contactos[2].nombre;
                ficha_medica.contacto_emergencia_3_telefono = contactos[2].telefono;
            }
        }
        
        res.status(200).json({ ...users[0], ficha_medica });
    } catch (error) {
        console.error("Error en getPerfil:", error);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
};

const updatePerfil = async (req, res) => {
    try {
        const { 
            nombres, apellido_paterno, apellido_materno, currentPassword, newPassword,
            tipo_sangre, alergias, 
            contacto_emergencia_1_nombre, contacto_emergencia_1_telefono,
            contacto_emergencia_2_nombre, contacto_emergencia_2_telefono,
            contacto_emergencia_3_nombre, contacto_emergencia_3_telefono
        } = req.body;
        
        await db.query(
            'UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ? WHERE id = ?',
            [nombres, apellido_paterno, apellido_materno, req.user.id]
        );

        if (currentPassword && newPassword) {
            const [users] = await db.query('SELECT password FROM usuarios WHERE id = ?', [req.user.id]);
            if (users.length > 0) {
                const isMatch = await bcrypt.compare(currentPassword, users[0].password);
                if (!isMatch) return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
                
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(newPassword, salt);
                await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
            }
        }

        // 3. Actualizar o insertar ficha médica
        const [fichas] = await db.query('SELECT id FROM fichas_medicas WHERE usuario_id = ?', [req.user.id]);
        if (fichas.length > 0) {
            await db.query(
                `UPDATE fichas_medicas SET tipo_sangre = ?, condiciones_preexistentes = ? WHERE usuario_id = ?`,
                [tipo_sangre, alergias, req.user.id]
            );
        } else {
            await db.query(
                `INSERT INTO fichas_medicas (usuario_id, tipo_sangre, condiciones_preexistentes) VALUES (?, ?, ?)`,
                [req.user.id, tipo_sangre, alergias]
            );
        }

        // 4. Sincronizar contactos de emergencia (borrar los antiguos e insertar los nuevos)
        await db.query('DELETE FROM contactos_emergencia WHERE usuario_id = ?', [req.user.id]);
        const insertContacto = async (nombre, tel, paren) => {
            if (nombre && tel) await db.query('INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)', [req.user.id, nombre, tel, paren]);
        };
        await insertContacto(contacto_emergencia_1_nombre, contacto_emergencia_1_telefono, 'Familiar 1');
        await insertContacto(contacto_emergencia_2_nombre, contacto_emergencia_2_telefono, 'Familiar 2');
        await insertContacto(contacto_emergencia_3_nombre, contacto_emergencia_3_telefono, 'Familiar 3');

        res.status(200).json({ message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error("Error en updatePerfil:", error);
        res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
};

module.exports = { login, register, getPerfil, updatePerfil };