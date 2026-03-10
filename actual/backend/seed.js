const User = require('./src/models/userModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const registrarAdmin = async () => {
    try {
        const nombre = "Admin ESCOM";
        const correo = "admin@escom.mx";
        const passwordPlana = "escom123"; // Esta es la que usarás para loguearte
        const roleId = 1; // 1 = Administrador (según nuestro INSERT previo)

        // Encriptamos la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(passwordPlana, salt);

        // Guardamos en la DB usando el modelo
        const id = await User.create(nombre, correo, hash, roleId);
        
        console.log(`✅ Usuario Administrador creado con ID: ${id}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error al crear el usuario:", error.message);
        process.exit(1);
    }
};

registrarAdmin();