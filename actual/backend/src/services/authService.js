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

    let boleta = null, numEmpleado = null;
    if (usuario.role_id === 2) {
        const [detalle] = await db.query(`SELECT boleta FROM alumnos_detalles WHERE usuario_id = ?`, [usuario.id]);
        if (detalle.length > 0) boleta = detalle[0].boleta;
    } else if (usuario.role_id === 3) {
        const [detalle] = await db.query(`SELECT num_empleado FROM profesores_detalles WHERE usuario_id = ?`, [usuario.id]);
        if (detalle.length > 0) numEmpleado = detalle[0].num_empleado;
    }

    const token = jwt.sign({ id: usuario.id, rol: usuario.role_id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Las claves de "user" se mantienen exactas, solo agregamos "verificado"
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
            boleta,
            num_empleado: numEmpleado,
            verificado: usuario.verificado === 1 // NUEVO: Bandera booleana para el frontend móvil
        }
    };
};

const registrar = async (datosRegistro) => {
    const {
        nombres, apellidoPaterno, apellidoMaterno, correo,
        contrasena, idRol, nss, boleta, carrera, numEmpleado
    } = datosRegistro;

    // --- VALIDACIONES DE FORMATO (antes de abrir la transacción) ---
    const expresionContrasena = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!expresionContrasena.test(contrasena)) {
        throw new Error('La contraseña no cumple con los requisitos de seguridad.');
    }

    if (nombres.length > 50) throw new Error('Nombre demasiado largo.');
    if (apellidoPaterno.length > 30 || (apellidoMaterno && apellidoMaterno.length > 30)) {
        throw new Error('Apellidos demasiado largos.');
    }

    if (idRol === 2) {
        if (!nss || nss.length > 11) throw new Error('El NSS necesita máximo 11 dígitos');
        if (!boleta || boleta.length > 10) throw new Error('La boleta necesita máximo 10 dígitos');
    } else if (idRol === 3) {
        if (!numEmpleado || numEmpleado.length > 15) throw new Error('El número de empleado necesita máximo 15 dígitos');
    } else {
        throw new Error('Rol no válido');
    }

    const sal = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(contrasena, sal);

    // NUEVO: Generar código numérico de 6 dígitos y expiración a 15 minutos
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracionOTP = new Date(Date.now() + 15 * 60 * 1000);

    // --- TRANSACCIÓN ACID REAL ---
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        const [correoExistente] = await conexion.query(
            `SELECT id FROM usuarios WHERE correo = ? FOR UPDATE`, [correo]
        );
        if (correoExistente.length > 0) throw new Error('El correo electrónico ya está registrado');

        if (idRol === 2) {
            const [nssExistente] = await conexion.query(`SELECT usuario_id FROM alumnos_detalles WHERE nss = ?`, [nss]);
            if (nssExistente.length > 0) throw new Error('El NSS ya está registrado');

            const [boletaExistente] = await conexion.query(`SELECT usuario_id FROM alumnos_detalles WHERE boleta = ?`, [boleta]);
            if (boletaExistente.length > 0) throw new Error('La boleta ya está registrada');
        } else {
            const [empleadoExistente] = await conexion.query(`SELECT usuario_id FROM profesores_detalles WHERE num_empleado = ?`, [numEmpleado]);
            if (empleadoExistente.length > 0) throw new Error('El número de empleado ya está registrado');
        }

        // NUEVO: Se insertan también codigo_otp y expiracion_otp
        const [resultadoUsuario] = await conexion.query(
            `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id, codigo_otp, expiracion_otp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombres, apellidoPaterno, apellidoMaterno, correo, hashContrasena, idRol, codigoOTP, expiracionOTP]
        );
        const idUsuarioNuevo = resultadoUsuario.insertId;

        if (idRol === 2) {
            await conexion.query(
                `INSERT INTO alumnos_detalles (usuario_id, nss, boleta, carrera) VALUES (?, ?, ?, ?)`,
                [idUsuarioNuevo, nss, boleta, carrera]
            );
        } else {
            await conexion.query(
                `INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`,
                [idUsuarioNuevo, numEmpleado]
            );
        }

        await conexion.query(
            `INSERT INTO fichas_medicas (usuario_id, tipo_sangre, condiciones_preexistentes) VALUES (?, 'O+', 'Pendiente por informar')`,
            [idUsuarioNuevo]
        );
        await conexion.query(
            `INSERT INTO contactos_emergencia (usuario_id, nombre, telefono, parentesco) VALUES (?, 'Pendiente', '0000000000', 'Tutor')`,
            [idUsuarioNuevo]
        );

        await conexion.commit();

        // NUEVO: Disparar el envío de correo sin bloquear la respuesta de la API usando .catch para evitar que un fallo en el SMTP tire el servidor
        enviarCodigoVerificacion(correo, codigoOTP).catch(err => console.error("Error enviando correo de OTP:", err));

        return { message: "Usuario creado exitosamente. Revisa tu correo para verificar la cuenta." };

    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// NUEVO: Función para validar y destruir el código
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

    // DESTRUCCIÓN DEL CÓDIGO Y ACTIVACIÓN
    await db.query(
        `UPDATE usuarios SET verificado = 1, codigo_otp = NULL, expiracion_otp = NULL WHERE id = ?`,
        [usuarioId]
    );

    return { mensaje: 'Cuenta verificada exitosamente' };
};

// NUEVO: Función para volver a enviar el correo si se venció
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

// NUEVO: Generar y enviar código para recuperar contraseña
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

// NUEVO: Validar código y sobrescribir contraseña
const restablecerPassword = async (correo, codigoIngresado, nuevaContrasena) => {
    const [rows] = await db.query('SELECT id, codigo_otp, expiracion_otp FROM usuarios WHERE correo = ?', [correo]);
    if (rows.length === 0) throw new Error('Usuario no encontrado');

    const usuario = rows[0];
    if (!usuario.codigo_otp || !usuario.expiracion_otp) throw new Error('No hay una solicitud de recuperación pendiente');

    const ahora = new Date();
    if (ahora > new Date(usuario.expiracion_otp)) throw new Error('El código ha expirado. Solicita uno nuevo.');
    if (usuario.codigo_otp !== codigoIngresado) throw new Error('El código de verificación es incorrecto');

    // Validación estricta de seguridad
    const expresionContrasena = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!expresionContrasena.test(nuevaContrasena)) {
        throw new Error('La contraseña no cumple con los requisitos de seguridad.');
    }

    const sal = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(nuevaContrasena, sal);

    // Destruimos el código y reseteamos posibles bloqueos por intentos fallidos anteriores
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