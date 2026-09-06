import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

    const [eventos, setEventos] = useState([]);
    const [loadingEventos, setLoadingEventos] = useState(false);
    const [eventoForm, setEventoForm] = useState({
        titulo: '',
        descripcion: '',
        fecha_evento: '',
        lugar: ''
    });

    const [recursoForm, setRecursoForm] = useState({
        tipo_club: '',
        tipo_recurso: '',
        nombre_recurso: '',
        cantidad: '',
        unidad: '',
        especificaciones: '',
        opciones_marcas: '',
        motivo: ''
    });
    const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);

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

    useEffect(() => {
        if (!club || !canAccess) return;
        if (activeTab === 'avisos') fetchAvisos();
        if (activeTab === 'eventos') fetchEventos();
    }, [club, activeTab, clubId, canAccess]);

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

    const handleSolicitarRecurso = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/clubes/${clubId}/recursos`, {
                ...recursoForm,
                cantidad: Number(recursoForm.cantidad) || 0
            });
            setSolicitudesEnviadas((prev) => [
                { ...recursoForm, fecha: new Date().toISOString() },
                ...prev
            ]);
            setRecursoForm({
                tipo_club: '',
                tipo_recurso: '',
                nombre_recurso: '',
                cantidad: '',
                unidad: '',
                especificaciones: '',
                opciones_marcas: '',
                motivo: ''
            });
            setSuccess('Solicitud de recurso enviada a revisión.');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al solicitar recurso.');
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
                                {['avisos', 'eventos', 'recursos'].map((tab) => (
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
                                        {tab === 'recursos' && '📦 Recursos'}
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
                                    <h3 style={{ color: '#003366' }}>Avisos del club</h3>
                                    {loadingAvisos ? (
                                        <p>Cargando avisos...</p>
                                    ) : avisos.length > 0 ? (
                                        avisos.map((aviso) => (
                                            <div key={aviso.id} style={{ borderLeft: '4px solid #17a2b8', padding: '14px', marginBottom: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '6px' }}>
                                                    {aviso.autor_nombre} · {new Date(aviso.fecha_envio).toLocaleString('es-MX')}
                                                </div>
                                                <p style={{ margin: 0, lineHeight: 1.5 }}>{aviso.contenido}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#666' }}>No hay avisos publicados.</p>
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

                            {activeTab === 'recursos' && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                                    <form onSubmit={handleSolicitarRecurso} style={{ display: 'grid', gap: '12px' }}>
                                        <h3 style={{ margin: 0, color: '#003366' }}>Solicitar recurso</h3>
                                        <input type="text" placeholder="Tipo de club" value={recursoForm.tipo_club} onChange={(e) => setRecursoForm({ ...recursoForm, tipo_club: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        <input type="text" placeholder="Tipo de recurso" value={recursoForm.tipo_recurso} onChange={(e) => setRecursoForm({ ...recursoForm, tipo_recurso: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        <input type="text" placeholder="Nombre del recurso" value={recursoForm.nombre_recurso} onChange={(e) => setRecursoForm({ ...recursoForm, nombre_recurso: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <input type="number" min="1" placeholder="Cantidad" value={recursoForm.cantidad} onChange={(e) => setRecursoForm({ ...recursoForm, cantidad: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                            <input type="text" placeholder="Unidad (ej. piezas)" value={recursoForm.unidad} onChange={(e) => setRecursoForm({ ...recursoForm, unidad: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        </div>
                                        <textarea rows="2" placeholder="Especificaciones" value={recursoForm.especificaciones} onChange={(e) => setRecursoForm({ ...recursoForm, especificaciones: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        <input type="text" placeholder="Opciones de marcas" value={recursoForm.opciones_marcas} onChange={(e) => setRecursoForm({ ...recursoForm, opciones_marcas: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        <textarea rows="2" placeholder="Motivo de la solicitud" value={recursoForm.motivo} onChange={(e) => setRecursoForm({ ...recursoForm, motivo: e.target.value })} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                                        <button type="submit" className="btn-review-club" style={{ justifySelf: 'start' }}>Enviar solicitud</button>
                                    </form>

                                    {solicitudesEnviadas.length > 0 && (
                                        <div style={{ marginTop: '28px' }}>
                                            <h3 style={{ color: '#003366' }}>Solicitudes enviadas en esta sesión</h3>
                                            {solicitudesEnviadas.map((sol, idx) => (
                                                <div key={idx} style={{ padding: '12px', border: '1px solid #e4e6eb', borderRadius: '8px', marginBottom: '10px', background: '#f8f9fa' }}>
                                                    <strong>{sol.nombre_recurso}</strong> ({sol.cantidad} {sol.unidad}) · {sol.tipo_recurso}
                                                    <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#555' }}>{sol.motivo}</p>
                                                </div>
                                            ))}
                                        </div>
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
