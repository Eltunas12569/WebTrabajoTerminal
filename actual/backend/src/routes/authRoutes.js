const express = require('express');
const router = express.Router();
// Importamos el controlador que contiene la lógica de login
const authController = require('../controllers/authController');

// Definimos la ruta POST para el inicio de sesión
// IMPORTANTE: Verifica que authController.login exista y sea una función
router.post('/login', authController.login);
router.post('/register', authController.register);
// Exportamos el router para que server.js pueda usarlo
// Sin esta línea, server.js arroja el TypeError que recibiste
module.exports = router;