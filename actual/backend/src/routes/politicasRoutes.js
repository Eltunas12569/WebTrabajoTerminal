const express = require('express');
const router = express.Router();
const politicasController = require('../controllers/politicasController');
const verificarToken = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleAuth');

router.get('/actual', politicasController.obtenerPoliticaActiva);

router.get('/estado-usuario', verificarToken, politicasController.obtenerEstadoUsuario);

router.post('/aceptar', verificarToken, politicasController.aceptarPoliticas);

router.post('/actualizar-version', verificarToken, checkRole([1]), politicasController.actualizarVersionPolitica);

router.get('/admin/estadisticas', verificarToken, checkRole([1]), politicasController.obtenerHistorialYEstadisticas);

module.exports = router;
