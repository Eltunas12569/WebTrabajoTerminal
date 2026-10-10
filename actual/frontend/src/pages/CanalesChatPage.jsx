import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../services/api';
import './css/Dashboards.css';
import './css/ChatModerno.css';
import Sidebar from '../components/Sidebar';

// Icono vectorial de envío tipo avión de papel
const SendIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);

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

    const handleSelectCanal = (nuevoCanal) => {
        if (nuevoCanal === 'encargados' && !permisos.esEncargado) {
            setErrorAcceso('Acceso restringido: La sala de Encargados es exclusiva para encargados oficiales de clubes.');
            return;
        }
        setErrorAcceso('');
        setCanalActivo(nuevoCanal);
        navigate(nuevoCanal === 'directivos' ? '/chat-directivos' : '/chat-encargados');
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
                    navigate('/chat-directivos', { replace: true });
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
    }, [user, canalActivo, navigate]);

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
            setErrorAcceso(typeof msg === 'string' ? msg : 'Acceso denegado a este canal de chat.');
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
            '#003366', '#800020', '#0284c7', '#059669',
            '#7c3aed', '#d97706', '#475569', '#0d9488'
        ];
        const text = name || 'U';
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else if (permisos.esAdmin) {
            navigate('/admin');
        } else {
            navigate('/gestion');
        }
    };

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">
                        {canalActivo === 'directivos' ? 'Sala de Directivos' : '🤝 Sala de Encargados'}
                    </span>
                </div>
                <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="btn-volver-nav"
                    >
                        <span className="btn-volver-icon">←</span>
                        <span>Volver</span>
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
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    canalActivo={canalActivo}
                    onSelectCanal={handleSelectCanal}
                    esEncargado={permisos.esEncargado}
                />

                <main className="admin-main-scroll" style={{ padding: 0, height: 'calc(100vh - 65px)', marginTop: '65px', display: 'flex', flexDirection: 'column' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '1.15rem', color: '#003366', fontWeight: '600' }}>
                            Conectando a las salas de comunicación institucional...
                        </div>
                    ) : errorAcceso ? (
                        <div style={{ maxWidth: '580px', margin: '60px auto', padding: '36px', background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}>🚫</span>
                            <h2 style={{ color: '#c53030', margin: '0 0 10px 0', fontSize: '1.4rem' }}>Acceso No Autorizado</h2>
                            <p style={{ color: '#475569', lineHeight: '1.6', margin: '15px 0' }}>{errorAcceso}</p>
                            <button onClick={handleBack} className="btn-crear-club" style={{ marginTop: '10px', maxWidth: '220px' }}>
                                ← Volver al inicio
                            </button>
                        </div>
                    ) : (
                        <div className="chat-page-wrapper">
                            {/* Selector de Canales / Cabecera moderna de la Sala */}
                            <div className="chat-room-header">
                                <div className="chat-room-info">
                                    <div className="chat-room-title-row">
                                        <h2 className="chat-room-title">
                                            {canalActivo === 'directivos' ? 'Sala General de Directivos' : '🤝 Sala Exclusiva de Encargados'}
                                        </h2>
                                    </div>
                                    <p className="chat-room-desc">
                                        {canalActivo === 'directivos' 
                                            ? 'Canal institucional entre Administración ESCOM y Encargados de clubes' 
                                            : 'Canal exclusivo para intercambio entre Profesores Titulares y Alumnos Encargados'}
                                    </p>
                                </div>

                                {/* Selector de canales (si tiene acceso a ambos) */}
                                {permisos.esEncargado && (
                                    <div className="chat-channel-switcher">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectCanal('directivos')}
                                            className={`chat-channel-pill ${canalActivo === 'directivos' ? 'active' : ''}`}
                                        >
                                            Directivos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectCanal('encargados')}
                                            className={`chat-channel-pill ${canalActivo === 'encargados' ? 'active' : ''}`}
                                        >
                                            Encargados
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Área de Mensajes */}
                            <div className="chat-messages-area">
                                {mensajes.length === 0 ? (
                                    <div className="chat-empty-state">
                                        <div className="chat-empty-icon">💬</div>
                                        <h3 className="chat-empty-title">
                                            {canalActivo === 'directivos' ? 'Sala General de Directivos' : 'Sala Exclusiva de Encargados'}
                                        </h3>
                                        <p className="chat-empty-subtitle">
                                            No hay mensajes previos en esta sala institucional. ¡Sé el primero en iniciar la conversación en tiempo real!
                                        </p>
                                    </div>
                                ) : (
                                    mensajes.map((msg, idx) => {
                                        const isMe = msg.usuario_id === user.id;
                                        const isAdminSender = Number(msg.autor_rol || msg.rol_usuario) === 1;

                                        return (
                                            <div 
                                                key={msg.id || idx} 
                                                className={`chat-message-row ${isMe ? 'me' : 'other'}`}
                                            >
                                                {!isMe && (
                                                    <div
                                                        className="chat-author-avatar"
                                                        style={{ backgroundColor: getAvatarColor(msg.autor_nombre) }}
                                                        title={msg.autor_nombre}
                                                    >
                                                        {(msg.autor_nombre || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}

                                                <div className="chat-message-content">
                                                    {!isMe && (
                                                        <div className="chat-message-meta-header">
                                                            <span className="chat-message-author-name">
                                                                {msg.autor_nombre}
                                                            </span>
                                                            {isAdminSender ? (
                                                                <span className="chat-role-badge chat-role-admin">
                                                                    🛡️ Administrador
                                                                </span>
                                                            ) : msg.etiqueta_encargado ? (
                                                                <span className="chat-role-badge chat-role-encargado">
                                                                    {msg.etiqueta_encargado}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    )}

                                                    <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                                                        <p className="chat-bubble-text">{msg.mensaje}</p>
                                                        <div className="chat-bubble-footer">
                                                            <span>
                                                                {msg.fecha_envio 
                                                                    ? new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : ''}
                                                            </span>
                                                            {isMe && <span className="chat-read-tick">✓</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Barra de Entrada de Mensaje */}
                            <div className="chat-input-bar-container">
                                <form onSubmit={handleSend} className="chat-input-form">
                                    <input
                                        type="text"
                                        value={nuevoMensaje}
                                        onChange={(e) => setNuevoMensaje(e.target.value)}
                                        placeholder={`Escribe un mensaje para la ${canalActivo === 'directivos' ? 'sala de directivos' : 'sala de encargados'}...`}
                                        className="chat-input-field"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!nuevoMensaje.trim()}
                                        className="chat-send-btn"
                                        title="Enviar mensaje"
                                    >
                                        <SendIcon />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CanalesChatPage;
