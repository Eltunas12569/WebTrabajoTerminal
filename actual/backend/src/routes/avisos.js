const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        // 1. Apagar (poner en 0) los avisos vencidos.
        // MAGIA AQUÍ: Si fecha_vencimiento es NULL, revisa si ya pasaron 7 días desde su creación y lo apaga.
        await db.query(`
            UPDATE avisos_globales 
            SET activo = 0 
            WHERE fecha_vencimiento < NOW() 
               OR (fecha_vencimiento IS NULL AND fecha_creacion < DATE_SUB(NOW(), INTERVAL 7 DAY))
        `);

        // 2. Encender (poner en 1) los avisos que aún son vigentes o tienen menos de 7 días si son NULL
        await db.query(`
            UPDATE avisos_globales 
            SET activo = 1 
            WHERE fecha_vencimiento >= NOW() 
               OR (fecha_vencimiento IS NULL AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 7 DAY))
        `);

        // 3. Traer solo los activos, ya limpios
        const [rows] = await db.query('SELECT * FROM avisos_globales WHERE activo = 1');
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("DB Error:", error.message);
        res.status(500).json({ message: "Error interno del servidor al procesar los avisos" });
    }
});

module.exports = router;