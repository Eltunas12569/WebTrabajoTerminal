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
            carrera, num_empleado, 
            tipo_sangre, condiciones_preexistentes, // <--- EXTRACCIÓN NUEVA
            acepta_privacidad: aceptaPrivacidad,
            version_aviso_privacidad: versionAvisoPrivacidad
        } = req.body;

        if (!nombres || !nombres.trim()) return res.status(400).json({ message: "Los nombres son requeridos" });
        if (!apellido_paterno || !apellido_paterno.trim()) return res.status(400).json({ message: "El apellido paterno es requerido" });
        if (!correo || !correo.trim()) return res.status(400).json({ message: "El correo es requerido" });
        if (!contrasena || contrasena.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
        if (!idRol || ![2, 3].includes(idRol)) return res.status(400).json({ message: "Rol inválido" });
        if (aceptaPrivacidad !== true) return res.status(400).json({ message: "Debes aceptar el aviso de privacidad para registrarte" });

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
            numEmpleado: idRol === 3 && num_empleado ? num_empleado.trim() : null,
            tipoSangre: tipo_sangre,                         
            condicionesPreexistentes: condiciones_preexistentes, 
            aceptaPrivacidad,
            versionAvisoPrivacidad
        });

        res.status(201).json(resultado);
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(400).json({ message: error.message });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const queryUsuario = `
            SELECT id, nombres, apellido_paterno, apellido_materno, correo, verificado, role_id,
                   boleta, carrera, nss, num_empleado, tipo_sangre, condiciones_preexistentes
            FROM usuarios
            WHERE id = ?
        `;
        const [filasUsuario] = await db.query(queryUsuario, [req.user.id]);
        
        if (filasUsuario.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const usuarioInfo = filasUsuario[0];

        const [contactos] = await db.query('SELECT nombre, telefono, parentesco FROM contactos_emergencia WHERE usuario_id = ? ORDER BY id ASC', [req.user.id]);
        
        let ficha_medica = null;
        if (usuarioInfo.tipo_sangre || usuarioInfo.condiciones_preexistentes || contactos.length > 0) {
            ficha_medica = {
                tipo_sangre: usuarioInfo.tipo_sangre,
                alergias: usuarioInfo.condiciones_preexistentes || '',
                contactos: contactos.map(contacto => ({
                    nombre: contacto.nombre,
                    telefono: contacto.telefono,
                    parentesco: contacto.parentesco
                }))
            };
        }

        res.status(200).json({ 
            nombres: usuarioInfo.nombres,
            apellido_paterno: usuarioInfo.apellido_paterno,
            apellido_materno: usuarioInfo.apellido_materno,
            correo: usuarioInfo.correo,
            verificado: usuarioInfo.verificado === 1,
            role_id: usuarioInfo.role_id,
            boleta: usuarioInfo.boleta,
            carrera: usuarioInfo.carrera,
            nss: usuarioInfo.nss,
            num_empleado: usuarioInfo.num_empleado,
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

        const [userCheck] = await db.query('SELECT verificado FROM usuarios WHERE id = ?', [req.user.id]);
        if (userCheck.length > 0 && userCheck[0].verificado === 1) {
            nombres = undefined;
            apellido_paterno = undefined;
            apellido_materno = undefined;
        }

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

        await db.query(
            'UPDATE usuarios SET tipo_sangre = ?, condiciones_preexistentes = ? WHERE id = ?', 
            [tipo_sangre || null, alergias || null, req.user.id]
        );

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