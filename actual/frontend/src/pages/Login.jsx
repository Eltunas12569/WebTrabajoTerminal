import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/Login.css';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [avisos, setAvisos] = useState([]);
    const [isAvisosOpen, setIsAvisosOpen] = useState(false); // Controla la visibilidad del panel de avisos
    const [showPassword, setShowPassword] = useState(false); // Controla si se muestra la contraseña

    const { loginUser } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        const fetchAvisos = async () => {
            try {
                const response = await api.get('/avisos');
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
    }, []);

    // Efecto para recuperar el error y el correo si la página se recarga inesperadamente
    useEffect(() => {
        const savedError = sessionStorage.getItem('login_error');
        const savedCorreo = sessionStorage.getItem('login_correo');
        
        if (savedError) {
            setError(savedError);
            sessionStorage.removeItem('login_error'); // Lo eliminamos para que no vuelva a salir si navega normal
            if (savedCorreo) setCorreo(savedCorreo);
        }
    }, []);

    const handleSubmit = async (e) => {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
        setLoading(true);
        setError('');

        try {
            const data = await login(correo, password);
            loginUser(data);
            setError('¡Acceso concedido! Redirigiendo...');

            // Si se loguea exitosamente, limpiamos el storage
            sessionStorage.removeItem('login_error');
            sessionStorage.removeItem('login_correo');

            setTimeout(() => {
                if (!data?.user?.verificado) {
                    navigate('/verificar-cuenta');
                    return;
                }
                const userRole = Number(data?.user?.role_id || 2);
                if (userRole === 1) navigate('/admin');
                else navigate('/gestion');
            }, 1000);

        } catch (err) {
            console.error("Error capturado en el login:", err);
            
            // Extracción ultra-segura para evitar cualquier crasheo de renderizado
            let textoError = 'contraseña o/y correo incorrectos';
            try {
                if (typeof err === 'string') {
                    textoError = err;
                } else if (err && typeof err === 'object') {
                    textoError = err.message || err.msg || 'contraseña o/y correo incorrectos';
                }

                // Unificamos el mensaje para no revelar si el correo existe o no (Mejor práctica de seguridad)
                if (textoError.includes('correo electrónico no está registrado') || textoError.includes('Contraseña incorrecta')) {
                    textoError = 'contraseña o/y correo incorrectos';
                }
            } catch (fallbackErr) {
                console.error("Error al extraer el mensaje:", fallbackErr);
            }

            
            
            setError(String(textoError));
            
            // Guardamos el error y el correo en sessionStorage por si Vite recarga la página
            sessionStorage.setItem('login_error', String(textoError));
            sessionStorage.setItem('login_correo', correo);
            
            // Limpiamos la contraseña para que el usuario la vuelva a intentar, manteniendo el correo
            setPassword(''); 
            
            const errorLower = String(textoError).toLowerCase();
            if (errorLower.includes('bloqueada') || errorLower.includes('intentos')) {
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
            width: '100%', 
            height: '100vh', 
            overflow: 'hidden', 
            backgroundColor: '#f0f2f5', 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            margin: 0
        }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            
            {/* Panel Lateral de Avisos (Diseño Web Drawer) */}
            <div style={{
                width: isAvisosOpen ? '40%' : '0',
                flexShrink: 0,
                opacity: isAvisosOpen ? 1 : 0,
                backgroundColor: '#003366',
                color: '#ffffff',
                transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                overflow: 'hidden',
                boxShadow: isAvisosOpen ? '4px 0 25px rgba(0,0,0,0.15)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20,
                position: 'relative'
            }}>
                {/* Pestañita para contraer */}
                <button 
                    onClick={() => setIsAvisosOpen(false)} 
                    style={{
                        position: 'absolute',
                        right: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '30px',
                        height: '80px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRight: 'none',
                        borderRadius: '8px 0 0 8px',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                        zIndex: 25
                    }}
                    onMouseOver={(e) => { 
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                        e.target.style.color = 'white';
                        e.target.style.width = '35px';
                    }}
                    onMouseOut={(e) => { 
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                        e.target.style.color = 'rgba(255,255,255,0.8)';
                        e.target.style.width = '30px';
                    }}
                    title="Contraer panel"
                >
                    ◀
                </button>

                <div style={{ padding: '30px 25px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📢</span> Tablero de Avisos
                        </h2>
                    </div>

                    <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
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
                backgroundImage: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #f0f2f5 100%)',
                overflowY: 'auto'
            }}>
                {/* Botón flotante para mostrar avisos cuando están ocultos */}
                {!isAvisosOpen && (
                    <button 
                        onClick={() => setIsAvisosOpen(true)} 
                        style={{ 
                            position: 'absolute', top: '20px', left: '20px', 
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
                    margin: 'auto 20px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🏆</div>
                        <h1 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '2rem', fontWeight: '700' }}>Sistema de Clubes</h1>
                        <p style={{ margin: 0, color: '#666', fontSize: '1.1rem' }}>Gestión Deportiva - ESCOM IPN</p>
                    </div>

                    <div 
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSubmit(e); 
                            }
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}
                    >
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
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ 
                                        width: '100%', boxSizing: 'border-box',
                                        padding: '14px 45px 14px 16px', borderRadius: '8px', border: `2px solid ${isBlocked ? '#ffc107' : '#e1e5eb'}`, 
                                        fontSize: '1rem', transition: 'border-color 0.2s', outline: 'none',
                                        backgroundColor: (isBlocked || loading) ? '#f8f9fa' : '#fff'
                                    }}
                                    onFocus={(e) => !isBlocked && (e.target.style.borderColor = '#003366')}
                                    onBlur={(e) => !isBlocked && (e.target.style.borderColor = '#e1e5eb')}
                                    required
                                    disabled={isBlocked || loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isBlocked || loading}
                                    style={{
                                        position: 'absolute', right: '10px', background: 'none', border: 'none',
                                        cursor: (isBlocked || loading) ? 'not-allowed' : 'pointer', 
                                        fontSize: '1.2rem', color: '#666', padding: '5px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {showPassword ? '👁️‍🗨️' : '◡'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmit}
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
                    </div>

                    {error && (
                        <div style={{
                            marginTop: '25px', padding: '15px', borderRadius: '8px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '500',
                            backgroundColor: String(error).includes('concedido') ? '#d4edda' : (isBlocked ? '#fff3cd' : '#f8d7da'),
                            color: String(error).includes('concedido') ? '#155724' : (isBlocked ? '#856404' : '#721c24'),
                            border: `1px solid ${String(error).includes('concedido') ? '#c3e6cb' : (isBlocked ? '#ffeeba' : '#f5c6cb')}`
                        }}>
                            {String(error)}
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