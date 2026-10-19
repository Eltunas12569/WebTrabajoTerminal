import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mostrarModalPoliticas, setMostrarModalPoliticas] = useState(false);
    const [politicaPendiente, setPoliticaPendiente] = useState(null);

    const socketRef = useRef(null);

    // 1. Cargar y validar rol/sesión directamente con el servidor al iniciar o recargar
    useEffect(() => {
        let isMounted = true;

        const sincronizarSesionConServidor = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user_data');

            if (!token) {
                if (isMounted) {
                    localStorage.removeItem('user_data');
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            // Carga preliminar del caché local para estado inicial
            let usuarioTemporal = null;
            if (storedUser) {
                try {
                    usuarioTemporal = JSON.parse(storedUser);
                    if (isMounted) {
                        setUser(usuarioTemporal);
                        if (usuarioTemporal?.requiere_aceptar_politicas) {
                            setPoliticaPendiente(usuarioTemporal?.politica_actual || null);
                            setMostrarModalPoliticas(true);
                        }
                    }
                } catch (e) {
                    localStorage.removeItem('user_data');
                }
            }

            // Verificación autoritativa con el servidor (obtiene el role_id real de la BD)
            try {
                const res = await api.get('/auth/perfil');
                if (res.data && isMounted) {
                    const perfilServidor = res.data;
                    const usuarioVerificado = {
                        ...(usuarioTemporal || {}),
                        id: perfilServidor.id,
                        role_id: Number(perfilServidor.role_id),
                        rol: Number(perfilServidor.role_id),
                        correo: perfilServidor.correo,
                        nombres: perfilServidor.nombres,
                        apellido_paterno: perfilServidor.apellido_paterno,
                        apellido_materno: perfilServidor.apellido_materno,
                        apellidos: `${perfilServidor.apellido_paterno || ''} ${perfilServidor.apellido_materno || ''}`.trim(),
                        boleta: perfilServidor.boleta,
                        num_empleado: perfilServidor.num_empleado,
                        verificado: Boolean(perfilServidor.verificado)
                    };
                    setUser(usuarioVerificado);
                    localStorage.setItem('user_data', JSON.stringify(usuarioVerificado));
                }
            } catch (err) {
                // Si el token es inválido o expiró en el servidor (401 o 403), purgar sesión
                if (err.response?.status === 401 || err.response?.status === 403) {
                    if (isMounted) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user_data');
                        setUser(null);
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        sincronizarSesionConServidor();

        return () => {
            isMounted = false;
        };
    }, []);

    // 2. Verificar estado de políticas con el servidor
    const verificarPoliticasUsuario = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await api.get('/politicas/estado-usuario');
            if (res.data && !res.data.al_dia) {
                setPoliticaPendiente(res.data.politica_actual);
                setMostrarModalPoliticas(true);
            } else {
                setMostrarModalPoliticas(false);
            }
        } catch (err) {
            // Si el backend responde 403 con POLITICAS_PENDIENTES
            if (err.response?.status === 403 && err.response?.data?.code === 'POLITICAS_PENDIENTES') {
                setMostrarModalPoliticas(true);
                if (err.response.data?.version_requerida) {
                    setPoliticaPendiente(prev => ({
                        ...(prev || {}),
                        version: err.response.data.version_requerida
                    }));
                }
            }
        }
    }, []);

    // 3. Ejecutar verificación cada vez que el usuario se autentica
    useEffect(() => {
        if (user?.id) {
            verificarPoliticasUsuario();
        }
    }, [user?.id, verificarPoliticasUsuario]);

    // 4. WebSocket global para alertas en tiempo real de nuevas políticas
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !user?.id) return;

        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
        const socket = io(socketUrl, {
            auth: { token }
        });
        socketRef.current = socket;

        // Escuchar alerta institucional emitida cuando el administrador publica nueva versión
        socket.on('actualizacion_politicas_requerida', (data) => {
            console.warn("⚠️ [ALERTA LEGAL GLOBAL] Actualización de políticas detectada:", data);
            setPoliticaPendiente(data);
            setMostrarModalPoliticas(true);
        });

        // Escuchar evento personalizado emitido por el interceptor de Axios (api.js)
        const handleEventoPoliticas = (e) => {
            if (e.detail?.version_requerida) {
                setPoliticaPendiente(prev => ({
                    ...(prev || {}),
                    version: e.detail.version_requerida
                }));
            }
            setMostrarModalPoliticas(true);
        };
        window.addEventListener('politicas_requeridas', handleEventoPoliticas);

        return () => {
            window.removeEventListener('politicas_requeridas', handleEventoPoliticas);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user?.id]);

    const loginUser = (responseData) => {
        const userData = responseData.user || responseData;
        const token = responseData.token;

        localStorage.setItem('user_data', JSON.stringify(userData));
        if (token) localStorage.setItem('token', token);

        setUser(userData);

        if (userData?.requiere_aceptar_politicas) {
            setPoliticaPendiente(userData.politica_actual || null);
            setMostrarModalPoliticas(true);
        } else {
            setMostrarModalPoliticas(false);
        }
    };

    const logout = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        localStorage.removeItem('user_data');
        localStorage.removeItem('token');
        setUser(null);
        setMostrarModalPoliticas(false);
        setPoliticaPendiente(null);
        window.location.href = '/';
    };

    // 5. Función para aceptar las nuevas políticas y desbloquear el sistema
    const aceptarNuevasPoliticas = async (version) => {
        const respuesta = await api.post('/politicas/aceptar', {
            version,
            acepta_aviso: true,
            acepta_terminos: true
        });

        // Actualizar el estado local del usuario
        if (user) {
            const usuarioActualizado = {
                ...user,
                version_aviso_privacidad: version,
                version_terminos: version,
                requiere_aceptar_politicas: false
            };
            setUser(usuarioActualizado);
            localStorage.setItem('user_data', JSON.stringify(usuarioActualizado));
        }

        setMostrarModalPoliticas(false);
        setPoliticaPendiente(null);
        return respuesta.data;
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loginUser, 
            logout, 
            loading,
            mostrarModalPoliticas,
            politicaPendiente,
            aceptarNuevasPoliticas,
            verificarPoliticasUsuario
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);