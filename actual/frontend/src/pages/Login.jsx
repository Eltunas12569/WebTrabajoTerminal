import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/Login.css';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [avisos, setAvisos] = useState([]);

    const { loginUser } = useAuth();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;
    useEffect(() => {
        const fetchAvisos = async () => {
            try {
                const response = await axios.get(`${API_URL}/avisos`);
                const datosBrutos = response.data;

                // 1. Obtener fecha de hoy en formato YYYY-MM-DD local
                const hoy = new Date();
                const hoyStr = hoy.toISOString().split('T')[0];

                // 2. Filtrar: Eliminamos el ID 5 comparando solo la parte de la fecha
                const vigentes = datosBrutos.filter(aviso => {
                    if (!aviso.fecha_vencimiento) return true; // Los NULL pasan

                    // Extraemos solo "2026-03-01" de "2026-03-01T06:00:00.000Z"
                    const fechaVenceCorta = aviso.fecha_vencimiento.split('T')[0];

                    return fechaVenceCorta >= hoyStr; // Solo si es hoy o futuro
                });

                // 3. Ordenar por prioridad (alta > normal > baja)
                const pesos = { 'alta': 1, 'normal': 2, 'baja': 3 };

                const ordenados = vigentes.sort((a, b) => {
                    const pesoA = pesos[a.prioridad.toLowerCase()] || 4;
                    const pesoB = pesos[b.prioridad.toLowerCase()] || 4;

                    if (pesoA !== pesoB) return pesoA - pesoB;
                    return b.id - a.id; // Más nuevo primero si empatan en prioridad
                });

                setAvisos(ordenados);
            } catch (err) {
                console.error("Error procesando avisos:", err);
            }
        };
        fetchAvisos();
    }, [API_URL]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await login(correo, password);
            loginUser(data);
            setError('¡Acceso concedido! Redirigiendo...');

            setTimeout(() => {
                const userRole = Number(data.user.rol || data.user.role_id);
                if (userRole === 1) navigate('/admin');
                else navigate('/gestion');
            }, 1200);

        } catch (err) {
            setError(err);
            if (err.toLowerCase().includes('bloqueada') || err.toLowerCase().includes('intentos')) {
                setIsBlocked(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-split-screen">
            <div className="login-avisos-section">
                <div className="avisos-wrapper">
                    <h2 className="section-title">Avisos del Club</h2>
                    <div className="avisos-list">
                        {avisos.length > 0 ? (
                            avisos.map(aviso => (
                                <div key={aviso.id} className={`aviso-card color-${aviso.prioridad}`}>
                                    <h3>{aviso.titulo}</h3>
                                    <p>{aviso.mensaje}</p>
                                </div>
                            ))
                        ) : (
                            <p className="no-avisos-msg">No hay avisos recientes en la ESCOM.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="login-form-section">
                <div className="login-card">
                    <div className="login-header">
                        <div className="logo-placeholder">🏆</div>
                        <h1 className="login-title">Club Deportivo</h1>
                        <p className="login-subtitle">Gestión Integral - ESCOM IPN</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="input-group">
                            <label className="input-label">Correo Institucional</label>
                            <input
                                type="email"
                                className="login-input"
                                placeholder="ejemplo@ipn.mx"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                style={{ borderColor: isBlocked ? '#ffc107' : '#ddd' }}
                                required
                                disabled={isBlocked || loading}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Contraseña</label>
                            <input
                                type="password"
                                className="login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ borderColor: isBlocked ? '#ffc107' : '#ddd' }}
                                required
                                disabled={isBlocked || loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className={`btn-submit ${isBlocked ? 'btn-disabled' : (loading ? 'btn-loading' : '')}`}
                            disabled={isBlocked || loading}
                        >
                            {loading ? 'Verificando...' : isBlocked ? 'Acceso Suspendido' : 'Entrar al Sistema'}
                        </button>
                    </form>

                    {error && (
                        <div className="error-banner" style={{
                            backgroundColor: error.includes('concedido') ? '#d4edda' : (isBlocked ? '#FFF9E6' : '#F8E8EB'),
                            color: error.includes('concedido') ? '#155724' : (isBlocked ? '#856404' : '#A00020')
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="register-prompt">
                        <p className="prompt-text">¿No tienes una cuenta?</p>
                        <button type="button" onClick={() => navigate('/register')} className="link-button">
                            Regístrate aquí
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;