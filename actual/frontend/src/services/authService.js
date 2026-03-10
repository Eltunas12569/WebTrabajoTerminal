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