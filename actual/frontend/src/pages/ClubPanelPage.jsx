import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../services/api';
import './css/Dashboards.css';

const ClubPanelPage = () => {
    const { id: clubId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('avisos');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [avisos, setAvisos] = useState([]);
    const [loadingAvisos, setLoadingAvisos] = useState(false);
    const [nuevoAviso, setNuevoAviso] = useState('');
    const [descartadosAvisos, setDescartadosAvisos] = useState([]);

    useEffect(() => {
        if (user?.id) {
            try {
                const guardados = localStorage.getItem(`avisos_descartados_${user.id}`);
                if (guardados) setDescartadosAvisos(JSON.parse(guardados));
            } catch (e) {
                console.error(e);
            }
        }
    }, [user]);

    const handleDescartarAviso = (avisoId, e) => {
        if (e) e.stopPropagation();
        if (!user?.id) return;
        try {
            const key = `club-${avisoId}`;
            const nuevos = [...descartadosAvisos, key];
            setDescartadosAvisos(nuevos);
            localStorage.setItem(`avisos_descartados_${user.id}`, JSON.stringify(nuevos));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRestaurarAvisos = () => {
        if (!user?.id) return;
        try {
            const guardados = localStorage.getItem(`avisos_descartados_${user.id}`);
            if (guardados) {
                const parsed = JSON.parse(guardados);
                const filtrados = parsed.filter(k => !avisos.some(a => `club-${a.id}` === k));
                localStorage.setItem(`avisos_descartados_${user.id}`, JSON.stringify(filtrados));
                setDescartadosAvisos(filtrados);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const [eventos, setEventos] = useState([]);
    const [loadingEventos, setLoadingEventos] = useState(false);
    const [eventoForm, setEventoForm] = useState({
        titulo: '',
        descripcion: '',
        fecha_evento: '',
        lugar: ''
    });

    const [miembros, setMiembros] = useState([]);
    const [loadingMiembros, setLoadingMiembros] = useState(false);

    const canManage = club && ['encargado_profesor', 'encargado_alumno'].includes(club.mi_rol_interno);
    const canAccess = club && !['en_revision', 'esperando_firmas', 'inactivo', 'rechazado'].includes(club.estatus);

    useEffect(() => {
        const fetchClub = async () => {
            try {
                const response = await api.get(`/clubes/user/${user.id}`);
                const found = response.data.find((c) => String(c.id) === String(clubId));
                if (!found) {
                    setError('No perteneces a este club o no existe.');
                    return;
                }
                if (['en_revision', 'esperando_firmas', 'inactivo', 'rechazado'].includes(found.estatus)) {
                    setError(`Este club no está disponible (estatus: ${found.estatus}).`);
                    setClub(found);
                    return;
                }
                setClub(found);
            } catch (err) {
                setError('No se pudo cargar la información del club.');
            } finally {
                setLoading(false);
            }
        };
        if (user?.id) fetchClub();
    }, [user, clubId]);

    const fetchAvisos = async () => {
        setLoadingAvisos(true);
        try {
            const response = await api.get(`/clubes/${clubId}/avisos`);
            setAvisos(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAvisos(false);
        }
    };

    const fetchEventos = async () => {
        setLoadingEventos(true);
        try {
            const response = await api.get(`/clubes/${clubId}/eventos`);
            setEventos(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingEventos(false);
        }
    };

    const fetchMiembros = async () => {
        setLoadingMiembros(true);
        try {
            const response = await api.get(`/clubes/${clubId}/miembros`);
            setMiembros(response.data || []);
        } catch (err) {
            console.error('Error al cargar miembros:', err);
        } finally {
            setLoadingMiembros(false);
        }
    };

    useEffect(() => {
        if (!club || !canAccess) return;
        if (activeTab === 'avisos') fetchAvisos();
        if (activeTab === 'eventos') fetchEventos();
        if (activeTab === 'miembros') fetchMiembros();
    }, [club, activeTab, clubId, canAccess]);

    // WebSocket: Escuchar actualizaciones en tiempo real de avisos y eventos
    useEffect(() => {
        if (!club || !canAccess || !clubId) return;

        const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
        const token = localStorage.getItem('token');
        const socket = io(socketUrl, {
            auth: { token }
        });

        socket.on('connect', () => {
            socket.emit('unirse_club', Number(clubId));
        });

        socket.on('notificacion_interna', (data) => {
            if (data?.tipo === 'aviso') fetchAvisos();
            if (data?.tipo === 'evento') fetchEventos();
        });

        return () => {
            socket.disconnect();
        };
    }, [club, canAccess, clubId]);

    const handlePublicarAviso = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!nuevoAviso.trim()) return;
        try {
            await api.post(`/clubes/${clubId}/avisos`, { contenido: nuevoAviso.trim() });
            setNuevoAviso('');
            setSuccess('Aviso publicado correctamente.');
            fetchAvisos();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al publicar el aviso.');
        }
    };

    const handleCrearEvento = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/clubes/${clubId}/eventos`, eventoForm);
            setEventoForm({ titulo: '', descripcion: '', fecha_evento: '', lugar: '' });
            setSuccess('Evento creado correctamente.');
            fetchEventos();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear el evento.');
        }
    };

    const handleAsistencia = async (idEvento, asistira) => {
        setError('');
        try {
            await api.post(`/clubes/${clubId}/eventos/${idEvento}/asistencia`, { asistira });
            fetchEventos();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar asistencia.');
        }
    };

    if (loading) {
        return <div className="web-dashboard"><div className="loading-state" style={{ marginTop: '80px' }}>Cargando panel del club...</div></div>;
    }

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <span className="nav-title">🏆 {club?.nombre || 'Panel del Club'}</span>
                </div>
                <div className="nav-right" style={{ display: 'flex', gap: '10px' }}>
                    {canAccess && (
                        <button
                            onClick={() => navigate(`/chat/${clubId}`)}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}
                        >
                            💬 Chat
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/gestion')}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}
                    >
                        🔙 Volver
                    </button>
                </div>
            </header>

            <main className="admin-main-scroll" style={{ marginTop: '65px', backgroundColor: '#f4f6f8', minHeight: 'calc(100vh - 65px)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' }}>
                    {error && <div className="message-banner error" style={{ marginBottom: '16px' }}>{error}</div>}
                    {success && <div className="message-banner success" style={{ marginBottom: '16px' }}>{success}</div>}

                    {!canAccess ? (
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', textAlign: 'center' }}>
                            <p>Este club no tiene funciones activas en este momento.</p>
                            <button onClick={() => navigate('/gestion')} className="btn-review-club" style={{ marginTop: '15px' }}>Regresar al dashboard</button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                {['avisos', 'eventos', 'miembros'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            background: activeTab === tab ? '#003366' : '#e4e6eb',
                                            color: activeTab === tab ? '#fff' : '#1c1e21'
                                        }}
                                    >
                                        {tab === 'avisos' && '📢 Avisos'}
                                        {tab === 'eventos' && '📅 Eventos'}
                                        {tab === 'miembros' && '👥 Miembros'}
                                    </button>
                                ))}
                            </div>

                            {activeTab === 'avisos' && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                                    {canManage && (
                                        <form onSubmit={handlePublicarAviso} style={{ marginBottom: '24px' }}>
                                            <h3 style={{ marginTop: 0, color: '#003366' }}>Publicar aviso interno</h3>
                                            <textarea
                                                rows="3"
                                                value={nuevoAviso}
                                                onChange={(e) => setNuevoAviso(e.target.value)}
                                                placeholder="Escribe un aviso para los miembros del club..."
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                                required
                                            />
                                            <button type="submit" className="btn-review-club" style={{ marginTop: '12px' }}>Publicar aviso</button>
                                        </form>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                        <h3 style={{ color: '#003366', margin: 0 }}>Avisos del club</h3>
                                        {avisos.some(a => descartadosAvisos.includes(`club-${a.id}`)) && (
                                            <button
                                                onClick={handleRestaurarAvisos}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#003366',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                ↺ Restaurar avisos descartados
                                            </button>
                                        )}
                                    </div>
                                    {loadingAvisos ? (
                                        <p>Cargando avisos...</p>
                                    ) : avisos.filter(a => !descartadosAvisos.includes(`club-${a.id}`)).length > 0 ? (
                                        avisos.filter(a => !descartadosAvisos.includes(`club-${a.id}`)).map((aviso) => (
                                            <div key={aviso.id} style={{ borderLeft: '4px solid #17a2b8', padding: '14px', marginBottom: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                        {aviso.autor_nombre} · {new Date(aviso.fecha_envio).toLocaleString('es-MX')}
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleDescartarAviso(aviso.id, e)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#888',
                                                            cursor: 'pointer',
                                                            fontSize: '0.95rem',
                                                            fontWeight: 'bold',
                                                            lineHeight: 1,
                                                            padding: '3px 6px',
                                                            borderRadius: '50%',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.color = '#dc3545';
                                                            e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.12)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.color = '#888';
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                        }}
                                                        title="Eliminar este aviso de mi vista"
                                                        aria-label="Eliminar aviso de mi vista"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <p style={{ margin: 0, lineHeight: 1.5 }}>{aviso.contenido}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#666' }}>
                                            {avisos.length > 0 
                                                ? 'Has descartado todos los avisos de este club.' 
                                                : 'No hay avisos publicados.'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'eventos' && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                                    {canManage && (
                                        <form onSubmit={handleCrearEvento} style={{ marginBottom: '28px', display: 'grid', gap: '12px' }}>
                                            <h3 style={{ margin: 0, color: '#003366' }}>Crear evento</h3>
                                            <input type="text" placeholder="Título" value={eventoForm.titulo} onChange={(e) => setEventoForm({ ...eventoForm, titulo: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                            <textarea rows="2" placeholder="Descripción" value={eventoForm.descripcion} onChange={(e) => setEventoForm({ ...eventoForm, descripcion: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                            <input type="datetime-local" value={eventoForm.fecha_evento} onChange={(e) => setEventoForm({ ...eventoForm, fecha_evento: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                            <input type="text" placeholder="Lugar" value={eventoForm.lugar} onChange={(e) => setEventoForm({ ...eventoForm, lugar: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                            <button type="submit" className="btn-review-club" style={{ justifySelf: 'start' }}>Crear evento</button>
                                        </form>
                                    )}
                                    <h3 style={{ color: '#003366' }}>Eventos programados</h3>
                                    {loadingEventos ? (
                                        <p>Cargando eventos...</p>
                                    ) : eventos.length > 0 ? (
                                        eventos.map((evento) => (
                                            <div key={evento.id} style={{ border: '1px solid #e4e6eb', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
                                                <h4 style={{ margin: '0 0 8px 0' }}>{evento.titulo}</h4>
                                                <p style={{ margin: '0 0 8px 0', color: '#444' }}>{evento.descripcion}</p>
                                                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#666' }}>
                                                    📅 {new Date(evento.fecha_evento).toLocaleString('es-MX')} · 📍 {evento.lugar}
                                                </p>
                                                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>
                                                    <strong>Asistentes confirmados:</strong> {evento.total_asistentes || 0}
                                                </p>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => handleAsistencia(evento.id, 1)}
                                                        style={{ padding: '8px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: Number(evento.mi_respuesta) === 1 ? '#28a745' : '#e4e6eb', color: Number(evento.mi_respuesta) === 1 ? '#fff' : '#333' }}
                                                    >
                                                        ✓ Asistiré
                                                    </button>
                                                    <button
                                                        onClick={() => handleAsistencia(evento.id, 0)}
                                                        style={{ padding: '8px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: Number(evento.mi_respuesta) === 0 ? '#dc3545' : '#e4e6eb', color: Number(evento.mi_respuesta) === 0 ? '#fff' : '#333' }}
                                                    >
                                                        ✗ No asistiré
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#666' }}>No hay eventos programados.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'miembros' && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                                        <h3 style={{ margin: 0, color: '#003366' }}>👥 Miembros e Integrantes del Club</h3>
                                        <span style={{ fontSize: '0.9rem', background: '#e7f3ff', color: '#003366', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold' }}>
                                            Total: {miembros.length} miembros
                                        </span>
                                    </div>
                                    {loadingMiembros ? (
                                        <p>Cargando integrantes del club...</p>
                                    ) : miembros.length > 0 ? (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e4e6eb' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#003366', color: '#fff' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Boleta</th>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Rol en el Club</th>
                                                        <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {miembros.map((m, idx) => (
                                                        <tr key={m.id || idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                            <td style={{ padding: '12px', fontWeight: '600', color: '#333' }}>{m.nombres} {m.apellidos}</td>
                                                            <td style={{ padding: '12px', color: '#666', fontFamily: 'monospace' }}>{m.boleta || '—'}</td>
                                                            <td style={{ padding: '12px' }}>
                                                                <span style={{
                                                                    fontSize: '0.85rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold',
                                                                    background: m.rol_en_club === 'encargado_profesor' ? '#e7f3ff' : m.rol_en_club === 'encargado_alumno' ? '#e6f4ea' : '#f0f2f5',
                                                                    color: m.rol_en_club === 'encargado_profesor' ? '#003366' : m.rol_en_club === 'encargado_alumno' ? '#1e8449' : '#555'
                                                                }}>
                                                                    {m.rol_en_club === 'encargado_profesor' ? '👨‍🏫 Profesor Encargado' : m.rol_en_club === 'encargado_alumno' ? '🎓 Alumno Encargado' : '🏃 Miembro Atleta'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    fontSize: '0.8rem', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold',
                                                                    background: m.estatus === 'activo' ? '#d4edda' : '#fff3cd', color: m.estatus === 'activo' ? '#155724' : '#856404'
                                                                }}>
                                                                    {m.estatus === 'activo' ? '✓ Activo' : '⏳ Pendiente'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p style={{ color: '#666' }}>No hay miembros inscritos actualmente.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ClubPanelPage;
