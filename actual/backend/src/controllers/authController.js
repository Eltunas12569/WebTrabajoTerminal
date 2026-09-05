const servicioAutenticacion = require('../services/authService');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const iniciarSesion = async (req, res) => {
    try {
        console.log("Intento de inicio de sesión recibido:", req.body);
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

        if (!nombres || !nombres.trim()) return res.status(400).json({ message: "Los nombres son requeridos" });
        if (!apellido_paterno || !apellido_paterno.trim()) return res.status(400).json({ message: "El apellido paterno es requerido" });
        if (!correo || !correo.trim()) return res.status(400).json({ message: "El correo es requerido" });
        if (!contrasena || contrasena.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
        if (!idRol || ![2, 3].includes(idRol)) return res.status(400).json({ message: "Rol inválido" });

        const correoLimpio = correo.trim().toLowerCase();

        if (idRol === 2) {
            if (!correoLimpio.endsWith('@alumno.ipn.mx')) return res.status(400).json({ message: "El correo del alumno debe terminar en @alumno.ipn.mx" });
            if (!nss || nss.length !== 11) return res.status(400).json({ message: "El NSS debe tener exactamente 11 dígitos" });
            if (!boleta || boleta.length !== 10) return res.status(400).json({ message: "La boleta debe tener exactamente 10 dígitos para alumnos" });
            if (!carrera || !carrera.trim()) return res.status(400).json({ message: "La carrera es requerida para alumnos" });
        } else if (idRol === 3) {
            if (!correoLimpio.endsWith('@ipn.mx') || correoLimpio.endsWith('@alumno.ipn.mx')) return res.status(400).json({ message: "El correo del profesor debe terminar en @ipn.mx" });
            if (!num_empleado || !num_empleado.trim()) return res.status(400).json({ message: "El número de empleado es requerido para profesores" });
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
        const [filasUsuario] = await db.query('SELECT nombres, apellido_paterno, apellido_materno, correo, verificado FROM usuarios WHERE id = ?', [req.user.id]);
        if (filasUsuario.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const [fichas] = await db.query('SELECT * FROM fichas_medicas WHERE usuario_id = ?', [req.user.id]);
        let ficha_medica = null;

        if (fichas.length > 0) {
            const [contactos] = await db.query('SELECT nombre, telefono, parentesco FROM contactos_emergencia WHERE usuario_id = ? ORDER BY id ASC', [req.user.id]);
            ficha_medica = {
                tipo_sangre: fichas[0].tipo_sangre,
                alergias: fichas[0].condiciones_preexistentes || '',
                contactos: contactos.map(contacto => ({
                    nombre: contacto.nombre,
                    telefono: contacto.telefono,
                    parentesco: contacto.parentesco
                }))
            };
        }

        // Se envía la bandera 'verificado' boolean para que Android la guarde/use
        res.status(200).json({ 
            ...filasUsuario[0], 
            verificado: filasUsuario[0].verificado === 1,
            ficha_medica 
        });
    } catch (error) {
        console.error("Error en obtenerPerfil:", error);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
};

const actualizarPerfil = async (req, res) => {
    try {
        let {
            nombres, apellido_paterno, apellido_materno,
            currentPassword: contrasenaActual, newPassword: contrasenaNueva,
            tipo_sangre, alergias, contactos
        } = req.body;

        const tiposSangreValidos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        if (tipo_sangre && !tiposSangreValidos.includes(tipo_sangre)) {
            return res.status(400).json({ message: `Tipo de sangre inválido. Los valores permitidos son: ${tiposSangreValidos.join(', ')}` });
        }

        if (!Array.isArray(contactos)) return res.status(400).json({ message: "El campo 'contactos' debe ser un arreglo." });
        if (contactos.length < 2) return res.status(400).json({ message: "Debes registrar al menos 2 contactos de emergencia." });
        for (const [indice, contacto] of contactos.entries()) {
            if (!contacto.nombre || !contacto.nombre.trim()) return res.status(400).json({ message: `El contacto #${indice + 1} necesita un nombre.` });
            if (!contacto.telefono || !contacto.telefono.trim()) return res.status(400).json({ message: `El contacto #${indice + 1} necesita un teléfono.` });
        }

        // NUEVO: Verificamos si el usuario ya está validado
        const [userCheck] = await db.query('SELECT verificado FROM usuarios WHERE id = ?', [req.user.id]);
        if (userCheck.length > 0 && userCheck[0].verificado === 1) {
            // Si ya está verificado, anulamos cualquier intento de cambiar sus nombres en la consulta
            nombres = undefined;
            apellido_paterno = undefined;
            apellido_materno = undefined;
        }

        // Solo se hace UPDATE de nombres si no fue anulado arriba
        if (nombres !== undefined && apellido_paterno !== undefined) {
             await db.query(
                'UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ? WHERE id = ?',
                [nombres, apellido_paterno, apellido_materno, req.user.id]
             );
        }

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

        const [fichas] = await db.query('SELECT id FROM fichas_medicas WHERE usuario_id = ?', [req.user.id]);
        if (fichas.length > 0) {
            await db.query(`UPDATE fichas_medicas SET tipo_sangre = ?, condiciones_preexistentes = ? WHERE usuario_id = ?`, [tipo_sangre, alergias, req.user.id]);
        } else {
            await db.query(`INSERT INTO fichas_medicas (usuario_id, tipo_sangre, condiciones_preexistentes) VALUES (?, ?, ?)`, [req.user.id, tipo_sangre, alergias]);
        }

        await db.query('DELETE FROM contactos_emergencia WHERE usuario_id = ?', [req.user.id]);
        for (const contacto of contactos) {
            await db.query('INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, ?, ?, ?)', [req.user.id, contacto.nombre.trim(), contacto.telefono.trim(), contacto.parentesco || null]);
        }

        res.status(200).json({ message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error("Error en actualizarPerfil:", error);
        res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
};

// NUEVOS CONTROLADORES DE VERIFICACIÓN
const verificarCuenta = async (req, res) => {
    try {
        const { codigo } = req.body;
        if (!codigo || codigo.length !== 6) {
            return res.status(400).json({ message: 'Código inválido. Debe tener 6 dígitos.' });
        }

        const resultado = await servicioAutenticacion.verificarCuentaConOTP(req.user.id, codigo);
        res.status(200).json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const reenviarCodigo = async (req, res) => {
    try {
        const resultado = await servicioAutenticacion.reenviarCodigoOTP(req.user.id);
        res.status(200).json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// NUEVO: Controladores de Recuperación
const solicitarRecuperacion = async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo || !correo.trim()) return res.status(400).json({ message: 'El correo es requerido' });
        
        const resultado = await servicioAutenticacion.solicitarRecuperacion(correo.trim().toLowerCase());
        res.status(200).json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const restablecerPassword = async (req, res) => {
    try {
        const { correo, codigo, nuevaPassword, confirmarPassword } = req.body;
        
        if (!correo || !codigo || !nuevaPassword || !confirmarPassword) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }
        
        if (nuevaPassword !== confirmarPassword) {
            return res.status(400).json({ message: 'Las contraseñas no coinciden' });
        }
        
        const resultado = await servicioAutenticacion.restablecerPassword(correo.trim().toLowerCase(), codigo, nuevaPassword);
        res.status(200).json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { 
    iniciarSesion, 
    registrar, 
    obtenerPerfil, 
    actualizarPerfil, 
    verificarCuenta, 
    reenviarCodigo, 
    solicitarRecuperacion, 
    restablecerPassword 
};