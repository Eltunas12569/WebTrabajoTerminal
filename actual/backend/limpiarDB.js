const db = require('./src/config/db');

const limpiarBaseDeDatos = async () => {
    try {
        console.log("🧹 INICIANDO LIMPIEZA TOTAL DE LA BASE DE DATOS...");
        
        await db.query('SET FOREIGN_KEY_CHECKS = 0;');

        const tablas = [
            'roles', 
            'usuarios', 
            'contactos_emergencia', 
            'clubes', 
            'inscripciones', 
            'historial_encargados', 
            'avisos',
            'chat_mensajes',
            'eventos_club',
            'asistencias_eventos'
        ];

        for (const tabla of tablas) {
            await db.query(`TRUNCATE TABLE ${tabla}`);
            console.log(`✅ Tabla '${tabla}' vaciada y reiniciada a ID 1.`);
        }

        await db.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        console.log("🚀 Limpieza terminada. Tu base de datos está en blanco y lista.");
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR AL LIMPIAR:", error);
        process.exit(1);
    }
};

limpiarBaseDeDatos();