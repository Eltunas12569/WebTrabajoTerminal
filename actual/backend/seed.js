const User = require('./src/models/userModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedDB = async () => {
    try {
        // La contraseña para TODOS será 'qwerty'
        const passwordPlana = "qwerty"; 
        
        // Encriptamos la contraseña una sola vez y la reusamos para todos
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(passwordPlana, salt);

        // Lista con correos simplificados para agilizar pruebas
        const usuariosData = [
            // 1 Administrador (role_id: 1)
            { nombres: "Carlos", apellidos: "Mendoza Ruiz", nss: "12345678901", boleta: "2015630001", correo: "admin@ipn.mx", role_id: 1 },
            
            // 8 Alumnos (role_id: 4)
            { nombres: "Andrea", apellidos: "García López", nss: "11111111111", boleta: "2021630101", correo: "alumno1@ipn.mx", role_id: 4 },
            { nombres: "Miguel Ángel", apellidos: "Torres Silva", nss: "22222222222", boleta: "2022630202", correo: "alumno2@ipn.mx", role_id: 4 },
            { nombres: "Valeria", apellidos: "Martínez Castro", nss: "33333333333", boleta: "2023630303", correo: "alumno3@ipn.mx", role_id: 4 },
            { nombres: "Jorge", apellidos: "Hernández Vega", nss: "44444444444", boleta: "2020630404", correo: "alumno4@ipn.mx", role_id: 4 },
            { nombres: "Sofía", apellidos: "Rojas Medina", nss: "55555555555", boleta: "2021630505", correo: "alumno5@ipn.mx", role_id: 4 },
            { nombres: "Daniel", apellidos: "Flores Vargas", nss: "66666666666", boleta: "2022630606", correo: "alumno6@ipn.mx", role_id: 4 },
            { nombres: "Fernanda", apellidos: "Ortiz Navarro", nss: "77777777777", boleta: "2023630707", correo: "alumno7@ipn.mx", role_id: 4 },
            { nombres: "Alejandro", apellidos: "Cruz Peña", nss: "88888888888", boleta: "2020630808", correo: "alumno8@ipn.mx", role_id: 4 }
        ];

        console.log("⏳ Ejecutando seed.js: Sembrando usuarios en la base de datos...");

        for (const u of usuariosData) {
            await User.create(u.nombres, u.apellidos, u.nss, u.boleta, u.correo, hash, u.role_id);
            
            const rolNombre = u.role_id === 1 ? 'Admin' : 'Alumno';
            console.log(`✅ Creado: ${u.nombres} | Rol: ${rolNombre} | Correo: ${u.correo}`);
        }
        
        console.log(`\n🎉 ¡Listo! 1 Admin y 8 Alumnos sembrados correctamente.`);
        console.log(`🔑 La contraseña para todos es: qwerty`);
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Error al ejecutar el seed:", error.message);
        process.exit(1);
    }
};

seedDB();