import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../services/api';
import './css/Dashboards.css';

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
            setErrorAcceso(typeof errMsg === 'string' ? errMsg : 'No perteneces a este club o no tienes permiso para acceder al chat.');
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
            mensaje: nuevoMensaje
        });
        setNuevoMensaje('');
    };

    if (loading) return <div className="web-dashboard"><div className="loading-state">Cargando chat...</div></div>;

    if (errorAcceso) {
        return (
            <div className="web-dashboard">
                <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                    <div className="nav-left">
                        <span className="nav-title">🏆 Chat del Club</span>
                    </div>
                    <div className="nav-right">
                        <button
                            onClick={() => navigate(user?.role_id === 1 ? '/admin' : '/gestion')}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}
                        >
                            🔙 Volver
                        </button>
                    </div>
                </header>
                <div style={{ marginTop: '90px', padding: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ maxWidth: '550px', width: '100%', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                        <span style={{ fontSize: '3rem' }}>🚫</span>
                        <h2 style={{ color: '#c53030', marginTop: '15px' }}>Acceso Denegado</h2>
                        <p style={{ color: '#555', lineHeight: '1.6', margin: '15px 0' }}>{errorAcceso}</p>
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
                        onClick={() => navigate(esAdmin ? '/admin' : '/gestion')}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.86rem'
                        }}
                    >
                        🔙 Volver
                    </button>
                </div>
            </header>

            <div style={{ marginTop: '65px', height: 'calc(100vh - 65px)', backgroundColor: '#e5ddd5', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mensajes.length === 0 && <p style={{ textAlign: 'center', color: '#666', marginTop: '20px', backgroundColor: 'rgba(255,255,255,0.8)', padding: '10px 20px', borderRadius: '8px', alignSelf: 'center' }}>No hay mensajes aún. ¡Sé el primero en saludar!</p>}
                    {mensajes.map((msg, idx) => {
                        const isMe = msg.usuario_id === user.id;
                        return (
                            <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', minWidth: '150px' }}>
                                {!isMe && <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '3px', marginLeft: '8px', fontWeight: 'bold' }}>{msg.autor_nombre}</div>}
                                <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: isMe ? '#dcf8c6' : '#fff', color: '#111', borderTopRightRadius: isMe ? '0' : '12px', borderTopLeftRadius: !isMe ? '0' : '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', position: 'relative' }}>
                                    <div style={{ fontSize: '0.95rem', wordBreak: 'break-word', marginBottom: '10px' }}>{msg.mensaje}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#999', textAlign: 'right', position: 'absolute', bottom: '5px', right: '10px' }}>{new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={{ display: 'flex', padding: '15px 25px', backgroundColor: '#f0f0f0', alignItems: 'center', borderTop: '1px solid #ddd' }}>
                    <input type="text" value={nuevoMensaje} onChange={e => setNuevoMensaje(e.target.value)} placeholder="Escribe tu mensaje aquí..." style={{ flex: 1, padding: '15px 20px', borderRadius: '24px', border: '1px solid #ccc', outline: 'none', fontSize: '1rem' }} />
                    <button type="submit" disabled={!nuevoMensaje.trim()} style={{ marginLeft: '10px', width: '50px', height: '50px', borderRadius: '50%', border: 'none', backgroundColor: nuevoMensaje.trim() ? '#003366' : '#a0a0a0', color: '#fff', cursor: nuevoMensaje.trim() ? 'pointer' : 'default', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', transition: 'background 0.2s' }}>➤</button>
                </form>
            </div>
        </div>
    );
};

export default ClubChatPage;