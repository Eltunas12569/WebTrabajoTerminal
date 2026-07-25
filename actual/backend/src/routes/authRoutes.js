const express = require('express');
const router = express.Router();
const controladorAutenticacion = require('../controllers/authController');
const verificarToken = require('../middlewares/authMiddleware');

// Las rutas (URLs) NO cambian: Android y React ya las consumen tal cual
router.post('/login', controladorAutenticacion.iniciarSesion);
router.post('/register', controladorAutenticacion.registrar);

router.get('/perfil', verificarToken, controladorAutenticacion.obtenerPerfil);
router.put('/perfil', verificarToken, controladorAutenticacion.actualizarPerfil);

module.exports = router;