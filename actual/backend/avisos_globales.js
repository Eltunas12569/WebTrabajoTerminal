const db = require('./src/config/db');
require('dotenv').config();

// Función auxiliar para elegir una prioridad al azar
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedAvisos = async () => {
    try {
        console.log("📢 INICIANDO SEEDER RÁPIDO DE AVISOS GLOBALES...");

        console.log("🧹 1. Limpiando avisos antiguos (para no saturar tu base de datos)...");
        await db.query(`DELETE FROM avisos_globales`);
        await db.query(`ALTER TABLE avisos_globales AUTO_INCREMENT = 1`); // Reinicia los números de ID

        console.log("⏳ 2. Publicando 10 avisos totalmente frescos (con fecha de HOY)...");
        for (let i = 1; i <= 10; i++) {
            const prioridades = ['alta', 'normal', 'baja'];
            
            // Usamos autor_id = 1 asumiendo que tu Administrador siempre es el ID 1
            await db.query(
                `INSERT INTO avisos_globales (titulo, mensaje, prioridad, autor_id) VALUES (?, ?, ?, ?)`,
                [
                    `Aviso Fresco #${i}`, 
                    `Este es un anuncio institucional reciente número ${i}. Su propósito es validar que el filtro de 7 días en la app de Android funciona correctamente.`, 
                    getRandom(prioridades), 
                    1 
                ]
            );
        }

        console.log(`\n✅ ¡ÉXITO! Se han inyectado 10 avisos globales con la hora actual.`);
        console.log(`📱 Ve a tu emulador o celular, abre la aplicación y ya deberías verlos en la pantalla principal.`);
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Error Crítico al insertar los avisos:", error);
        process.exit(1);
    }
};

// Ejecutar la función
seedAvisos();