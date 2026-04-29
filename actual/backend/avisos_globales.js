const db = require('./src/config/db');
require('dotenv').config();

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedAvisos = async () => {
    try {
        console.log("📢 INICIANDO SEEDER RÁPIDO DE AVISOS GLOBALES...");

        console.log("🧹 1. Limpiando avisos antiguos...");
        await db.query(`DELETE FROM avisos_globales`);
        await db.query(`ALTER TABLE avisos_globales AUTO_INCREMENT = 1`);

        console.log("⏳ 2. Publicando 10 avisos frescos...");
        const prioridades = ['alta', 'normal', 'baja'];

        for (let i = 1; i <= 10; i++) {
            await db.query(
                `INSERT INTO avisos_globales (titulo, mensaje, prioridad, autor_id, activo, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
                [
                    `Aviso Importante #${i}`, 
                    `Este es un anuncio institucional para pruebas técnicas número ${i}. Verifica la visibilidad en Android.`, 
                    getRandom(prioridades), 
                    1,
                    1
                ]
            );
        }

        console.log(`\n✅ ¡ÉXITO! Se han inyectado 10 avisos globales vigentes.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR:", error);
        process.exit(1);
    }
};

seedAvisos();