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
            role_id: user.role_id, // ⬅️ CORRECCIÓN CRÍTICA: Ahora sí dice role_id
            boleta,
            num_empleado
        }
    };
};

const register = async (userData) => {
    const { nombres, apellido_paterno, apellido_materno, correo, password, rol_id, nss, boleta, carrera, num_empleado } = userData;

    // Verificar duplicados
    const [existingUser] = await db.query(`SELECT id FROM usuarios WHERE correo = ?`, [correo]);
    if (existingUser.length > 0) {
        throw new Error('El correo electrónico ya está registrado');
    }

    const [existingNSS] = await db.query(`SELECT usuario_id FROM alumnos_detalles WHERE nss = ?`, [nss]);
    if (existingNSS.length > 0) {
        throw new Error('El NSS ya está registrado');
    }

    if (rol_id === 2 && boleta) { // Alumno
        const [existingBoleta] = await db.query(`SELECT usuario_id FROM alumnos_detalles WHERE boleta = ?`, [boleta]);
        if (existingBoleta.length > 0) {
            throw new Error('La boleta ya está registrada');
        }
    }

    if (rol_id === 3 && num_empleado) { // Profesor
        const [existingEmpleado] = await db.query(`SELECT usuario_id FROM profesores_detalles WHERE num_empleado = ?`, [num_empleado]);
        if (existingEmpleado.length > 0) {
            throw new Error('El número de empleado ya está registrado');
        }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
        `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, correo, password, role_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [nombres, apellido_paterno, apellido_materno, correo, passwordHash, rol_id]
    );

    const userId = result.insertId;

    if (rol_id === 2) {
        await db.query(`INSERT INTO alumnos_detalles (usuario_id, nss, boleta, carrera) VALUES (?, ?, ?, ?)`, [userId, nss, boleta, carrera]);
    } else if (rol_id === 3) {
        await db.query(`INSERT INTO profesores_detalles (usuario_id, num_empleado) VALUES (?, ?)`, [userId, num_empleado]);
    }

    return { message: "Usuario creado exitosamente" };
};

module.exports = { login, register };