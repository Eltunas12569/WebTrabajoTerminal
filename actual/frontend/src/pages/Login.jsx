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
    const [isAvisosOpen, setIsAvisosOpen] = useState(true); // Controla la visibilidad del panel de avisos

    const { loginUser } = useAuth();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;
    useEffect(() => {
        const fetchAvisos = async () => {
            try {
                const response = await axios.get(`${API_URL}/avisos`);
                const datosBrutos = response.data;

                // 1. Filtrar: Solo mostrar los avisos que estén activos según el nuevo esquema (avisos_globales)
                const vigentes = datosBrutos.filter(aviso => aviso.activo === 1 || aviso.activo === true);

                // 2. Ordenar por prioridad (alta > normal > baja)
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
        <div style={{ 
            display: 'flex', 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw', 
            minHeight: '100vh', 
            overflow: 'hidden', 
            backgroundColor: '#f0f2f5', 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            margin: 0
        }}>
            
            {/* Panel Lateral de Avisos (Diseño Web Drawer) */}
            <div style={{
                width: isAvisosOpen ? '50%' : '0',
                opacity: isAvisosOpen ? 1 : 0,
                backgroundColor: '#003366',
                color: '#ffffff',
                transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                overflow: 'hidden',
                boxShadow: isAvisosOpen ? '4px 0 25px rgba(0,0,0,0.15)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20
            }}>
                <div style={{ padding: '30px 25px', width: '50vw', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📢</span> Tablero de Avisos
                        </h2>
                        <button 
                            onClick={() => setIsAvisosOpen(false)} 
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.5rem', transition: 'color 0.2s' }}
                            onMouseOver={(e) => e.target.style.color = 'white'}
                            onMouseOut={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
                            title="Ocultar panel"
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                        {avisos.length > 0 ? (
                            avisos.map(aviso => (
                                <div key={aviso.id} style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.06)', 
                                    borderRadius: '10px', 
                                    padding: '20px', 
                                    marginBottom: '15px',
                                    borderLeft: `4px solid ${aviso.prioridad === 'alta' ? '#ff4d4f' : (aviso.prioridad === 'normal' ? '#1890ff' : '#52c41a')}`,
                                    transition: 'transform 0.2s ease',
                                    cursor: 'default'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                                >
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff' }}>{aviso.titulo}</h3>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', fontSize: '0.95rem' }}>{aviso.mensaje}</p>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: '40px' }}>
                                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>📭</span>
                                <p>No hay avisos recientes en la ESCOM.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Área Principal (Diseño Web Centrado) */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                transition: 'all 0.4s ease-in-out',
                backgroundImage: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #f0f2f5 100%)'
            }}>
                {/* Botón flotante para mostrar avisos cuando están ocultos */}
                {!isAvisosOpen && (
                    <button 
                        onClick={() => setIsAvisosOpen(true)} 
                        style={{ 
                            position: 'absolute', top: '30px', left: '30px', 
                            background: '#003366', color: 'white', border: 'none', 
                            padding: '12px 20px', borderRadius: '50px', cursor: 'pointer', 
                            zIndex: 10, boxShadow: '0 4px 15px rgba(0,51,102,0.3)', 
                            fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,51,102,0.4)' }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,51,102,0.3)' }}
                    >
                        <span>🔔</span> Ver Avisos ({avisos.length})
                    </button>
                )}

                {/* Tarjeta de Inicio de Sesión */}
                <div style={{
                    width: '100%',
                    maxWidth: '460px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                    padding: '50px 45px',
                    margin: '20px'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🏆</div>
                        <h1 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '2rem', fontWeight: '700' }}>Sistema de Clubes</h1>
                        <p style={{ margin: 0, color: '#666', fontSize: '1.1rem' }}>Gestión Deportiva - ESCOM IPN</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: '600', color: '#444' }}>Correo Institucional</label>
                            <input
                                type="email"
                                placeholder="ejemplo@ipn.mx"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                style={{ 
                                    padding: '14px 16px', borderRadius: '8px', border: `2px solid ${isBlocked ? '#ffc107' : '#e1e5eb'}`, 
                                    fontSize: '1rem', transition: 'border-color 0.2s', outline: 'none',
                                    backgroundColor: (isBlocked || loading) ? '#f8f9fa' : '#fff'
                                }}
                                onFocus={(e) => !isBlocked && (e.target.style.borderColor = '#003366')}
                                onBlur={(e) => !isBlocked && (e.target.style.borderColor = '#e1e5eb')}
                                required
                                disabled={isBlocked || loading}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: '600', color: '#444' }}>Contraseña</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ 
                                    padding: '14px 16px', borderRadius: '8px', border: `2px solid ${isBlocked ? '#ffc107' : '#e1e5eb'}`, 
                                    fontSize: '1rem', transition: 'border-color 0.2s', outline: 'none',
                                    backgroundColor: (isBlocked || loading) ? '#f8f9fa' : '#fff'
                                }}
                                onFocus={(e) => !isBlocked && (e.target.style.borderColor = '#003366')}
                                onBlur={(e) => !isBlocked && (e.target.style.borderColor = '#e1e5eb')}
                                required
                                disabled={isBlocked || loading}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                marginTop: '10px', padding: '16px', borderRadius: '8px', border: 'none',
                                background: isBlocked ? '#ffc107' : (loading ? '#6c757d' : '#003366'),
                                color: isBlocked ? '#333' : '#fff', fontSize: '1.1rem', fontWeight: 'bold',
                                cursor: (isBlocked || loading) ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s, transform 0.1s',
                                boxShadow: '0 4px 12px rgba(0,51,102,0.2)'
                            }}
                            onMouseOver={(e) => !(isBlocked || loading) && (e.currentTarget.style.background = '#002244')}
                            onMouseOut={(e) => !(isBlocked || loading) && (e.currentTarget.style.background = '#003366')}
                            onMouseDown={(e) => !(isBlocked || loading) && (e.currentTarget.style.transform = 'scale(0.98)')}
                            onMouseUp={(e) => !(isBlocked || loading) && (e.currentTarget.style.transform = 'scale(1)')}
                            disabled={isBlocked || loading}
                        >
                            {loading ? 'Verificando credenciales...' : isBlocked ? 'Acceso Suspendido' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {error && (
                        <div style={{
                            marginTop: '25px', padding: '15px', borderRadius: '8px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '500',
                            backgroundColor: error.includes('concedido') ? '#d4edda' : (isBlocked ? '#fff3cd' : '#f8d7da'),
                            color: error.includes('concedido') ? '#155724' : (isBlocked ? '#856404' : '#721c24'),
                            border: `1px solid ${error.includes('concedido') ? '#c3e6cb' : (isBlocked ? '#ffeeba' : '#f5c6cb')}`
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginTop: '35px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '25px' }}>
                        <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.95rem' }}>¿Eres estudiante y quieres unirte?</p>
                        <button 
                            type="button" 
                            onClick={() => navigate('/register')} 
                            style={{
                                background: 'none', border: 'none', color: '#003366', fontSize: '1rem', fontWeight: 'bold', 
                                cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.color = '#0055ff'}
                            onMouseOut={(e) => e.target.style.color = '#003366'}
                        >
                            Crear una cuenta de atleta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;