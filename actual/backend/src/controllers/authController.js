const servicioAutenticacion = require('../services/authService');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const iniciarSesion = async (req, res) => {
    try {
        console.log("Intento de inicio de sesión recibido:", req.body);

        // Alias a español para uso interno; la clave "password" del JSON no cambia
        const { correo, password: contrasena } = req.body;

        if (!correo || !contrasena) {
            return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
        }

        const resultado = await servicioAutenticacion.iniciarSesion(correo, contrasena);
        res.status(200).json(resultado);

    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

const registrar = async (req, res) => {
    try {
        console.log("Datos de registro recibidos:", req.body);
        const {
            nombres, apellido_paterno, apellido_materno,
            nss, boleta, correo, password: contrasena, rol_id: idRol,
            carrera, num_empleado
        } = req.body;

        // Validaciones básicas generales
        if (!nombres || !nombres.trim()) return res.status(400).json({ message: "Los nombres son requeridos" });
        if (!apellido_paterno || !apellido_paterno.trim()) return res.status(400).json({ message: "El apellido paterno es requerido" });
        if (!correo || !correo.trim()) return res.status(400).json({ message: "El correo es requerido" });
        if (!contrasena || contrasena.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
        if (!idRol || ![2, 3].includes(idRol)) return res.status(400).json({ message: "Rol inválido" });

        const correoLimpio = correo.trim().toLowerCase();

        // Validaciones específicas por rol
        if (idRol === 2) { // Alumno
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
        } else if (idRol === 3) { // Profesor
            if (!correoLimpio.endsWith('@ipn.mx') || correoLimpio.endsWith('@alumno.ipn.mx')) {
                return res.status(400).json({ message: "El correo del profesor debe terminar en @ipn.mx" });
            }
            if (!num_empleado || !num_empleado.trim()) {
                return res.status(400).json({ message: "El número de empleado es requerido para profesores" });
            }
        }

        const resultado = await servicioAutenticacion.registrar({
            nombres: nombres.trim(),
            apellidoPaterno: apellido_paterno.trim(),
            apellidoMaterno: apellido_materno ? apellido_materno.trim() : null,
            correo: correoLimpio,
            contrasena,
            idRol,
            nss: idRol === 2 && nss ? nss.trim() : null,
            boleta: idRol === 2 && boleta ? boleta.trim() : null,
            carrera: idRol === 2 && carrera ? carrera.trim() : null,
            numEmpleado: idRol === 3 && num_empleado ? num_empleado.trim() : null
        });

        res.status(201).json(resultado);
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(400).json({ message: error.message });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const [filasUsuario] = await db.query('SELECT nombres, apellido_paterno, apellido_materno, correo FROM usuarios WHERE id = ?', [req.user.id]);
        if (filasUsuario.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const [fichas] = await db.query('SELECT * FROM fichas_medicas WHERE usuario_id = ?', [req.user.id]);
        let ficha_medica = null;

        if (fichas.length > 0) {
            ficha_medica = {
                tipo_sangre: fichas[0].tipo_sangre,
                alergias: fichas[0].condiciones_preexistentes || ''
            };

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

        // Las claves de salida (nombres, apellido_paterno, ficha_medica, etc.)
        // se mantienen exactas: PerfilActivity.kt las espera así
        res.status(200).json({ ...filasUsuario[0], ficha_medica });
    } catch (error) {
        console.error("Error en obtenerPerfil:", error);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
};

const actualizarPerfil = async (req, res) => {
    try {
        // Alias a español para uso interno; las claves del JSON de entrada no cambian
        const {
            nombres, apellido_paterno, apellido_materno,
            currentPassword: contrasenaActual, newPassword: contrasenaNueva,
            tipo_sangre, alergias,
            contacto_emergencia_1_nombre, contacto_emergencia_1_telefono,
            contacto_emergencia_2_nombre, contacto_emergencia_2_telefono,
            contacto_emergencia_3_nombre, contacto_emergencia_3_telefono
        } = req.body;

        // --- VALIDACIÓN ESTRICTA DE TIPO DE SANGRE ---
        // Solo se valida si el campo viene en la petición, para no romper
        // actualizaciones de perfil que no tocan la ficha médica.
        const tiposSangreValidos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        if (tipo_sangre !== undefined && tipo_sangre !== null && tipo_sangre !== '') {
            if (!tiposSangreValidos.includes(tipo_sangre)) {
                return res.status(400).json({
                    message: `Tipo de sangre inválido. Los valores permitidos son: ${tiposSangreValidos.join(', ')}`
                });
            }
        }

        await db.query(
            'UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ? WHERE id = ?',
            [nombres, apellido_paterno, apellido_materno, req.user.id]
        );

        if (contrasenaActual && contrasenaNueva) {
            const [filasUsuario] = await db.query('SELECT password FROM usuarios WHERE id = ?', [req.user.id]);
            if (filasUsuario.length > 0) {
                const coincide = await bcrypt.compare(contrasenaActual, filasUsuario[0].password);
                if (!coincide) return res.status(400).json({ message: 'La contraseña actual es incorrecta' });

                const sal = await bcrypt.genSalt(10);
                const contrasenaHasheada = await bcrypt.hash(contrasenaNueva, sal);
                await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [contrasenaHasheada, req.user.id]);
            }
        }

        // Actualizar o insertar ficha médica
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

        // Sincronizar contactos de emergencia (borrar los antiguos e insertar los nuevos)
        await db.query('DELETE FROM contactos_emergencia WHERE usuario_id = ?', [req.user.id]);
        const insertarContacto = async (nombre, telefono, parentesco) => {
            if (nombre && telefono) await db.query('INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)', [req.user.id, nombre, telefono, parentesco]);
        };
        await insertarContacto(contacto_emergencia_1_nombre, contacto_emergencia_1_telefono, 'Familiar 1');
        await insertarContacto(contacto_emergencia_2_nombre, contacto_emergencia_2_telefono, 'Familiar 2');
        await insertarContacto(contacto_emergencia_3_nombre, contacto_emergencia_3_telefono, 'Familiar 3');

        res.status(200).json({ message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error("Error en actualizarPerfil:", error);
        res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
};

module.exports = { iniciarSesion, registrar, obtenerPerfil, actualizarPerfil };