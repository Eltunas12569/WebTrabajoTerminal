import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../services/api';
import './css/Dashboards.css';

const CanalesChatPage = ({ canalInicial }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Determina el canal según la ruta o la prop
    const canalPredeterminado = canalInicial 
        || (location.pathname.includes('encargados') ? 'encargados' : 'directivos');

    const [canalActivo, setCanalActivo] = useState(canalPredeterminado);
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [loading, setLoading] = useState(true);
    const [permisos, setPermisos] = useState({
        esAdmin: false,
        esEncargado: false,
        cargado: false
    });
    const [errorAcceso, setErrorAcceso] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Verificar los roles y membresías de clubes para validar acceso
    useEffect(() => {
        const verificarPermisos = async () => {
            if (!user?.id) return;

            const esAdmin = Number(user.role_id) === 1 || user.rol === 1;

            try {
                // Consultamos los clubes del usuario para verificar si es encargado de alguno
                const res = await api.get(`/clubes/user/${user.id}`);
                const clubs = res.data || [];
                const esEncargado = clubs.some(c => 
                    ['encargado_profesor', 'encargado_alumno'].includes(c.mi_rol_interno) 
                    && c.inscripcion_estatus === 'activo'
                );

                setPermisos({
                    esAdmin,
                    esEncargado,
                    cargado: true
                });

                // Si el canal activo es 'encargados' y es admin puro (no encargado), cambiar a directivos
                if (canalActivo === 'encargados' && esAdmin && !esEncargado) {
                    setCanalActivo('directivos');
                }

                // Si no tiene ningún permiso para este tipo de chats
                if (!esAdmin && !esEncargado) {
                    setErrorAcceso('Acceso restringido: Estas salas de comunicación están reservadas para administradores y encargados oficiales de clubes.');
                }
            } catch (err) {
                console.error('Error verificando permisos de chat:', err);
                if (esAdmin) {
                    setPermisos({ esAdmin: true, esEncargado: false, cargado: true });
                } else {
                    setErrorAcceso('No fue posible validar tus permisos de acceso.');
                }
            } finally {
                setLoading(false);
            }
        };

        verificarPermisos();
    }, [user, canalActivo]);

    // 2. Cargar historial y conectar WebSocket según el canal activo
    useEffect(() => {
        if (!permisos.cargado || errorAcceso) return;

        // Desconectar socket previo si existe
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const fetchHistorial = async () => {
            try {
                const endpoint = canalActivo === 'directivos' 
                    ? '/clubes/chat-directivos/historial'
                    : '/clubes/chat-encargados/historial';

                const res = await api.get(endpoint);
                setMensajes(res.data || []);
                setTimeout(scrollToBottom, 100);
            } catch (err) {
                console.error('Error cargando historial de chat:', err);
                if (err.response?.status === 403) {
                    setErrorAcceso('No tienes privilegios para acceder a este canal de comunicación.');
                }
            }
        };

        fetchHistorial();

        const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
        const token = localStorage.getItem('token');
        const socket = io(socketUrl, {
            auth: { token }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            if (canalActivo === 'directivos') {
                socket.emit('unirse_chat_directivos');
            } else {
                socket.emit('unirse_chat_encargados');
            }
        });

        const handleNuevoMensaje = (mensaje) => {
            setMensajes((prev) => [...prev, mensaje]);
            setTimeout(scrollToBottom, 100);
        };

        if (canalActivo === 'directivos') {
            socket.on('nuevo_mensaje_directivos', handleNuevoMensaje);
        } else {
            socket.on('nuevo_mensaje_encargados', handleNuevoMensaje);
        }

        socket.on('error_socket', (msg) => {
            console.error('Error en sala de socket:', msg);
        });

        return () => {
            socket.disconnect();
        };
    }, [canalActivo, permisos.cargado, errorAcceso]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() || !socketRef.current) return;

        if (canalActivo === 'directivos') {
            socketRef.current.emit('enviar_mensaje_directivos', {
                mensaje: nuevoMensaje.trim()
            });
        } else {
            socketRef.current.emit('enviar_mensaje_encargados', {
                mensaje: nuevoMensaje.trim()
            });
        }

        setNuevoMensaje('');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        const text = name || 'U';
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const handleBack = () => {
        if (permisos.esAdmin) navigate('/admin');
        else navigate('/gestion');
    };

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">
                        {canalActivo === 'directivos' ? '🏛️ Sala de Directivos' : '🤝 Sala de Encargados'}
                    </span>
                </div>
                <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        🔙 Volver
                    </button>
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, {user?.nombres}</span>
                        <div
                            className="profile-bubble"
                            style={{ backgroundColor: getAvatarColor(user?.nombres) }}
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
                            {(user?.nombres || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            {/* LAYOUT CON SIDEBAR Y CONTENIDO */}
            <div className="dashboard-layout">
                <aside className={`admin-sidebar-fixed ${isSidebarOpen ? 'active' : ''}`}>
                    <nav className="sidebar-links">
                        <ul>
                            {permisos.esAdmin ? (
                                <>
                                    <li onClick={() => navigate('/admin')}>🏠 Inicio</li>
                                    <li onClick={() => navigate('/admin')}>📋 Lista de Clubs</li>
                                    <li onClick={() => navigate('/admin/avisos')}>📢 Gestión de Avisos</li>
                                    <li onClick={() => navigate('/admin/usuarios')}>👥 Usuarios del sistema</li>
                                    <li 
                                        onClick={() => { setCanalActivo('directivos'); setIsSidebarOpen(false); }}
                                        style={canalActivo === 'directivos' ? { backgroundColor: 'rgba(255,255,255,0.15)', fontWeight: 'bold' } : {}}
                                    >
                                        🏛️ Chat Directivos
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li onClick={() => navigate('/gestion')}>🏠 Inicio</li>
                                    <li onClick={() => navigate('/gestion')}>📅 Mis Clubs</li>
                                    {permisos.esEncargado && (
                                        <>
                                            <li 
                                                onClick={() => { setCanalActivo('directivos'); setIsSidebarOpen(false); }}
                                                style={canalActivo === 'directivos' ? { backgroundColor: 'rgba(255,255,255,0.15)', fontWeight: 'bold' } : {}}
                                            >
                                                🏛️ Chat Directivos
                                            </li>
                                            <li 
                                                onClick={() => { setCanalActivo('encargados'); setIsSidebarOpen(false); }}
                                                style={canalActivo === 'encargados' ? { backgroundColor: 'rgba(255,255,255,0.15)', fontWeight: 'bold' } : {}}
                                            >
                                                🤝 Chat Encargados
                                            </li>
                                        </>
                                    )}
                                </>
                            )}
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll" style={{ padding: 0, height: 'calc(100vh - 65px)', marginTop: '65px', display: 'flex', flexDirection: 'column' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#003366' }}>
                            Conectando a las salas de comunicación...
                        </div>
                    ) : errorAcceso ? (
                        <div style={{ maxWidth: '600px', margin: '60px auto', padding: '30px', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                            <span style={{ fontSize: '3rem' }}>🚫</span>
                            <h2 style={{ color: '#c53030', marginTop: '15px' }}>Acceso No Autorizado</h2>
                            <p style={{ color: '#555', lineHeight: '1.6', margin: '15px 0' }}>{errorAcceso}</p>
                            <button onClick={handleBack} className="btn-crear-club" style={{ marginTop: '10px', maxWidth: '220px' }}>
                                ← Volver al inicio
                            </button>
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#e5ddd5' }}>
                            {/* Selector de Canales / Cabecera de la Sala */}
                            <div style={{ backgroundColor: '#002244', color: '#fff', padding: '12px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                                        {canalActivo === 'directivos' ? '🏛️ Sala General de Directivos' : '🤝 Sala Exclusiva de Encargados'}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#d4edda' }}>
                                        {canalActivo === 'directivos' 
                                            ? 'Canal institucional entre Administrador y Encargados de clubes' 
                                            : 'Canal exclusivo para intercambio entre Profesores Titulares y Alumnos Encargados'}
                                    </span>
                                </div>

                                {/* Selector de canales (si tiene acceso a ambos) */}
                                {permisos.esEncargado && (
                                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setCanalActivo('directivos')}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: canalActivo === 'directivos' ? '#fff' : 'transparent',
                                                color: canalActivo === 'directivos' ? '#003366' : '#fff',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            🏛️ Directivos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCanalActivo('encargados')}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: canalActivo === 'encargados' ? '#fff' : 'transparent',
                                                color: canalActivo === 'encargados' ? '#003366' : '#fff',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            🤝 Encargados
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Área de Mensajes */}
                            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {mensajes.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#666', marginTop: '30px', backgroundColor: 'rgba(255,255,255,0.85)', padding: '15px 25px', borderRadius: '8px', alignSelf: 'center', maxWidth: '400px' }}>
                                        💬 No hay mensajes recientes en esta sala. ¡Comienza la conversación institucional!
                                    </div>
                                ) : (
                                    mensajes.map((msg, idx) => {
                                        const isMe = msg.usuario_id === user.id;
                                        const isAdminSender = Number(msg.autor_rol || msg.rol_usuario) === 1;

                                        return (
                                            <div key={msg.id || idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', minWidth: '180px' }}>
                                                {!isMe && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', marginLeft: '6px' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>
                                                            {msg.autor_nombre}
                                                        </span>
                                                        {isAdminSender ? (
                                                            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: '#003366', color: '#fff', fontWeight: 'bold' }}>
                                                                🛡️ Administrador
                                                            </span>
                                                        ) : msg.etiqueta_encargado ? (
                                                            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: '#e7f3ff', color: '#00509e', fontWeight: 'bold' }}>
                                                                {msg.etiqueta_encargado}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                )}

                                                <div
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: '12px',
                                                        backgroundColor: isMe ? '#dcf8c6' : '#fff',
                                                        color: '#111',
                                                        borderTopRightRadius: isMe ? '0' : '12px',
                                                        borderTopLeftRadius: !isMe ? '0' : '12px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.95rem', wordBreak: 'break-word', marginBottom: '14px', lineHeight: '1.4' }}>
                                                        {msg.mensaje}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: '#888', textAlign: 'right', position: 'absolute', bottom: '4px', right: '10px' }}>
                                                        {msg.fecha_envio 
                                                            ? new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Barra de Entrada de Mensaje */}
                            <form onSubmit={handleSend} style={{ display: 'flex', padding: '15px 20px', backgroundColor: '#f0f0f0', alignItems: 'center', borderTop: '1px solid #ddd' }}>
                                <input
                                    type="text"
                                    value={nuevoMensaje}
                                    onChange={(e) => setNuevoMensaje(e.target.value)}
                                    placeholder={`Enviar mensaje a la ${canalActivo === 'directivos' ? 'sala de directivos' : 'sala de encargados'}...`}
                                    style={{ flex: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid #ccc', outline: 'none', fontSize: '0.95rem' }}
                                />
                                <button
                                    type="submit"
                                    disabled={!nuevoMensaje.trim()}
                                    style={{
                                        marginLeft: '10px',
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        backgroundColor: nuevoMensaje.trim() ? '#003366' : '#a0a0a0',
                                        color: '#fff',
                                        cursor: nuevoMensaje.trim() ? 'pointer' : 'default',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: '1.2rem',
                                        transition: 'background 0.2s'
                                    }}
                                    title="Enviar mensaje"
                                >
                                    ➤
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CanalesChatPage;

