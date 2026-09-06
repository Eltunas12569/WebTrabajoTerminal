const express = require('express');
const router = express.Router();
const controladorAutenticacion = require('../controllers/authController');
const verificarToken = require('../middlewares/authMiddleware');

router.post('/login', controladorAutenticacion.iniciarSesion);
router.post('/register', controladorAutenticacion.registrar);

router.get('/perfil', verificarToken, controladorAutenticacion.obtenerPerfil);
router.put('/perfil', verificarToken, controladorAutenticacion.actualizarPerfil);

// NUEVAS RUTAS DE VERIFICACIÓN
router.post('/verificar-cuenta', verificarToken, controladorAutenticacion.verificarCuenta);
router.post('/reenviar-codigo', verificarToken, controladorAutenticacion.reenviarCodigo);

// NUEVAS RUTAS: Recuperación de contraseña (Públicas, sin token)
router.post('/recuperar-password', controladorAutenticacion.solicitarRecuperacion);
router.post('/restablecer-password', controladorAutenticacion.restablecerPassword);

module.exports = router;