import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../services/api';
import './css/Dashboards.css';
import './css/ChatModerno.css';

// Icono vectorial de envío tipo avión de papel
const SendIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);

const ClubChatPage = () => {
    const { id: clubId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorAcceso, setErrorAcceso] = useState('');

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getAvatarColor = (name) => {
        const colors = [
            '#003366', '#800020', '#0284c7', '#059669',
            '#7c3aed', '#d97706', '#475569', '#0d9488'
        ];
        const text = name || 'U';
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Obtener la información del club y verificar permisos
    useEffect(() => {
        const fetchClubInfo = async () => {
            if (!user?.id) return;
            const esAdmin = Number(user.role_id) === 1 || user.rol === 1;

            try {
                let foundClub = null;

                if (esAdmin) {
                    const response = await api.get('/clubes');
                    foundClub = response.data.find(c => String(c.id) === String(clubId));
                } else {
                    const response = await api.get(`/clubes/user/${user.id}`);
                    foundClub = response.data.find(c => String(c.id) === String(clubId));
                }
                
                if (!foundClub) {
                    setErrorAcceso('No perteneces a este club o el club especificado no existe.');
                    return;
                }

                // Si no es administrador, verificar membresía activa y estatus del club
                if (!esAdmin) {
                    if (foundClub.inscripcion_estatus !== 'activo') {
                        setErrorAcceso('Tu solicitud de inscripción a este club aún no ha sido aprobada o está inactiva.');
                        return;
                    }
                    if (['en_revision', 'esperando_firmas', 'inactivo', 'rechazado'].includes(foundClub.estatus)) {
                        setErrorAcceso(`El chat no está disponible. Estatus actual del club: ${foundClub.estatus.replace('_', ' ')}.`);
                        return;
                    }
                }

                setClub(foundClub);
            } catch (error) {
                console.error("Error al validar acceso al club:", error);
                setErrorAcceso('No fue posible validar tus permisos de acceso a este club.');
            } finally {
                setLoading(false);
            }
        };

        fetchClubInfo();
    }, [user, clubId]);

    // Lógica del WebSocket y carga de mensajes
    useEffect(() => {
        if (!club || errorAcceso) return;

        const fetchMensajes = async () => {
            try {
                const res = await api.get(`/clubes/${club.id}/chat`);
                setMensajes(res.data);
                setTimeout(scrollToBottom, 100);
            } catch { console.error("Error al obtener el chat"); }
        };
        fetchMensajes();

        const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
        const token = localStorage.getItem('token');
        socketRef.current = io(socketUrl, {
            auth: { token }
        });

        socketRef.current.on('connect', () => {
            socketRef.current.emit('unirse_club', club.id);
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('Error de conexión al chat:', err.message);
        });

        socketRef.current.on('nuevo_mensaje', (mensaje) => {
            setMensajes((prev) => [...prev, mensaje]);
            setTimeout(scrollToBottom, 100);
        });

        socketRef.current.on('error_socket', (errMsg) => {
            console.error('Error de socket en chat del club:', errMsg);
            setErrorAcceso(typeof errMsg === 'string' ? errMsg : 'Error de comunicación en tiempo real.');
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [club, errorAcceso]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() || !socketRef.current || !club) return;

        socketRef.current.emit('enviar_mensaje', {
            club_id: club.id,
            mensaje: nuevoMensaje.trim()
        });

        setNuevoMensaje('');
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else if (Number(user?.role_id) === 1 || Number(user?.rol) === 1) {
            navigate('/admin');
        } else {
            navigate('/gestion');
        }
    };

    if (loading) {
        return (
            <div className="web-dashboard">
                <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                    <div className="nav-left">
                        <span className="nav-title">Cargando chat del club...</span>
                    </div>
                </header>
                <div style={{ marginTop: '100px', textAlign: 'center', color: '#003366', fontSize: '1.2rem', fontWeight: '600' }}>
                    Sincronizando con la sala del club...
                </div>
            </div>
        );
    }

    if (errorAcceso) {
        return (
            <div className="web-dashboard">
                <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                    <div className="nav-left">
                        <span className="nav-title">Acceso Restringido</span>
                    </div>
                    <div className="nav-right">
                        <button
                            onClick={handleBack}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                padding: '8px 15px',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}
                        >
                            ← Volver
                        </button>
                    </div>
                </header>
                <div style={{ marginTop: '90px', padding: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ maxWidth: '550px', width: '100%', background: '#fff', padding: '36px', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}>🚫</span>
                        <h2 style={{ color: '#c53030', margin: '0 0 10px 0', fontSize: '1.4rem' }}>Acceso Denegado</h2>
                        <p style={{ color: '#475569', lineHeight: '1.6', margin: '15px 0' }}>{errorAcceso}</p>
                        <button
                            onClick={() => navigate(user?.role_id === 1 ? '/admin' : '/gestion')}
                            className="btn-crear-club"
                            style={{ marginTop: '10px' }}
                        >
                            ← Volver
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!club) return null;

    const esAdmin = Number(user?.role_id) === 1 || Number(user?.rol) === 1;
    const canManage = esAdmin || (club && ['encargado_profesor', 'encargado_alumno'].includes(club.mi_rol_interno) && club.inscripcion_estatus === 'activo') || (club && (club.profesor_encargado_id === user?.id || club.alumno_encargado_id === user?.id));

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff', padding: '0 20px', minHeight: '65px' }}>
                <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🏆</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="nav-title" style={{ fontSize: '1.15rem', fontWeight: 'bold', lineHeight: '1.2', color: '#fff' }}>
                            {club.nombre}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#d4edda', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#28a745', display: 'inline-block' }}></span>
                            Chat en vivo del club
                        </span>
                    </div>
                </div>

                <div className="nav-right" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {canManage && (
                        <button
                            onClick={() => navigate(`/club/${club.id}/emergencias`)}
                            style={{
                                background: '#dc3545',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '0.86rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                                transition: 'background 0.2s ease'
                            }}
                            title="Directorio médico y contactos de emergencia de los miembros del club"
                        >
                            🚨 Emergencias
                        </button>
                    )}

                    {esAdmin ? (
                        <button
                            onClick={() => navigate(`/admin/club/${club.id}`)}
                            style={{
                                background: '#28a745',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '0.86rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            📋 Panel Admin
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate(`/club/${club.id}/panel`)}
                            style={{
                                background: '#00509e',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                cursor: 'pointer',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.86rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                transition: 'background 0.2s'
                            }}
                            title="Ir a la información general, avisos, eventos y miembros del club"
                        >
                            📋 Panel y Detalles
                        </button>
                    )}

                    <button
                        onClick={handleBack}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.86rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        ← Volver
                    </button>
                </div>
            </header>

            <div style={{ marginTop: '65px', height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column' }}>
                <div className="chat-page-wrapper">
                    {/* Subcabecera del club */}
                    <div className="chat-room-header">
                        <div className="chat-room-info">
                            <div className="chat-room-title-row">
                                <h2 className="chat-room-title">
                                    💬 Sala de Comunicación · {club.nombre}
                                </h2>
                                <span className="chat-room-status-badge">
                                    <span className="chat-status-dot"></span> En vivo
                                </span>
                            </div>
                            <p className="chat-room-desc">
                                Canal exclusivo para miembros registrados y cuerpo directivo del club
                            </p>
                        </div>
                    </div>

                    {/* Área de mensajes con scroll */}
                    <div className="chat-messages-area">
                        {mensajes.length === 0 ? (
                            <div className="chat-empty-state">
                                <div className="chat-empty-icon">🏆</div>
                                <h3 className="chat-empty-title">¡Bienvenidos al chat de {club.nombre}!</h3>
                                <p className="chat-empty-subtitle">
                                    Aún no hay mensajes en esta sala. Comparte avisos, dudas o novedades con tus compañeros y encargados.
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
                                                    {isAdminSender && (
                                                        <span className="chat-role-badge chat-role-admin">
                                                            🛡️ Admin
                                                        </span>
                                                    )}
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

                    {/* Barra de entrada de mensaje */}
                    <div className="chat-input-bar-container">
                        <form onSubmit={handleSend} className="chat-input-form">
                            <input
                                type="text"
                                value={nuevoMensaje}
                                onChange={(e) => setNuevoMensaje(e.target.value)}
                                placeholder={`Enviar mensaje al club ${club.nombre}...`}
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
            </div>
        </div>
    );
};

export default ClubChatPage;