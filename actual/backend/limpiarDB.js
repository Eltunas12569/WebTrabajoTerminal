const db = require('./src/config/db');

const limpiarBaseDeDatos = async () => {
    try {
        console.log("🧹 INICIANDO LIMPIEZA TOTAL DE LA BASE DE DATOS...");
        
        // Apagamos las llaves foráneas para evitar errores de restricción al borrar
        await db.query('SET FOREIGN_KEY_CHECKS = 0;');

        // Lista de todas las tablas que vamos a vaciar (TRUNCATE reinicia los IDs a 1)
        const tablas = [
            'roles', 
            'usuarios', 
            'profesores_detalles', 
            'alumnos_detalles', 
            'fichas_medicas', 
            'clubes', 
            'inscripciones', 
            'historial_encargados', 
            'avisos_club', 
            'chat_club', 
            'solicitudes_recursos', 
            'avisos_globales'
        ];

        for (const tabla of tablas) {
            await db.query(`TRUNCATE TABLE ${tabla}`);
            console.log(`✅ Tabla '${tabla}' vaciada y reiniciada.`);
        }

        // Volvemos a prender las llaves foráneas por seguridad
        await db.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        console.log("🚀 Limpieza terminada. Tu base de datos está en blanco y lista para el seed.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error Crítico al limpiar la BD:", error);
        process.exit(1);
    }
};

limpiarBaseDeDatos();