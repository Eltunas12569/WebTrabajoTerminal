import api from './api';

export const login = async (correo, password) => {
    try {
        const response = await api.post('/auth/login', { 
            correo: correo, 
            password: password 
        });
        
        // Si el login es exitoso, regresamos los datos (token, usuario, etc.)
        return response.data;
    } catch (error) {
        // 1. Extraemos el mensaje de error que viene del Backend
        // Accedemos a error.response.data para obtener el JSON que mandamos desde el controlador
        const errorMessage = error.response?.data?.message || 'Error de conexión con el servidor';

        // 2. Lanzamos solo el mensaje de texto para que el componente lo use directamente
        throw errorMessage;
    }
};

export const register = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        // Captura el mensaje específico del backend (ej: "Boleta ya registrada")
        throw error.response?.data?.message || 'Error en el servidor';
    }
};

export const solicitarRecuperacion = async (correo) => {
    try {
        const response = await api.post('/auth/recuperar-password', { correo });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'No se pudo enviar el código de recuperación';
    }
};

export const restablecerPassword = async ({ correo, codigo, nuevaPassword, confirmarPassword }) => {
    try {
        const response = await api.post('/auth/restablecer-password', {
            correo,
            codigo,
            nuevaPassword,
            confirmarPassword
        });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'No se pudo restablecer la contraseña';
    }
};