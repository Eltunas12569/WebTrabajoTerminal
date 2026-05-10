const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (correo, password) => {
    const [users] = await db.query(`SELECT * FROM usuarios WHERE correo = ?`, [correo]);
    const user = users[0];
    
    if (!user) throw new Error('El correo electrónico no está registrado');

    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        const tiempoRestante = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 60000);
        throw new Error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${tiempoRestante} minutos.`);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        await db.query(`UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?`, [user.id]);
        const [checkUser] = await db.query(`SELECT intentos_fallidos FROM usuarios WHERE id = ?`, [user.id]);
        const intentos = checkUser[0].intentos_fallidos;
        
        if (intentos >= 5) {
            await db.query(`UPDATE usuarios SET bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`, [user.id]);
            throw new Error('Límite de intentos superado. Cuenta bloqueada por 15 minutos.');
        }
        throw new Error(`Contraseña incorrecta. Intentos restantes: ${5 - intentos}`);
    }

    await db.query(`UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?`, [user.id]);

    let boleta = null, num_empleado = null;
    if (user.role_id === 2) {
        const [det] = await db.query(`SELECT boleta FROM alumnos_detalles WHERE usuario_id = ?`, [user.id]);
        if (det.length > 0) boleta = det[0].boleta;
    } else if (user.role_id === 3) {
        const [det] = await db.query(`SELECT num_empleado FROM profesores_detalles WHERE usuario_id = ?`, [user.id]);
        if (det.length > 0) num_empleado = det[0].num_empleado;
    }

    const token = jwt.sign({ id: user.id, rol: user.role_id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    return {
        token,
        user: {
            id: user.id,
            nombres: user.nombres,
            apellidos: `${user.apellido_paterno} ${user.apellido_materno || ''}`.trim(),
            apellido_paterno: user.apellido_paterno,
            apellido_materno: user.apellido_materno,
            correo: user.correo,
            role_id: user.role_id, 
            boleta,
            num_empleado
        }
    };
};

const register = async (userData) => {
    const { 
        nombres, apellido_paterno, apellido_materno, correo, 
        password, rol_id, nss, boleta, carrera, num_empleado 
    } = userData;

    const roleIdNum = Number(rol_id);

    // --- VALIDACIONES DE SEGURIDAD GENERALES ---
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new Error('La contraseña no cumple con los requisitos de seguridad.');
    }

    if (nombres.length > 50) throw new Error('Nombre demasiado largo.');
    if (apellido_paterno.length > 30 || (apellido_materno && apellido_materno.length > 30)) {
        throw new Error('Apellidos demasiado largos.');
    }

    const [existingUser] = await db.query(`SELECT id FROM usuarios WHERE correo = ?`, [correo]);
    if (existingUser.length > 0) throw new Error('El correo electrónico ya está registrado');

    // --- VALIDACIONES ESTRICTAMENTE SEPARADAS ---
    if (roleIdNum === 2) { 
        if (!nss || nss.length > 11) throw new Error('El NSS necesita máximo 11 dígitos');
        if (!boleta || boleta.length > 10) throw new Error('La boleta necesita máximo 10 dígitos');

        const [existingNSS] = await db.query(`SELECT usuario_id FROM alumnos_detalles WHERE nss = ?`, [nss]);
        if (existingNSS.length > 0) throw new Error('El NSS ya está registrado');

        const [existingBoleta] = await db.query(`SELECT usuario_id FROM alumnos_detalles WHERE boleta = ?`, [boleta]);
        if (existingBoleta.length > 0) throw new Error('La boleta ya está registrada');

    } else if (roleIdNum === 3) { 
        if (!num_empleado || num_empleado.length > 15) throw new Error('El número de empleado necesita máximo 15 dígitos');

        const [existingEmpleado] = await db.query(`SELECT usuario_id FROM profesores_detalles WHERE num_empleado = ?`, [num_empleado]);
        if (existingEmpleado.length > 0) throw new Error('El número de empleado ya está registrado');
    } else {
        throw new Error('Rol no válido');
    }

    // --- INSERCIÓN EN BASE DE DATOS ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
        `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [nombres, apellido_paterno, apellido_materno, correo, passwordHash, roleIdNum]
    );

    const userId = result.insertId;

    if (roleIdNum === 2) {
        await db.query(`INSERT INTO alumnos_detalles (usuario_id, nss, boleta, carrera) VALUES (?, ?, ?, ?)`, [userId, nss, boleta, carrera]);
    } else if (roleIdNum === 3) {
        await db.query(`INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`, [userId, num_empleado]);
    }

    // Fichas médicas completas para evitar problemas de inserción en MySQL
    if (roleIdNum !== 1) { 
        await db.query(
            `INSERT INTO fichas_medicas (
                usuario_id, tipo_sangre, condiciones_preexistentes, 
                contacto_emergencia_1_nombre, contacto_emergencia_1_telefono,
                contacto_emergencia_2_nombre, contacto_emergencia_2_telefono,
                contacto_emergencia_3_nombre, contacto_emergencia_3_telefono
            ) VALUES (?, 'O+', 'Pendiente por informar', 'Pendiente', '0000000000', 'N/A', '000', 'N/A', '000')`,
            [userId]
        );
    }

    return { message: "Usuario creado exitosamente" };
};

module.exports = { login, register };