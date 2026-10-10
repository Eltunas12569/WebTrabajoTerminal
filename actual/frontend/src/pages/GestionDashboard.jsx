import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/Dashboards.css';
import './css/GestionDashboard.css';
import AccionesAlumno from '../components/AccionesAlumno';
import CalendarioEventos from '../components/CalendarioEventos';
import Sidebar from '../components/Sidebar';

const GestionDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('avisos');
    const [userClubs, setUserClubs] = useState([]);
    const [loadingClubs, setLoadingClubs] = useState(true);
    
    const [avisos, setAvisos] = useState([]);
    const [loadingAvisos, setLoadingAvisos] = useState(true);

    const [showMembersModal, setShowMembersModal] = useState(false);
    const [clubMembers, setClubMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [selectedClubName, setSelectedClubName] = useState('');
    const [selectedClub, setSelectedClub] = useState(null);
    const [sendingReview, setSendingReview] = useState(false);
    
    const [allActiveClubs, setAllActiveClubs] = useState([]);
    const [loadingAllClubs, setLoadingAllClubs] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const goToCreateClub = () => {
        setIsSidebarOpen(false);
        navigate('/crear-club');
    };

    const fetchUserClubs = async () => {
        if (user && user.id) {
            setLoadingClubs(true);
            try {
                const response = await api.get(`/clubes/user/${user.id}`);
                setUserClubs(response.data);
            } catch (error) {
                console.error("Error al obtener los clubes del usuario:", error);
            } finally {
                setLoadingClubs(false);
            }
        }
    };

    useEffect(() => {
        fetchUserClubs();
    }, [user]);

    const fetchAvisos = async () => {
        if (user && user.id) {
            setLoadingAvisos(true);
            try {
                const response = await api.get(`/avisos/user/${user.id}`);
                
                const datos = response.data;
                const pesos = { 'alta': 1, 'normal': 2, 'baja': 3 };
                const ordenados = [...datos].sort((a, b) => {
                    const pA = a.prioridad ? String(a.prioridad).toLowerCase().trim() : 'normal';
                    const pB = b.prioridad ? String(b.prioridad).toLowerCase().trim() : 'normal';
                    const pesoA = pesos[pA] || 4;
                    const pesoB = pesos[pB] || 4;
                    
                    if (pesoA !== pesoB) return pesoA - pesoB;
                    
                    const fechaA = a.fecha_envio || a.tiempo || 0;
                    const fechaB = b.fecha_envio || b.tiempo || 0;
                    const tA = new Date(fechaA).getTime() || 0;
                    const tB = new Date(fechaB).getTime() || 0;
                    return tB - tA;
                });
                
                setAvisos(ordenados);
            } catch (error) {
                console.error("Error al obtener los avisos:", error);
            } finally {
                setLoadingAvisos(false);
            }
        }
    };

    useEffect(() => {
        fetchAvisos();
    }, [user]);

    // Gestión de avisos descartados por el usuario actual (almacenamiento local)
    const [descartadosAvisos, setDescartadosAvisos] = useState([]);

    useEffect(() => {
        if (user && user.id) {
            try {
                const guardados = localStorage.getItem(`avisos_descartados_${user.id}`);
                if (guardados) {
                    setDescartadosAvisos(JSON.parse(guardados));
                }
            } catch (e) {
                console.error("Error al cargar avisos descartados:", e);
            }
        }
    }, [user]);

    const handleDescartarAviso = (avisoKey, e) => {
        if (e) e.stopPropagation();
        if (!user || !user.id) return;
        try {
            const nuevos = [...descartadosAvisos, String(avisoKey)];
            setDescartadosAvisos(nuevos);
            localStorage.setItem(`avisos_descartados_${user.id}`, JSON.stringify(nuevos));
        } catch (err) {
            console.error("Error al guardar aviso descartado:", err);
        }
    };

    const avisosVisibles = avisos.filter(aviso => {
        const key = `${aviso.tipo || 'aviso'}-${aviso.id}`;
        return !descartadosAvisos.includes(key);
    });

    const fetchAllActiveClubs = async () => {
        setLoadingAllClubs(true);
        try {
            const response = await api.get('/clubes');
            const activos = response.data.filter(club => club.estatus === 'activo');
            setAllActiveClubs(activos);
        } catch (error) {
            console.error("Error al obtener todos los clubes activos:", error);
        } finally {
            setLoadingAllClubs(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'unirse') {
            fetchAllActiveClubs();
        }
    }, [activeTab]);

    // Estados y lógica para el Calendario de Eventos
    const [eventosCalendario, setEventosCalendario] = useState([]);
    const [loadingEventosCalendario, setLoadingEventosCalendario] = useState(false);

    const fetchEventosUsuario = async () => {
        if (!user || !user.id) return;
        setLoadingEventosCalendario(true);
        try {
            const resClubs = await api.get(`/clubes/user/${user.id}`);
            const misClubes = resClubs.data || [];

            let invitaciones = [];
            try {
                const resInv = await api.get('/clubes/invitaciones/pendientes');
                invitaciones = resInv.data || [];
            } catch (e) {
                console.warn("No se pudieron cargar invitaciones pendientes para eventos:", e);
            }

            const clubesMap = new Map();
            misClubes.forEach(c => {
                clubesMap.set(c.id, { id: c.id, nombre: c.nombre, esInvitacion: false });
            });
            invitaciones.forEach(inv => {
                if (!clubesMap.has(inv.club_id)) {
                    clubesMap.set(inv.club_id, { id: inv.club_id, nombre: inv.nombre, esInvitacion: true });
                }
            });

            const clubesLista = Array.from(clubesMap.values());

            const eventosPromises = clubesLista.map(async (c) => {
                try {
                    const resEv = await api.get(`/clubes/${c.id}/eventos`);
                    return (resEv.data || []).map(ev => ({
                        ...ev,
                        club_id: c.id,
                        club_nombre: c.nombre,
                        es_invitacion: c.esInvitacion
                    }));
                } catch (err) {
                    console.warn(`Error al cargar eventos del club ${c.id}:`, err);
                    return [];
                }
            });

            const resultados = await Promise.all(eventosPromises);
            setEventosCalendario(resultados.flat());
        } catch (error) {
            console.error("Error general al obtener eventos para el calendario:", error);
        } finally {
            setLoadingEventosCalendario(false);
        }
    };

    const handleAsistenciaCalendario = async (evento, asistira) => {
        const esAlumnoOProfesor = user && [2, 3, 4].includes(Number(user.role_id));
        if (!esAlumnoOProfesor) {
            console.warn("Acceso denegado: solo alumnos y profesores pueden confirmar asistencia.");
            return;
        }

        if (evento?.fecha_evento) {
            const fechaObj = new Date(String(evento.fecha_evento).replace(' ', 'T'));
            if (!isNaN(fechaObj.getTime()) && fechaObj.getTime() < Date.now()) {
                console.warn("No se puede registrar asistencia en un evento que ya ha concluido.");
                return;
            }
        }

        try {
            await api.post(`/clubes/${evento.club_id}/eventos/${evento.id}/asistencia`, { asistira });
            setEventosCalendario(prev => prev.map(ev => {
                if (ev.id === evento.id) {
                    const anterior = ev.mi_respuesta;
                    let nuevosAsistentes = Number(ev.total_asistentes || 0);
                    if (asistira === 1 && anterior !== 1) nuevosAsistentes += 1;
                    if (asistira === 0 && anterior === 1) nuevosAsistentes = Math.max(0, nuevosAsistentes - 1);
                    return {
                        ...ev,
                        mi_respuesta: asistira,
                        total_asistentes: nuevosAsistentes
                    };
                }
                return ev;
            }));
        } catch (err) {
            console.error("Error al registrar asistencia desde calendario:", err);
            throw err;
        }
    };

    useEffect(() => {
        if (user && user.id) {
            fetchEventosUsuario();
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'calendario') {
            fetchEventosUsuario();
        }
    }, [activeTab]);

    const handleUpdate = () => {
        fetchUserClubs();
        fetchAvisos();
        fetchEventosUsuario();
    };

    const openMembersModal = async (club) => {
        setShowMembersModal(true);
        setLoadingMembers(true);
        setSelectedClubName(club.nombre);
        setSelectedClub(club);
        try {
            const response = await api.get(`/clubes/${club.id}/miembros`);
            setClubMembers(response.data);
        } catch (error) {
            console.error("Error al cargar firmas:", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleEnviarRevision = async () => {
        if (!selectedClub) return;
        setSendingReview(true);
        try {
            const response = await api.put(`/clubes/${selectedClub.id}/enviar-revision`, {});
            alert(response.data.message);
            setShowMembersModal(false);
            fetchUserClubs();
        } catch (error) {
            alert(error.response?.data?.message || "Error al enviar a revisión. Asegúrate de tener suficientes firmas.");
        } finally {
            setSendingReview(false);
        }
    };

    const esEncargado = userClubs.some(c => 
        ['encargado_profesor', 'encargado_alumno'].includes(c.mi_rol_interno) 
        && c.inscripcion_estatus === 'activo'
    );

    const esProfesor = Number(user?.role_id) === 3 || Number(user?.rol) === 3;
    const esAlumno = [2, 4].includes(Number(user?.role_id));

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed">
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">Sistema de Clubs</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, <strong>{user?.nombres}</strong></span>
                        <div
                            className="profile-bubble"
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
                            {user?.nombres?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    esEncargado={esEncargado}
                />

                <main className="admin-main-scroll gestion-main-scroll">
                    <div className="gestion-desktop-container">

                        {/* 2. BARRA DE NAVEGACIÓN DE ESCRITORIO */}
                        <nav className="gestion-nav-bar" aria-label="Navegación principal del panel">
                            <div className="gestion-tabs-group">
                                <button
                                    type="button"
                                    className={`gestion-tab-btn ${activeTab === 'avisos' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('avisos')}
                                >
                                    <span>🔔 Avisos y Comunicados</span>
                                    <span className="gestion-tab-badge">{avisosVisibles.length}</span>
                                </button>

                                <button
                                    type="button"
                                    className={`gestion-tab-btn ${activeTab === 'clubs' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('clubs')}
                                >
                                    <span>Mis Clubes</span>
                                    <span className="gestion-tab-badge">{userClubs.length}</span>
                                </button>

                                <button
                                    type="button"
                                    className={`gestion-tab-btn ${activeTab === 'calendario' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('calendario')}
                                >
                                    <span>🗓️ Calendario</span>
                                    <span className="gestion-tab-badge">{eventosCalendario.length}</span>
                                </button>

                                {esAlumno && (
                                    <button
                                        type="button"
                                        className={`gestion-tab-btn ${activeTab === 'unirse' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('unirse')}
                                    >
                                        <span>🔑 Explorar / Unirse a un Club</span>
                                    </button>
                                )}
                            </div>
                        </nav>

                        {/* 3. PANEL DE CONTENIDO PRINCIPAL */}
                        <div className="gestion-content-panel">
                            {activeTab === 'avisos' ? (
                                <div>
                                    <div className="panel-section-header">
                                        <div className="panel-section-title-group">
                                            <h2>🔔 Centro de Avisos y Notificaciones</h2>
                                            <p>Comunicados oficiales de la administración y anuncios de tus clubes inscritos</p>
                                        </div>
                                    </div>

                                    {/* Invitaciones urgentes a clubes */}
                                    <AccionesAlumno onUpdate={handleUpdate} mostrar="invitaciones" />

                                    {loadingAvisos ? (
                                        <div className="gestion-empty-state">
                                            <p>Cargando avisos recientes...</p>
                                        </div>
                                    ) : avisosVisibles.length > 0 ? (
                                        <div className="avisos-grid-list">
                                            {avisosVisibles.map(aviso => {
                                                const avisoKey = `${aviso.tipo || 'aviso'}-${aviso.id}`;
                                                const prioridadStr = aviso.prioridad ? String(aviso.prioridad).toLowerCase().trim() : 'normal';
                                                const esGlobal = aviso.tipo === 'global';

                                                return (
                                                    <article
                                                        key={avisoKey}
                                                        className={`gestion-aviso-card priority-${prioridadStr}`}
                                                    >
                                                        <div className="aviso-card-top">
                                                            <div className="aviso-title-wrap">
                                                                <span className={`aviso-type-tag ${esGlobal ? 'global' : 'club'}`}>
                                                                    {esGlobal ? '🌍 Institucional' : '🛡️ Club'}
                                                                </span>
                                                                <h3 className="aviso-card-title">{aviso.titulo}</h3>
                                                            </div>
                                                            <div className="aviso-meta-right">
                                                                <span className="aviso-date-badge">
                                                                    📅 {new Date(aviso.fecha_envio || aviso.tiempo).toLocaleDateString('es-MX', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="btn-dismiss-aviso"
                                                                    onClick={(e) => handleDescartarAviso(avisoKey, e)}
                                                                    title="Descartar aviso de mi vista"
                                                                    aria-label="Descartar aviso"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="aviso-card-body">
                                                            {aviso.contenido || aviso.mensaje || aviso.descripcion}
                                                        </p>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="gestion-empty-state">
                                            <span className="gestion-empty-icon">📭</span>
                                            <h4>Sin avisos pendientes</h4>
                                            <p>
                                                {avisos.length > 0
                                                    ? 'Has descartado todos los avisos recibidos.'
                                                    : 'No hay comunicados nuevos por el momento.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : activeTab === 'unirse' ? (
                                <div>
                                    <div className="panel-section-header">
                                        <div className="panel-section-title-group">
                                            <h2>🌍 Explorar y Unirse a un Club</h2>
                                            <p>Ingresa un código de invitación directo o explora el catálogo de clubes activos en la ESCOM</p>
                                        </div>
                                    </div>

                                    <AccionesAlumno onUpdate={() => { handleUpdate(); setActiveTab('clubs'); }} mostrar="codigo" />
                                    
                                    <div style={{ marginTop: '28px' }}>
                                        <h3 style={{ margin: '0 0 18px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: '800' }}>
                                            Clubes Activos Disponibles ({allActiveClubs.length})
                                        </h3>

                                        {loadingAllClubs ? (
                                            <div className="gestion-empty-state">
                                                <p>Cargando directorio de clubes activos...</p>
                                            </div>
                                        ) : allActiveClubs.length > 0 ? (
                                            <div className="gestion-clubs-grid">
                                                {allActiveClubs.map(club => {
                                                    const isMember = userClubs.some(uc => uc.id === club.id);
                                                    return (
                                                        <div 
                                                            key={club.id} 
                                                            className={`gestion-club-card ${isMember ? 'member-active' : ''}`}
                                                            onClick={() => navigate(`/club/${club.id}`, { state: { club, isMember } })}
                                                        >
                                                            <div>
                                                                <div className="club-card-top-bar">
                                                                    <h4 className="club-card-name">{club.nombre}</h4>
                                                                    {isMember ? (
                                                                        <span className="role-badge-chip lider">✓ Ya eres miembro</span>
                                                                    ) : (
                                                                        <span className="role-badge-chip profesor">ℹ️ Ver Detalles</span>
                                                                    )}
                                                                </div>
                                                                <p className="club-card-desc" style={{ marginTop: '8px' }}>
                                                                    {club.descripcion}
                                                                </p>
                                                            </div>

                                                            <div className="club-card-meta-list">
                                                                <div className="club-card-meta-item">
                                                                    <span>👨‍🏫</span>
                                                                    <span><strong>Encargado:</strong> {club.profesor_nombres} {club.profesor_apellidos}</span>
                                                                </div>
                                                                {club.espacios_tiempos && (
                                                                    <div className="club-card-meta-item">
                                                                        <span>🕒</span>
                                                                        <span><strong>Horario:</strong> {club.espacios_tiempos}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="gestion-empty-state">
                                                <span className="gestion-empty-icon">🏫</span>
                                                <h4>No hay clubes activos registrados</h4>
                                                <p>Aún no se han publicado clubes activos en el catálogo institucional.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'calendario' ? (
                                <div>
                                    <div className="panel-section-header">
                                        <div className="panel-section-title-group">
                                            <h2>🗓️ Calendario de Eventos y Actividades</h2>
                                            <p>Consulta fechas de entrenamientos, torneos, reuniones y confirma tu asistencia</p>
                                        </div>
                                    </div>
                                    <CalendarioEventos 
                                        eventos={eventosCalendario}
                                        modo="usuario"
                                        onAsistencia={handleAsistenciaCalendario}
                                        clubes={userClubs}
                                        cargando={loadingEventosCalendario}
                                        onRefresh={fetchEventosUsuario}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <div className="panel-section-header">
                                        <div className="panel-section-title-group">
                                            <h2>Mis Clubes Inscritos</h2>
                                            <p>Accede al panel de actividades, avisos internos, salas de chat en vivo y gestión de miembros</p>
                                        </div>
                                    </div>

                                    {loadingClubs ? (
                                        <div className="gestion-empty-state">
                                            <p>Cargando tus clubes inscritos...</p>
                                        </div>
                                    ) : userClubs.length > 0 ? (
                                        <div className="gestion-clubs-grid">
                                            {userClubs.map(club => {
                                                const canEnterChat = club.estatus === 'activo' && club.inscripcion_estatus === 'activo';
                                                const rolClass = club.mi_rol_interno === 'encargado_profesor'
                                                    ? 'profesor'
                                                    : club.mi_rol_interno === 'encargado_alumno'
                                                    ? 'lider'
                                                    : 'miembro';

                                                const rolTexto = club.mi_rol_interno === 'encargado_profesor'
                                                    ? '👨‍🏫 Profesor Titular'
                                                    : club.mi_rol_interno === 'encargado_alumno'
                                                    ? '🎓 Alumno Encargado'
                                                    : '🏃 Miembro';

                                                return (
                                                    <div 
                                                        key={club.id} 
                                                        className="gestion-club-card"
                                                        onClick={() => navigate(`/club/${club.id}`)}
                                                        title={`Abrir detalles de ${club.nombre}`}
                                                    >
                                                        <div>
                                                            <div className="club-card-top-bar">
                                                                <div>
                                                                    <h4 className="club-card-name">{club.nombre}</h4>
                                                                    <div className="club-badges-row">
                                                                        {club.mi_rol_interno && (
                                                                            <span className={`role-badge-chip ${rolClass}`}>
                                                                                {rolTexto}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={`club-tag tag-${club.estatus?.toLowerCase()}`} style={{ margin: 0, flexShrink: 0 }}>
                                                                    {club.estatus?.replace('_', ' ')}
                                                                </span>
                                                            </div>

                                                            {club.descripcion && (
                                                                <p className="club-card-desc" style={{ marginTop: '12px' }}>
                                                                    {club.descripcion}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="club-card-meta-list">
                                                            <div className="club-card-meta-item">
                                                                <span>👨‍🏫</span>
                                                                <span><strong>Encargado:</strong> {club.profesor_nombres} {club.profesor_apellidos}</span>
                                                            </div>
                                                            {club.espacios_tiempos && (
                                                                <div className="club-card-meta-item">
                                                                    <span>🕒</span>
                                                                    <span><strong>Horario:</strong> {club.espacios_tiempos}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="club-card-actions">
                                                            {canEnterChat && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-club-action chat"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/chat/${club.id}`);
                                                                    }}
                                                                >
                                                                    💬 Entrar al Chat
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                className="btn-club-action details"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/club/${club.id}`);
                                                                }}
                                                            >
                                                                📋 Panel y Detalles
                                                            </button>

                                                            {['encargado_profesor', 'encargado_alumno'].includes(club.mi_rol_interno) && club.inscripcion_estatus === 'activo' && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-club-action details"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/club/${club.id}/editar`);
                                                                    }}
                                                                >
                                                                    ✏️ Editar Información
                                                                </button>
                                                            )}

                                                            {club.mi_rol_interno === 'encargado_profesor' && club.estatus === 'esperando_firmas' && (
                                                                <button 
                                                                    type="button"
                                                                    className="btn-club-action signatures"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openMembersModal(club);
                                                                    }}
                                                                >
                                                                    ✍️ Ver Firmas
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="gestion-empty-state">
                                            <span className="gestion-empty-icon">🏅</span>
                                            <h4>No estás inscrito en ningún club activo</h4>
                                            <p>
                                                {esAlumno
                                                    ? 'Puedes unirte mediante un código de invitación o explorar los clubes activos en la pestaña "Explorar / Unirse a un Club".'
                                                    : 'Puedes registrar un nuevo club desde el botón superior "Crear Nuevo Club".'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal de Detalles y Firmas del Club */}
            {showMembersModal && (
                <div className="club-details-overlay" onClick={() => setShowMembersModal(false)}>
                    <div
                        className="club-details-modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '820px', width: '92%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}
                    >
                        <button className="close-modal-btn" onClick={() => setShowMembersModal(false)}>✖</button>
                        <h2 className="modal-title" style={{ marginBottom: '4px' }}>{selectedClubName}</h2>
                        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 0, marginBottom: '22px', fontSize: '0.92rem' }}>
                            Control de Firmas de Conformidad e Integrantes Registrados
                        </p>
                        
                        {loadingMembers ? (
                            <p style={{ textAlign: 'center', padding: '30px' }}>Cargando lista de alumnos...</p>
                        ) : (
                            <div>
                                {/* Resumen en 3 tarjetas */}
                                <div className="signatures-summary-grid">
                                    <div className="sig-metric-box">
                                        <span className="sig-metric-val">{clubMembers.length}</span>
                                        <span className="sig-metric-label">Total en Lista</span>
                                    </div>
                                    <div className="sig-metric-box">
                                        <span className="sig-metric-val" style={{ color: '#16a34a' }}>
                                            {clubMembers.filter(m => m.estatus === 'activo').length}
                                        </span>
                                        <span className="sig-metric-label">Firmados ✓</span>
                                    </div>
                                    <div className="sig-metric-box">
                                        <span className="sig-metric-val" style={{ color: '#d97706' }}>
                                            {clubMembers.filter(m => m.estatus === 'pendiente').length}
                                        </span>
                                        <span className="sig-metric-label">Pendientes ⏳</span>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#003366', color: '#fff', textAlign: 'left' }}>
                                                <th style={{ padding: '12px 16px', borderTopLeftRadius: '8px' }}>Alumno</th>
                                                <th style={{ padding: '12px 16px' }}>Boleta</th>
                                                <th style={{ padding: '12px 16px' }}>Rol</th>
                                                <th style={{ padding: '12px 16px', borderTopRightRadius: '8px' }}>Firma</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clubMembers.map((miembro, idx) => (
                                                <tr key={miembro.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                                                        {miembro.nombres} {miembro.apellidos}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>
                                                        {miembro.boleta || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span className={`role-badge-chip ${miembro.rol_en_club === 'encargado_alumno' ? 'lider' : 'miembro'}`}>
                                                            {miembro.rol_en_club === 'encargado_alumno' ? '🎓 Líder' : 'Miembro'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {miembro.estatus === 'activo' ? (
                                                            <span style={{ color: '#15803d', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700' }}>
                                                                ✓ Firmado
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#b45309', backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700' }}>
                                                                ⏳ Pendiente
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {clubMembers.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                                        No hay miembros inscritos.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {selectedClub?.estatus === 'esperando_firmas' && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                            <button 
                                                onClick={handleEnviarRevision}
                                                disabled={sendingReview}
                                                style={{ 
                                                    padding: '12px 28px',
                                                    backgroundColor: '#16a34a',
                                                    color: 'white', 
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    fontWeight: '700', 
                                                    cursor: sendingReview ? 'not-allowed' : 'pointer',
                                                    fontSize: '0.96rem',
                                                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {sendingReview ? 'Enviando...' : '🚀 Enviar Club a Revisión Institucional'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionDashboard;