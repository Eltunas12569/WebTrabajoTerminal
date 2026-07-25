const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    // Las claves de "user" se mantienen exactas: coinciden con LoginResponse en Kotlin
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
            num_empleado: numEmpleado
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

    // --- TRANSACCIÓN ACID REAL ---
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        // FOR UPDATE bloquea la fila mientras dura la transacción, evitando
        // que dos registros simultáneos con el mismo correo pasen la validación a la vez
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

        const [resultadoUsuario] = await conexion.query(
            `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [nombres, apellidoPaterno, apellidoMaterno, correo, hashContrasena, idRol]
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
        return { message: "Usuario creado exitosamente" };

    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

module.exports = { iniciarSesion, registrar };