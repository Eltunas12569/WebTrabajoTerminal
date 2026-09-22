import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/Dashboards.css';
import AccionesAlumno from '../components/AccionesAlumno';
import CalendarioEventos from '../components/CalendarioEventos';
import Sidebar from '../components/Sidebar';

const GestionDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('avisos'); // Default to avisos tab
    const [userClubs, setUserClubs] = useState([]); // State for user's clubs
    const [loadingClubs, setLoadingClubs] = useState(true); // Loading state for clubs
    
    const [avisos, setAvisos] = useState([]); // Estado para los avisos combinados
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

    // Extraemos la función para poder llamarla después de aceptar una invitación o unirse con código
    const fetchUserClubs = async () => {
        if (user && user.id) { // Ensure user and user.id are available
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
                    return tB - tA; // Si empatan, el más nuevo primero
                });
                
                setAvisos(ordenados);
            } catch (error) {
                console.error("Error al obtener los avisos:", error);
            } finally {
                setLoadingAvisos(false);
            }
        }
    };

    // Obtener los avisos (Globales + Clubs) del usuario
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
            // Filtramos solo los clubes que ya pasaron por revisión y están activos
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

    // Estados y lógica para el Calendario de Eventos (clubes inscritos e invitaciones pendientes)
    const [eventosCalendario, setEventosCalendario] = useState([]);
    const [loadingEventosCalendario, setLoadingEventosCalendario] = useState(false);

    const fetchEventosUsuario = async () => {
        if (!user || !user.id) return;
        setLoadingEventosCalendario(true);
        try {
            // 1. Obtener clubes a los que el usuario pertenece
            const resClubs = await api.get(`/clubes/user/${user.id}`);
            const misClubes = resClubs.data || [];

            // 2. Obtener invitaciones pendientes
            let invitaciones = [];
            try {
                const resInv = await api.get('/clubes/invitaciones/pendientes');
                invitaciones = resInv.data || [];
            } catch (e) {
                console.warn("No se pudieron cargar invitaciones pendientes para eventos:", e);
            }

            // 3. Crear mapa unificado de clubes únicos
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

            // 4. Obtener eventos en paralelo para cada club
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
        // Solo alumnos y profesores pueden confirmar asistencia (roles 2, 3, 4)
        const esAlumnoOProfesor = user && [2, 3, 4].includes(Number(user.role_id));
        if (!esAlumnoOProfesor) {
            console.warn("Acceso denegado: solo alumnos y profesores pueden confirmar asistencia.");
            return;
        }

        // Solo se puede confirmar asistencia en eventos que aún no hayan pasado
        if (evento?.fecha_evento) {
            const fechaObj = new Date(String(evento.fecha_evento).replace(' ', 'T'));
            if (!isNaN(fechaObj.getTime()) && fechaObj.getTime() < Date.now()) {
                console.warn("No se puede registrar asistencia en un evento que ya ha concluido.");
                return;
            }
        }

        try {
            await api.post(`/clubes/${evento.club_id}/eventos/${evento.id}/asistencia`, { asistira });
            // Actualizar en el estado local de eventosCalendario reactivamente
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

    // Función para refrescar paneles al aceptar/rechazar invitaciones o unirse a un club
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
            // Utilizamos el endpoint que ya preparaste en el backend para obtener el estado de las firmas
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
            fetchUserClubs(); // Recargamos para actualizar el estatus en pantalla
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

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed">
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">🏆 Club Deportivo - ESCOM</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, {user?.nombres}</span>
                        <div className="profile-bubble" onClick={() => navigate('/perfil')} title="Configurar Perfil" role="button">{user?.nombres?.charAt(0).toUpperCase()}</div>
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

                <main className="admin-main-scroll">
                    <div className="hub-container-centered">
                        <div className="folder-tabs">
                            <button 
                                className={`folder-btn ${activeTab === 'avisos' ? 'active-avisos' : ''}`}
                                onClick={() => setActiveTab('avisos')}
                            >
                                📁 🔔 Avisos <span className="tab-badge">{avisosVisibles.length}</span>
                            </button>
                            <button 
                                className={`folder-btn ${activeTab === 'clubs' ? 'active-clubs' : ''}`}
                                onClick={() => setActiveTab('clubs')}
                            >
                                📁 👥 Clubs <span className="tab-badge">{userClubs.length}</span>
                            </button>
                            <button 
                                className={`folder-btn ${activeTab === 'calendario' ? 'active-clubs' : ''}`}
                                onClick={() => setActiveTab('calendario')}
                                style={{
                                    backgroundColor: activeTab === 'calendario' ? '#003366' : undefined,
                                    color: activeTab === 'calendario' ? '#ffffff' : undefined
                                }}
                            >
                                📁 🗓️ Calendario <span className="tab-badge">{eventosCalendario.length}</span>
                            </button>
                        </div>

                        <div className="folder-body" style={{ borderColor: activeTab === 'avisos' ? '#ff9800' : (activeTab === 'unirse' ? '#28a745' : '#003366') }}>
                            {activeTab === 'avisos' ? (
                                <div className="avisos-list">
                                    {/* Panel de Invitaciones (Renderizado como avisos urgentes) */}
                                    <AccionesAlumno onUpdate={handleUpdate} mostrar="invitaciones" />

                                    {loadingAvisos ? (
                                        <p style={{ padding: '20px' }}>Cargando avisos...</p>
                                    ) : avisosVisibles.length > 0 ? (
                                        avisosVisibles.map(aviso => {
                                            const avisoKey = `${aviso.tipo || 'aviso'}-${aviso.id}`;
                                            const prioridadStr = aviso.prioridad ? String(aviso.prioridad).toLowerCase().trim() : 'normal';
                                            let borderColor = '#003366';
                                            let bgColor = '#f8f9fa';
                                            
                                            if (prioridadStr === 'alta') {
                                                borderColor = '#dc3545';
                                                bgColor = 'rgba(220, 53, 69, 0.05)';
                                            } else if (prioridadStr === 'normal') {
                                                borderColor = '#007bff';
                                                bgColor = 'rgba(0, 123, 255, 0.05)';
                                            } else if (prioridadStr === 'baja') {
                                                borderColor = '#28a745';
                                                bgColor = 'rgba(40, 167, 69, 0.05)';
                                            }
                                            return (
                                            <div key={avisoKey} className="aviso-item" style={{ borderLeft: `5px solid ${borderColor}`, backgroundColor: bgColor, padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                                <div className="aviso-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <h4 style={{ margin: 0, color: borderColor }}>
                                                        {aviso.tipo === 'global' ? '🌍 ' : '🛡️ '} 
                                                        {aviso.titulo}
                                                    </h4>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>
                                                            {new Date(aviso.fecha_envio || aviso.tiempo).toLocaleDateString('es-MX')}
                                                        </span>
                                                        <button
                                                            onClick={(e) => handleDescartarAviso(avisoKey, e)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#888',
                                                                cursor: 'pointer',
                                                                fontSize: '1rem',
                                                                fontWeight: 'bold',
                                                                lineHeight: 1,
                                                                padding: '4px 8px',
                                                                borderRadius: '50%',
                                                                transition: 'all 0.2s ease',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
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
                                                </div>
                                                <p style={{ margin: 0, color: '#333', lineHeight: '1.5' }}>{aviso.contenido || aviso.mensaje || aviso.descripcion}</p>
                                            </div>
                                            );
                                        })
                                    ) : (
                                        <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                            {avisos.length > 0 
                                                ? 'Has descartado todos los avisos recibidos.' 
                                                : 'No hay avisos nuevos por el momento.'}
                                        </p>
                                    )}
                                </div>
                            ) : activeTab === 'unirse' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <AccionesAlumno onUpdate={() => { handleUpdate(); setActiveTab('clubs'); }} mostrar="codigo" />
                                    
                                    <div className="clubs-list-simple" style={{ marginTop: '10px' }}>
                                        <h3 style={{ margin: '0 0 15px 0', color: '#003366', borderBottom: '2px solid #e1e5eb', paddingBottom: '10px' }}>🌍 Clubes Activos en la ESCOM</h3>
                                        {loadingAllClubs ? (
                                            <p>Cargando clubes disponibles...</p>
                                        ) : allActiveClubs.length > 0 ? (
                                            allActiveClubs.map(club => {
                                                const isMember = userClubs.some(uc => uc.id === club.id);
                                                return (
                                                    <div 
                                                        key={club.id} 
                                                        className="club-row" 
                                                        onClick={() => navigate(`/club/${club.id}`, { state: { club, isMember } })}
                                                        style={{ cursor: 'pointer', borderLeft: isMember ? '4px solid #28a745' : '4px solid #17a2b8', marginBottom: '15px', transition: 'background-color 0.2s ease, transform 0.2s ease' }}
                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <div className="club-row-info">
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <h4 style={{ margin: '0 0 5px 0' }}>{club.nombre}</h4>
                                                                {isMember ? (
                                                                    <span style={{ fontSize: '0.8rem', background: '#d4edda', color: '#155724', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>✓ Ya eres miembro</span>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'bold' }}>ℹ️ Ver Detalles</span>
                                                                )}
                                                            </div>
                                                            <p style={{ margin: '5px 0', color: '#555' }}>{club.descripcion}</p>
                                                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>👨‍🏫 Encargado: {club.profesor_nombres} {club.profesor_apellidos}</p>
                                                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>🕒 Horario: {club.espacios_tiempos}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p>No hay clubes activos en este momento.</p>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'calendario' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e1e5eb', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                        <h3 style={{ margin: 0, color: '#003366', fontSize: '1.3rem' }}>
                                            🗓️ Calendario de Eventos y Actividades
                                        </h3>
                                        <span style={{ fontSize: '0.88rem', color: '#555' }}>
                                            Eventos de tus clubes e invitaciones pendientes
                                        </span>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#003366', borderBottom: '2px solid #e1e5eb', paddingBottom: '10px' }}>
                                        🏆 Mis Clubs Inscritos
                                    </h3>
                                    {loadingClubs ? (
                                        <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Cargando tus clubes...</p>
                                    ) : userClubs.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {userClubs.map(club => {
                                                const canEnterChat = club.estatus === 'activo' && club.inscripcion_estatus === 'activo';
                                                return (
                                                    <div 
                                                        key={club.id} 
                                                        onClick={() => {
                                                            if (canEnterChat) {
                                                                navigate(`/chat/${club.id}`);
                                                            } else {
                                                                navigate(`/club/${club.id}/panel`);
                                                            }
                                                        }}
                                                        style={{ 
                                                            background: '#ffffff',
                                                            border: '1px solid #e1e5eb',
                                                            borderLeft: '5px solid #003366',
                                                            borderRadius: '12px',
                                                            padding: '20px 24px',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '12px'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 51, 102, 0.12)';
                                                            e.currentTarget.style.borderColor = '#003366';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                                            e.currentTarget.style.borderColor = '#e1e5eb';
                                                        }}
                                                        title={club.nombre}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                                <h4 style={{ margin: 0, color: '#003366', fontSize: '1.2rem', fontWeight: '700' }}>
                                                                    🏆 {club.nombre}
                                                                </h4>
                                                                {club.mi_rol_interno && (
                                                                    <span style={{
                                                                        fontSize: '0.78rem',
                                                                        padding: '3px 10px',
                                                                        borderRadius: '12px',
                                                                        background: club.mi_rol_interno === 'encargado_profesor' ? '#e7f3ff' : club.mi_rol_interno === 'encargado_alumno' ? '#e6f4ea' : '#f0f2f5',
                                                                        color: club.mi_rol_interno === 'encargado_profesor' ? '#003366' : club.mi_rol_interno === 'encargado_alumno' ? '#1e8449' : '#555',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        {club.mi_rol_interno === 'encargado_profesor' ? '👨‍🏫 Profesor Titular' : club.mi_rol_interno === 'encargado_alumno' ? '🎓 Alumno Encargado' : '🏃 Miembro'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span className={`club-tag tag-${club.estatus?.toLowerCase()}`} style={{ margin: 0 }}>
                                                                    {club.estatus?.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div style={{ fontSize: '0.92rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <p style={{ margin: 0 }}>
                                                                👨‍🏫 <strong>Encargado:</strong> {club.profesor_nombres} {club.profesor_apellidos}
                                                            </p>
                                                            {club.descripcion && (
                                                                <p style={{ margin: 0, color: '#666', fontSize: '0.88rem' }}>
                                                                    {club.descripcion}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {club.mi_rol_interno === 'encargado_profesor' && club.estatus === 'esperando_firmas' && (
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f2f5', paddingTop: '12px', marginTop: '4px' }}>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openMembersModal(club); }}
                                                                    className="btn-review-club"
                                                                    style={{ padding: '7px 14px', fontSize: '0.85rem' }}
                                                                >
                                                                    📋 Ver Detalles y Firmas
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No estás inscrito en ningún club activo.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            {/* Modal de Detalles y Firmas del Club */}
            {showMembersModal && (
                <div className="club-details-overlay" onClick={() => setShowMembersModal(false)}>
                    <div className="club-details-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button className="close-modal-btn" onClick={() => setShowMembersModal(false)}>✖</button>
                        <h2 className="modal-title" style={{ marginBottom: '5px' }}>{selectedClubName}</h2>
                        <p style={{ textAlign: 'center', color: '#666', marginTop: 0, marginBottom: '20px' }}>Estado de Firmas e Integrantes</p>
                        
                        {loadingMembers ? (
                            <p style={{ textAlign: 'center', padding: '20px' }}>Cargando lista de alumnos...</p>
                        ) : (
                            <div>
                                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #003366' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#003366' }}>Resumen de Firmas</h4>
                                    <p style={{ margin: '0' }}><strong>Total de alumnos en lista:</strong> {clubMembers.length}</p>
                                    <p style={{ margin: '5px 0 0 0' }}>
                                        <span style={{ color: '#155724' }}><strong>Firmaron:</strong> {clubMembers.filter(m => m.estatus === 'activo').length}</span> | 
                                        <span style={{ color: '#856404', marginLeft: '10px' }}><strong>Faltan:</strong> {clubMembers.filter(m => m.estatus === 'pendiente').length}</span>
                                    </p>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#003366', color: '#fff', textAlign: 'left' }}>
                                                <th style={{ padding: '12px', borderTopLeftRadius: '8px' }}>Alumno</th>
                                                <th style={{ padding: '12px' }}>Boleta</th>
                                                <th style={{ padding: '12px' }}>Rol</th>
                                                <th style={{ padding: '12px', borderTopRightRadius: '8px' }}>Firma</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clubMembers.map((miembro, idx) => (
                                                <tr key={miembro.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                    <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{miembro.nombres} {miembro.apellidos}</td>
                                                    <td style={{ padding: '12px', color: '#555' }}>{miembro.boleta || 'N/A'}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ 
                                                            fontSize: '0.85rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold',
                                                            backgroundColor: miembro.rol_en_club === 'encargado_alumno' ? '#e1e5eb' : 'transparent',
                                                            border: miembro.rol_en_club === 'encargado_alumno' ? '1px solid #ccc' : 'none'
                                                        }}>
                                                            {miembro.rol_en_club === 'encargado_alumno' ? '🎓 Líder' : 'Miembro'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {miembro.estatus === 'activo' ? (
                                                            <span style={{ color: '#155724', backgroundColor: '#d4edda', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ Firmado</span>
                                                        ) : (
                                                            <span style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>⏳ Pendiente</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {clubMembers.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay miembros inscritos.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Botón para enviar a revisión si el club sigue esperando firmas */}
                                    {selectedClub?.estatus === 'esperando_firmas' && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px', padding: '10px 0', borderTop: '1px solid #eee' }}>
                                            <button 
                                                onClick={handleEnviarRevision}
                                                disabled={sendingReview}
                                                style={{ 
                                                    padding: '12px 25px', backgroundColor: '#28a745', color: 'white', 
                                                    border: 'none', borderRadius: '8px', fontWeight: 'bold', 
                                                    cursor: sendingReview ? 'not-allowed' : 'pointer', fontSize: '1rem',
                                                    boxShadow: '0 4px 6px rgba(40, 167, 69, 0.2)', transition: 'background 0.2s'
                                                }}
                                                onMouseOver={(e) => !sendingReview && (e.target.style.backgroundColor = '#218838')}
                                                onMouseOut={(e) => !sendingReview && (e.target.style.backgroundColor = '#28a745')}
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