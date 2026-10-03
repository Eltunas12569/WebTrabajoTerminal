const express = require('express');
const router = express.Router();
const politicasController = require('../controllers/politicasController');
const verificarToken = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleAuth');

// 1. Obtener la versión activa del Aviso de Privacidad y Términos (público / cualquier usuario)
router.get('/actual', politicasController.obtenerPoliticaActiva);

// 2. Obtener el estado de aceptación del usuario autenticado
router.get('/estado-usuario', verificarToken, politicasController.obtenerEstadoUsuario);

// 3. Registrar aceptación de la nueva versión por el usuario autenticado
router.post('/aceptar', verificarToken, politicasController.aceptarPoliticas);

// 4. Publicar nueva versión de políticas y detonar alerta global (Exclusivo Administrador - Rol 1)
router.post('/actualizar-version', verificarToken, checkRole([1]), politicasController.actualizarVersionPolitica);

// 5. Consultar estadísticas de cumplimiento y bitácora de auditoría (Exclusivo Administrador - Rol 1)
router.get('/admin/estadisticas', verificarToken, checkRole([1]), politicasController.obtenerHistorialYEstadisticas);

module.exports = router;
