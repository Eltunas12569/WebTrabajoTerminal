import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import './css/Dashboards.css';

const ClubChatPage = () => {
    const { id: clubId } = useParams();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [club, setClub] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL;

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Obtener la información del club y verificar permisos
    useEffect(() => {
        const fetchClubInfo = async () => {
            try {
                const response = await axios.get(`${API_URL}/clubes/user/${user.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                const foundClub = response.data.find(c => String(c.id) === String(clubId));
                
                // Si el club existe y no está pausado/rechazado en su totalidad, permitimos acceso
                if (foundClub && foundClub.estatus !== 'en_revision' && foundClub.estatus !== 'esperando_firmas') {
                    setClub(foundClub);
                } else {
                    navigate('/gestion'); // Redirige si no tiene permiso
                }
            } catch (error) {
                navigate('/gestion');
            } finally {
                setLoading(false);
            }
        };
        if (user?.id) fetchClubInfo();
    }, [user, clubId, API_URL, navigate]);

    // Lógica del WebSocket y carga de mensajes
    useEffect(() => {
        if (!club) return;

        const fetchMensajes = async () => {
            try {
                const res = await axios.get(`${API_URL}/clubes/${club.id}/chat`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setMensajes(res.data);
                setTimeout(scrollToBottom, 100);
            } catch (error) { console.error("Error al obtener el chat:", error); }
        };
        fetchMensajes();

        const socketUrl = API_URL.replace('/api', '');
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

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [club, API_URL]);

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
    if (!club) return null; // Previene renderizado fantasma antes de la redirección

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{backgroundColor: '#003366', color: '#fff'}}>
                <div className="nav-left">
                    <span className="nav-title">🏆 Chat del Club</span>
                </div>
                <div className="nav-right">
                    <button onClick={() => navigate('/gestion')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}>🔙 Volver a Mis Actividades</button>
                </div>
            </header>

            <div style={{ marginTop: '65px', height: 'calc(100vh - 65px)', backgroundColor: '#e5ddd5', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '15px 25px', backgroundColor: '#002244', color: '#fff', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{club.nombre}</h3>
                        <span style={{ fontSize: '0.85rem', color: '#d4edda' }}>🟢 Conversación en vivo protegida</span>
                    </div>
                </div>
                
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