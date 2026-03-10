const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        // Traemos solo los activos. La fecha la filtramos en React
        const [rows] = await db.query('SELECT * FROM avisos_globales WHERE activo = 1');
        res.status(200).json(rows);
    } catch (error) {
        console.error("DB Error:", error.message);
        res.status(500).json({ message: "Error de conexión" });
    }
});

module.exports = router;