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
    const [avisoSeleccionado, setAvisoSeleccionado] = useState(null); // Aviso seleccionado para ventana flotante

    const { loginUser } = useAuth();
    const navigate = useNavigate();

    // Cerrar modal flotante con tecla Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setAvisoSeleccionado(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    useEffect(() => {
        const fetchAvisos = async () => {
            try {
                const response = await api.get('/avisos');
                const datosBrutos = Array.isArray(response.data) ? response.data : [];

                // 1. Filtrar: mantener activos si viene el campo activo o los ya filtrados por el backend
                const vigentes = datosBrutos.filter(aviso => aviso.activo === undefined || aviso.activo === 1 || aviso.activo === true);

                // 2. Normalizar campos para compatibilidad (backend envía descripcion y tiempo)
                const normalizados = vigentes.map(aviso => ({
                    ...aviso,
                    mensaje: aviso.contenido || aviso.descripcion || aviso.mensaje || 'Sin descripción',
                    prioridad: (aviso.prioridad || 'normal').toLowerCase().trim(),
                    tiempo: aviso.fecha_envio || aviso.tiempo || null
                }));

                // 3. Ordenar estrictamente por prioridad (alta > normal > baja) y luego por fecha/id
                const pesosPrioridad = {
                    alta: 1,
                    urgente: 1,
                    normal: 2,
                    media: 2,
                    baja: 3,
                    informativo: 3,
                    informativa: 3
                };

                const ordenados = [...normalizados].sort((a, b) => {
                    const prioridadA = String(a.prioridad || '').toLowerCase().trim();
                    const prioridadB = String(b.prioridad || '').toLowerCase().trim();

                    const pesoA = pesosPrioridad[prioridadA] ?? 2;
                    const pesoB = pesosPrioridad[prioridadB] ?? 2;

                    if (pesoA !== pesoB) return pesoA - pesoB;

                    const tA = a.tiempo ? new Date(a.tiempo).getTime() : 0;
                    const tB = b.tiempo ? new Date(b.tiempo).getTime() : 0;
                    if (tA !== tB) return tB - tA;

                    return (Number(b.id) || 0) - (Number(a.id) || 0); // Más nuevo primero si empatan
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
        <div className="login-screen" style={{ 
            display: 'flex', 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%', 
            height: '100dvh',
            minHeight: '100vh',
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
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .aviso-modal-anim {
                    animation: modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
            
            {/* Panel Lateral de Avisos (Diseño Web Drawer) */}
            <div style={{
                width: isAvisosOpen ? 'clamp(320px, 35vw, 480px)' : '0',
                height: '100%',
                minHeight: 0,
                flexShrink: 0,
                opacity: isAvisosOpen ? 1 : 0,
                backgroundColor: '#003366',
                color: '#ffffff',
                transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                overflow: 'hidden',
                boxShadow: isAvisosOpen ? '4px 0 25px rgba(0,0,0,0.2)' : 'none',
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

                <div style={{ padding: '24px 20px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📢</span> Tablero de Avisos
                        </h2>
                        <button
                            onClick={() => setIsAvisosOpen(false)}
                            style={{
                                background: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'}
                        >
                            ✕ Cerrar
                        </button>
                    </div>

                    <div className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '5px' }}>
                        {avisos.length > 0 ? (
                            avisos.map(aviso => (
                                <div 
                                    key={aviso.id} 
                                    onClick={() => setAvisoSeleccionado(aviso)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setAvisoSeleccionado(aviso);
                                        }
                                    }}
                                    style={{ 
                                        backgroundColor: 'rgba(255,255,255,0.08)', 
                                        borderRadius: '10px', 
                                        padding: '16px 18px', 
                                        marginBottom: '14px',
                                        borderLeft: `4px solid ${
                                            aviso.prioridad === 'alta' || aviso.prioridad === 'urgente'
                                                ? '#ff4d4f'
                                                : (aviso.prioridad === 'normal' || aviso.prioridad === 'media' ? '#1890ff' : '#52c41a')
                                        }`,
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px) translateX(3px)';
                                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) translateX(0)';
                                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    }}
                                    title="Haz clic para ver el aviso completo"
                                >
                                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span 
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: aviso.prioridad === 'alta' || aviso.prioridad === 'urgente'
                                                    ? '#ff4d4f'
                                                    : (aviso.prioridad === 'normal' || aviso.prioridad === 'media' ? '#1890ff' : '#52c41a'),
                                                display: 'inline-block',
                                                flexShrink: 0
                                            }}
                                        />
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: '600', lineHeight: '1.3' }}>
                                            {aviso.titulo}
                                        </h3>
                                    </div>
                                    <p style={{ 
                                        margin: '0 0 10px 0', 
                                        color: 'rgba(255,255,255,0.85)', 
                                        lineHeight: '1.5', 
                                        fontSize: '0.9rem', 
                                        wordBreak: 'break-word',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {aviso.mensaje}
                                    </p>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        fontSize: '0.78rem', 
                                        color: 'rgba(255,255,255,0.6)',
                                        borderTop: '1px solid rgba(255,255,255,0.1)',
                                        paddingTop: '8px',
                                        marginTop: '4px'
                                    }}>
                                        {aviso.tiempo ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>📅</span>
                                                <span>{new Date(aviso.tiempo).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                            </span>
                                        ) : <span />}
                                        <span style={{ color: '#91d5ff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            Ver completo ↗
                                        </span>
                                    </div>
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
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                transition: 'all 0.4s ease-in-out',
                backgroundImage: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #f0f2f5 100%)',
                overflow: 'hidden'
            }}>
                <div className="login-brand-watermark" aria-hidden="true">
                    <img src="/IMG_0999%20(1).png" alt="" />
                </div>
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
                <div className="login-access-card" style={{
                    width: '100%',
                    maxWidth: '460px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                    padding: 'clamp(18px, 3.5vh, 34px) clamp(22px, 3.5vw, 38px)',
                    margin: 'auto 20px',
                    boxSizing: 'border-box',
                    maxHeight: 'calc(100% - 40px)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 'clamp(14px, 2.5vh, 26px)' }}>
                        <div className="login-logo-main login-logo-compact">
                            <img src="/IMG_1003-Photoroom%20(1).png" alt="Logo del Sistema de Clubes ESCOM" />
                        </div>
                        <h1 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '2rem', fontWeight: '700' }}>Sistema de Clubes</h1>
                        <p style={{ margin: 0, color: '#666', fontSize: '1.1rem' }}>Gestión de clubs</p>
                    </div>

                    <div 
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSubmit(e); 
                            }
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.8vh, 16px)' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: '600', color: '#444' }}>Correo Institucional</label>
                            <input
                                type="email"
                                placeholder="ejemplo@ipn.mx"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                style={{ 
                                    padding: '10px 13px', borderRadius: '8px', border: `2px solid ${isBlocked ? '#ffc107' : '#e1e5eb'}`, 
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
                                        padding: '10px 43px 10px 13px', borderRadius: '8px', border: `2px solid ${isBlocked ? '#ffc107' : '#e1e5eb'}`, 
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
                                marginTop: '4px', padding: '12px', borderRadius: '8px', border: 'none',
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
                            marginTop: '14px', padding: '10px 12px', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '500',
                            backgroundColor: String(error).includes('concedido') ? '#d4edda' : (isBlocked ? '#fff3cd' : '#f8d7da'),
                            color: String(error).includes('concedido') ? '#155724' : (isBlocked ? '#856404' : '#721c24'),
                            border: `1px solid ${String(error).includes('concedido') ? '#c3e6cb' : (isBlocked ? '#ffeeba' : '#f5c6cb')}`
                        }}>
                            {String(error)}
                        </div>
                    )}

                    <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                        <button 
                            type="button" 
                            onClick={() => navigate('/recuperar-password')} 
                            style={{
                                background: 'none', border: 'none', color: '#800020', fontSize: '0.95rem', fontWeight: '600',
                                cursor: 'pointer', textDecoration: 'underline', marginBottom: '20px'
                            }}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
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

                        <div style={{ 
                            marginTop: '18px', 
                            paddingTop: '12px', 
                            borderTop: '1px solid #f0f0f0', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '12px', 
                            fontSize: '0.82rem', 
                            color: '#888' 
                        }}>
                            <button
                                type="button"
                                onClick={() => navigate('/terminos-condiciones')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#555',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'none'
                                }}
                                onMouseOver={(e) => { e.target.style.color = '#003366'; e.target.style.textDecoration = 'underline'; }}
                                onMouseOut={(e) => { e.target.style.color = '#555'; e.target.style.textDecoration = 'none'; }}
                            >
                                Términos y Condiciones
                            </button>
                            <span>·</span>
                            <button
                                type="button"
                                onClick={() => navigate('/aviso-privacidad')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#555',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'none'
                                }}
                                onMouseOver={(e) => { e.target.style.color = '#003366'; e.target.style.textDecoration = 'underline'; }}
                                onMouseOut={(e) => { e.target.style.color = '#555'; e.target.style.textDecoration = 'none'; }}
                            >
                                Aviso de Privacidad
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Flotante de Aviso Detallado */}
            {avisoSeleccionado && (
                <div 
                    onClick={() => setAvisoSeleccionado(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(4, 18, 38, 0.7)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '16px',
                        boxSizing: 'border-box'
                    }}
                >
                    <div 
                        className="aviso-modal-anim"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '620px',
                            maxHeight: '85vh',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
                        {/* Cabecera */}
                        <div style={{
                            padding: '18px 24px',
                            backgroundColor: '#003366',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '16px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📢</span>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>
                                        Aviso de la Comunidad ESCOM
                                    </span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', lineHeight: '1.35', color: '#ffffff' }}>
                                    {avisoSeleccionado.titulo}
                                </h3>
                            </div>
                            <button
                                onClick={() => setAvisoSeleccionado(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: 'none',
                                    color: '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background-color 0.2s',
                                    flexShrink: 0
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Cerrar ventana"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Fecha */}
                        {avisoSeleccionado.tiempo && (
                            <div style={{
                                padding: '12px 24px 0 24px',
                                fontSize: '0.85rem',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>📅 Publicado el:</span>
                                <span style={{ fontWeight: '500' }}>
                                    {new Date(avisoSeleccionado.tiempo).toLocaleDateString('es-MX', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        )}

                        {/* Contenido / Cuerpo con scroll */}
                        <div 
                            style={{
                                padding: '16px 24px 24px 24px',
                                overflowY: 'auto',
                                flex: 1,
                                fontSize: '1rem',
                                lineHeight: '1.7',
                                color: '#1e293b',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            {avisoSeleccionado.mensaje}
                        </div>

                        {/* Pie de modal */}
                        <div style={{
                            padding: '12px 24px',
                            borderTop: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setAvisoSeleccionado(null)}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#003366',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '0.92rem',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    boxShadow: '0 2px 6px rgba(0, 51, 102, 0.2)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#002244'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#003366'}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;