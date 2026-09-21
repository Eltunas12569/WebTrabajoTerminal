const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { enviarCodigoVerificacion, enviarCorreoRecuperacion } = require('./emailService');

const iniciarSesion = async (correo, contrasena) => {
    const [usuarios] = await db.query(`SELECT * FROM usuarios WHERE correo = ?`, [correo]);
    const usuario = usuarios[0];

    if (!usuario) throw new Error('El correo electrónico no está registrado');

    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
        const tiempoRestante = Math.ceil((new Date(usuario.bloqueado_hasta) - new Date()) / 60000);
        throw new Error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${tiempoRestante} minutos.`);
    }

    const coincide = await bcrypt.compare(contrasena, usuario.password);

    if (!coincide) {
        await db.query(`UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?`, [usuario.id]);
        const [usuarioActualizado] = await db.query(`SELECT intentos_fallidos FROM usuarios WHERE id = ?`, [usuario.id]);
        const intentos = usuarioActualizado[0].intentos_fallidos;

        if (intentos >= 5) {
            await db.query(`UPDATE usuarios SET bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`, [usuario.id]);
            throw new Error('Límite de intentos superado. Cuenta bloqueada por 15 minutos.');
        }
        throw new Error(`Contraseña incorrecta. Intentos restantes: ${5 - intentos}`);
    }

    await db.query(`UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?`, [usuario.id]);

    const token = jwt.sign({ id: usuario.id, rol: usuario.role_id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    return {
        token,
        user: {
            id: usuario.id,
            nombres: usuario.nombres,
            apellidos: `${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim(),
            apellido_paterno: usuario.apellido_paterno,
            apellido_materno: usuario.apellido_materno,
            correo: usuario.correo,
            role_id: usuario.role_id,
            boleta: usuario.boleta,
            num_empleado: usuario.num_empleado,
            verificado: usuario.verificado === 1 || usuario.verificado === true 
        }
    };
};

const registrar = async (datosRegistro) => {
    const {
        nombres, apellidoPaterno, apellidoMaterno, correo,
        contrasena, idRol, nss, boleta, carrera, numEmpleado,
        tipoSangre, condicionesPreexistentes, // <--- SE RECIBEN AQUÍ
        aceptaPrivacidad, versionAvisoPrivacidad
    } = datosRegistro;

    if (aceptaPrivacidad !== true) throw new Error('Debes aceptar el aviso de privacidad para registrarte');
    if (!versionAvisoPrivacidad) throw new Error('La versión del aviso de privacidad es requerida');

    const expresionContrasena = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!expresionContrasena.test(contrasena)) {
        throw new Error('La contraseña no cumple con los requisitos de seguridad.');
    }

    if (nombres.length > 50) throw new Error('Nombre demasiado largo.');
    if (apellidoPaterno.length > 30 || (apellidoMaterno && apellidoMaterno.length > 30)) {
        throw new Error('Apellidos demasiado largos.');
    }

    const sal = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(contrasena, sal);
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracionOTP = new Date(Date.now() + 15 * 60 * 1000);

    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        const [correoExistente] = await conexion.query(`SELECT id FROM usuarios WHERE correo = ? FOR UPDATE`, [correo]);
        if (correoExistente.length > 0) throw new Error('El correo electrónico ya está registrado');

        if (idRol === 2) {
            const [nssExistente] = await conexion.query(`SELECT id FROM usuarios WHERE nss = ?`, [nss]);
            if (nssExistente.length > 0) throw new Error('El NSS ya está registrado');

            const [boletaExistente] = await conexion.query(`SELECT id FROM usuarios WHERE boleta = ?`, [boleta]);
            if (boletaExistente.length > 0) throw new Error('La boleta ya está registrada');
        } else if (idRol === 3) {
            const [empleadoExistente] = await conexion.query(`SELECT id FROM usuarios WHERE num_empleado = ?`, [numEmpleado]);
            if (empleadoExistente.length > 0) throw new Error('El número de empleado ya está registrado');
        }

        const [resultadoUsuario] = await conexion.query(
            `INSERT INTO usuarios 
            (nombres, apellido_paterno, apellido_materno, correo, password, role_id, codigo_otp, expiracion_otp, acepta_privacidad, version_aviso_privacidad, fecha_aceptacion_privacidad, nss, boleta, carrera, num_empleado, tipo_sangre, condiciones_preexistentes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`, 
            [
                nombres, apellidoPaterno, apellidoMaterno, correo, hashContrasena, idRol, codigoOTP, expiracionOTP, true, versionAvisoPrivacidad, 
                nss || null, boleta || null, carrera || null, numEmpleado || null, 
                tipoSangre || null, condicionesPreexistentes || null 
            ]
        );
        const idUsuarioNuevo = resultadoUsuario.insertId;

        await conexion.commit();

        enviarCodigoVerificacion(correo, codigoOTP).catch(err => console.error("Error enviando correo de OTP:", err));

        return { message: "Usuario creado exitosamente. Revisa tu correo para verificar la cuenta." };

    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// ESTA ERA LA FUNCIÓN QUE FALTABA
const verificarCuentaConOTP = async (usuarioId, codigoIngresado) => {
    const [rows] = await db.query(
        'SELECT id, codigo_otp, expiracion_otp, verificado FROM usuarios WHERE id = ?',
        [usuarioId]
    );

    if (rows.length === 0) throw new Error('Usuario no encontrado');

    const usuario = rows[0];

    if (usuario.verificado === 1) return { mensaje: 'La cuenta ya se encuentra verificada' };
    if (!usuario.codigo_otp || !usuario.expiracion_otp) throw new Error('No hay un código pendiente de validación');

    const ahora = new Date();
    if (ahora > new Date(usuario.expiracion_otp)) throw new Error('El código ha expirado. Solicita uno nuevo.');
    if (usuario.codigo_otp !== codigoIngresado) throw new Error('El código de verificación es incorrecto');

    await db.query(
        `UPDATE usuarios SET verificado = 1, codigo_otp = NULL, expiracion_otp = NULL WHERE id = ?`,
        [usuarioId]
    );

    return { mensaje: 'Cuenta verificada exitosamente' };
};

const reenviarCodigoOTP = async (usuarioId) => {
    const [rows] = await db.query('SELECT correo, verificado FROM usuarios WHERE id = ?', [usuarioId]);
    if (rows.length === 0) throw new Error('Usuario no encontrado');
    if (rows[0].verificado === 1) throw new Error('La cuenta ya está verificada');

    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracionOTP = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
        'UPDATE usuarios SET codigo_otp = ?, expiracion_otp = ? WHERE id = ?',
        [codigoOTP, expiracionOTP, usuarioId]
    );

    enviarCodigoVerificacion(rows[0].correo, codigoOTP).catch(err => console.error("Error reenviando correo:", err));

    return { mensaje: 'Nuevo código enviado al correo' };
};

const solicitarRecuperacion = async (correo) => {
    const [rows] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (rows.length === 0) throw new Error('El correo electrónico no está registrado');

    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracionOTP = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
        'UPDATE usuarios SET codigo_otp = ?, expiracion_otp = ? WHERE correo = ?',
        [codigoOTP, expiracionOTP, correo]
    );

    enviarCorreoRecuperacion(correo, codigoOTP).catch(err => console.error("Error enviando recuperación:", err));
    return { mensaje: 'Código de recuperación enviado al correo' };
};

const restablecerPassword = async (correo, codigoIngresado, nuevaContrasena) => {
    const [rows] = await db.query('SELECT id, codigo_otp, expiracion_otp FROM usuarios WHERE correo = ?', [correo]);
    if (rows.length === 0) throw new Error('Usuario no encontrado');

    const usuario = rows[0];
    if (!usuario.codigo_otp || !usuario.expiracion_otp) throw new Error('No hay una solicitud de recuperación pendiente');

    const ahora = new Date();
    if (ahora > new Date(usuario.expiracion_otp)) throw new Error('El código ha expirado. Solicita uno nuevo.');
    if (usuario.codigo_otp !== codigoIngresado) throw new Error('El código de verificación es incorrecto');

    const expresionContrasena = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!expresionContrasena.test(nuevaContrasena)) {
        throw new Error('La contraseña no cumple con los requisitos de seguridad.');
    }

    const sal = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(nuevaContrasena, sal);

    await db.query(
        'UPDATE usuarios SET password = ?, codigo_otp = NULL, expiracion_otp = NULL, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE correo = ?',
        [hashContrasena, correo]
    );

    return { mensaje: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' };
};

module.exports = { 
    iniciarSesion, 
    registrar, 
    verificarCuentaConOTP, 
    reenviarCodigoOTP,
    solicitarRecuperacion,
    restablecerPassword
};