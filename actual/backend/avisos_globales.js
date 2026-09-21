const db = require('./src/config/db');
require('dotenv').config();

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedAvisos = async () => {
    try {
        console.log("📢 INICIANDO SEEDER RÁPIDO DE AVISOS GLOBALES...");

        console.log("🧹 1. Limpiando avisos globales antiguos...");
        // Como ahora es una tabla compartida, solo borramos los que son globales (club_id IS NULL)
        await db.query(`DELETE FROM avisos WHERE club_id IS NULL`);

        console.log("⏳ 2. Publicando 10 avisos institucionales frescos...");
        const prioridades = ['alta', 'normal', 'baja'];
        const categorias = ['Deportes', 'Cultura', 'Academia', 'Protección Civil', 'Subdirección'];

        for (let i = 1; i <= 10; i++) {
            const categoria = getRandom(categorias);
            await db.query(
                `INSERT INTO avisos (club_id, titulo, contenido, prioridad, usuario_id, activo, fecha_creacion, fecha_vencimiento) 
                 VALUES (NULL, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
                [
                    `[${categoria}] Comunicado Oficial #${i}`, 
                    `Este es un anuncio institucional emitido por el área de ${categoria} de la ESCOM. Se solicita a la comunidad estudiantil y docente revisar las nuevas normativas correspondientes a la semana en curso. (Prueba de interfaz móvil ${i}).`, 
                    getRandom(prioridades), 
                    1, // El ID 1 siempre asume que es el Administrador
                    1
                ]
            );
        }

        console.log(`\n✅ ¡ÉXITO! Se han inyectado 10 avisos globales con formato realista.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR:", error);
        process.exit(1);
    }
};

seedAvisos();