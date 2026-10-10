import axios from 'axios';


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    withCredentials: true
});

api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Error al leer el token del localStorage", error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});


api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401 Unauthorized: El token ya no es válido o ha sido manipulado
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('user_data');
            localStorage.removeItem('token');
            // Redirección forzosa para evitar que el usuario vea datos cacheados
            window.location.href = '/';
        }

        // 403 Forbidden por actualización de políticas pendiente (LGPDPPSO)
        if (error.response && error.response.status === 403 && error.response.data?.code === 'POLITICAS_PENDIENTES') {
            window.dispatchEvent(new CustomEvent('politicas_requeridas', {
                detail: error.response.data
            }));
        }

        return Promise.reject(error);   
    }
);

export default api;