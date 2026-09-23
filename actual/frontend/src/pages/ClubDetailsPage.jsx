import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';
import Sidebar from '../components/Sidebar';

/**
 * Página unificada de Detalles y Panel del Club optimizada para Visualización Web Desktop.
 * Integra la navegación de la plataforma (Sidebar, Navbar fija, Dashboard Layout),
 * cabecera horizontal de escritorio, tabs de navegación anchos y apartado exclusivo
 * para la creación de avisos y eventos (separado de los muros de lectura).
 */
const ClubDetailsPage = ({ defaultTab = 'detalles' }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();

    // Estado del Sidebar institucional
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Determinar pestaña activa (?tab=...)
    const tabFromUrl = searchParams.get('tab') || location.state?.tab || defaultTab;
    const [activeTab, setActiveTab] = useState(tabFromUrl);

    // Sub-pestaña para el apartado de creación: 'ambos', 'aviso', 'evento'
    const [subTabCreacion, setSubTabCreacion] = useState('ambos');

    // Estados del Club y Membresía
    const [club, setClub] = useState(location.state?.club || null);
    const [isMember, setIsMember] = useState(location.state?.isMember || false);
    const [miRolInterno, setMiRolInterno] = useState(null);
    const [inscripcionEstatus, setInscripcionEstatus] = useState(null);
    const [loading, setLoading] = useState(!location.state?.club);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados del Código de Unión
    const [copied, setCopied] = useState(false);
    const [joining, setJoining] = useState(false);
    const [joinMessage, setJoinMessage] = useState({ text: '', type: '' });

    // Estados de Avisos
    const [avisos, setAvisos] = useState([]);
    const [loadingAvisos, setLoadingAvisos] = useState(false);
    const [tituloAviso, setTituloAviso] = useState('');
    const [nuevoAviso, setNuevoAviso] = useState('');
    const [prioridadAviso, setPrioridadAviso] = useState('normal');
    const [descartadosAvisos, setDescartadosAvisos] = useState([]);

    // Estados de Eventos
    const [eventos, setEventos] = useState([]);
    const [loadingEventos, setLoadingEventos] = useState(false);
    const [eventoForm, setEventoForm] = useState({
        titulo: '',
        descripcion: '',
        fecha_evento: '',
        lugar: '',
        prioridad: 'alta'
    });

    // Estados de Miembros y Filtros Web
    const [miembros, setMiembros] = useState([]);
    const [loadingMiembros, setLoadingMiembros] = useState(false);
    const [searchMember, setSearchMember] = useState('');
    const [filterRol, setFilterRol] = useState('todos');

    // Estados de Ficha Médica y de Emergencia
    const [selectedEmergencia, setSelectedEmergencia] = useState(null);
    const [loadingEmergencia, setLoadingEmergencia] = useState(false);
    const [errorEmergencia, setErrorEmergencia] = useState('');
    const [modalEmergenciaAbierto, setModalEmergenciaAbierto] = useState(false);
    const [telefonoCopiado, setTelefonoCopiado] = useState('');

    // Roles y permisos
    const esAdmin = Number(user?.role_id) === 1 || Number(user?.rol) === 1;
    const canManage = esAdmin || (
        club && ['encargado_profesor', 'encargado_alumno'].includes(miRolInterno) && inscripcionEstatus === 'activo'
    ) || (
        club && (club.profesor_encargado_id === user?.id || club.alumno_encargado_id === user?.id)
    );

    // Cargar avisos descartados por el usuario
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

    // Cargar información del club y membresía
    useEffect(() => {
        const fetchClubData = async () => {
            try {
                const response = await api.get('/clubes');
                const clubEncontrado = response.data.find(c => String(c.id) === String(id));
                if (!clubEncontrado) throw new Error('Club no encontrado');
                setClub(clubEncontrado);

                if (user?.id) {
                    const userClubsRes = await api.get(`/clubes/user/${user.id}`);
                    const miRegistro = userClubsRes.data.find(uc => String(uc.id) === String(id));
                    if (miRegistro) {
                        setMiRolInterno(miRegistro.mi_rol_interno || miRegistro.rol_en_club);
                        setInscripcionEstatus(miRegistro.inscripcion_estatus);
                        setIsMember(miRegistro.inscripcion_estatus === 'activo');
                    } else if (esAdmin) {
                        setIsMember(true);
                    }
                }
            } catch (err) {
                if (!club) setError('Error al cargar la información del club.');
            } finally {
                setLoading(false);
            }
        };
        fetchClubData();
    }, [id, user, esAdmin]);

    // Sincronizar activeTab cuando cambia el query param en la URL
    useEffect(() => {
        const queryTab = searchParams.get('tab');
        if (queryTab && queryTab !== activeTab) {
            setActiveTab(queryTab);
        }
    }, [searchParams]);

    // Cambiar de pestaña y actualizar la URL
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setError('');
        setSuccess('');
        setSearchParams({ tab: tabId }, { replace: true });
    };

    // Cargar datos según la pestaña activa
    useEffect(() => {
        if (!club || !id) return;

        if (activeTab === 'avisos' && isMember) {
            fetchAvisos();
        } else if (activeTab === 'eventos' && isMember) {
            fetchEventos();
        } else if (activeTab === 'miembros' && isMember) {
            fetchMiembros();
        } else if (activeTab === 'publicar' && canManage) {
            fetchAvisos();
            fetchEventos();
        }
    }, [activeTab, club, id, isMember, canManage]);

    const fetchAvisos = async () => {
        setLoadingAvisos(true);
        try {
            const res = await api.get(`/clubes/${id}/avisos`);
            setAvisos(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAvisos(false);
        }
    };

    const fetchEventos = async () => {
        setLoadingEventos(true);
        try {
            const res = await api.get(`/clubes/${id}/eventos`);
            setEventos(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingEventos(false);
        }
    };

    const fetchMiembros = async () => {
        setLoadingMiembros(true);
        try {
            const res = await api.get(`/clubes/${id}/miembros`);
            setMiembros(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMiembros(false);
        }
    };

    // Atajos hacia el apartado de creación
    const irACrearAviso = () => {
        setSubTabCreacion('aviso');
        handleTabChange('publicar');
    };

    const irACrearEvento = () => {
        setSubTabCreacion('evento');
        handleTabChange('publicar');
    };

    // Acciones de Avisos
    const handlePublicarAviso = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!nuevoAviso.trim()) return;
        try {
            await api.post(`/clubes/${id}/avisos`, {
                titulo: tituloAviso.trim() || undefined,
                contenido: nuevoAviso.trim(),
                prioridad: prioridadAviso
            });
            setTituloAviso('');
            setNuevoAviso('');
            setPrioridadAviso('normal');
            setSuccess(`✓ Aviso publicado exitosamente con prioridad ${prioridadAviso.toUpperCase()} para todos los miembros.`);
            fetchAvisos();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al publicar el aviso.');
        }
    };

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

    // Acciones de Eventos
    const handleCrearEvento = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/clubes/${id}/eventos`, {
                ...eventoForm,
                prioridad: eventoForm.prioridad || 'alta',
                notificarAviso: true
            });
            setEventoForm({ titulo: '', descripcion: '', fecha_evento: '', lugar: '', prioridad: 'alta' });
            setSuccess('✓ Evento agendado y notificado con alta prioridad a todos los integrantes.');
            fetchEventos();
            fetchAvisos();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear el evento.');
        }
    };

    const handleAsistencia = async (idEvento, asistira) => {
        setError('');
        const esAlumnoOProfesor = user && [2, 3, 4].includes(Number(user.role_id));
        if (!esAlumnoOProfesor) {
            setError('Solo los alumnos y profesores pueden confirmar asistencia a los eventos.');
            return;
        }

        const ev = eventos.find(e => e.id === idEvento);
        if (ev && ev.fecha_evento) {
            const fechaObj = new Date(String(ev.fecha_evento).replace(' ', 'T'));
            if (!isNaN(fechaObj.getTime()) && fechaObj.getTime() < Date.now()) {
                setError('No se puede registrar asistencia en un evento que ya ha finalizado.');
                return;
            }
        }

        try {
            await api.post(`/clubes/${id}/eventos/${idEvento}/asistencia`, { asistira });
            fetchEventos();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar asistencia.');
        }
    };

    // Ficha Médica de Emergencia (Encargados)
    const handleVerEmergencia = async (miembro) => {
        if (!canManage) return;
        setModalEmergenciaAbierto(true);
        setLoadingEmergencia(true);
        setErrorEmergencia('');
        setSelectedEmergencia(null);
        setTelefonoCopiado('');

        try {
            const res = await api.get(`/clubes/${id}/miembros/${miembro.id}/emergencia`);
            setSelectedEmergencia(res.data);
        } catch (err) {
            console.error("Error al obtener datos de emergencia:", err);
            setErrorEmergencia(err.response?.data?.message || 'No fue posible cargar la información de emergencia.');
        } finally {
            setLoadingEmergencia(false);
        }
    };

    const handleCopiarTelefono = (tel) => {
        if (!tel) return;
        navigator.clipboard.writeText(tel);
        setTelefonoCopiado(tel);
        setTimeout(() => setTelefonoCopiado(''), 2500);
    };

    // Acciones del Código de Unión
    const handleCopyCode = () => {
        if (club?.codigo_union) {
            navigator.clipboard.writeText(club.codigo_union);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleUnirseDirecto = async () => {
        if (!club?.codigo_union) return;
        setJoining(true);
        setJoinMessage({ text: '', type: '' });
        try {
            const res = await api.post('/clubes/unirse', { codigo: club.codigo_union });
            setJoinMessage({ text: res.data.message || '¡Te has unido exitosamente al club!', type: 'success' });
            setIsMember(true);
        } catch (err) {
            setJoinMessage({
                text: err.response?.data?.message || 'Error al unirte al club con este código.',
                type: 'error'
            });
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="web-dashboard">
                <div className="loading-state" style={{ marginTop: '120px' }}>
                    ⏳ Cargando información del club...
                </div>
            </div>
        );
    }

    if (error && !club) {
        return (
            <div className="web-dashboard">
                <div style={{ textAlign: 'center', padding: '80px 20px', color: '#c53030' }}>
                    <h2>🚫 {error || 'Club no encontrado'}</h2>
                    <button
                        onClick={() => navigate(esAdmin ? '/admin' : '/gestion')}
                        className="btn-review-club"
                        style={{ marginTop: '15px' }}
                    >
                        Regresar a Gestión
                    </button>
                </div>
            </div>
        );
    }

    // Cronograma formateado
    let cronogramaItems = [];
    try {
        cronogramaItems = typeof club.cronograma === 'string' ? JSON.parse(club.cronograma) : (club.cronograma || []);
    } catch (e) {
        cronogramaItems = [];
    }

    // Filtrado de avisos visibles
    const avisosVisibles = avisos.filter(a => !descartadosAvisos.includes(`club-${a.id}`));

    // Filtrado de miembros en vivo
    const filteredMiembros = miembros.filter(m => {
        const nombreCompleto = `${m.nombres || ''} ${m.apellidos || ''}`.toLowerCase();
        const correo = (m.correo || '').toLowerCase();
        const boleta = (m.boleta || '').toLowerCase();
        const term = searchMember.toLowerCase().trim();

        const matchBusqueda = !term || nombreCompleto.includes(term) || correo.includes(term) || boleta.includes(term);
        if (!matchBusqueda) return false;

        if (filterRol === 'todos') return true;
        if (filterRol === 'encargados') return ['encargado_profesor', 'encargado_alumno'].includes(m.rol_en_club);
        if (filterRol === 'alumnos') return m.rol_en_club === 'alumno' || !m.rol_en_club;
        return true;
    });

    // Pestañas dinámicas: Si es encargado/admin se añade el apartado exclusivo 'publicar'
    const tabs = [
        { id: 'detalles', label: 'Información General', icon: 'ℹ️' },
        { id: 'avisos', label: 'Avisos Internos', icon: '📢', count: isMember ? avisosVisibles.length : undefined },
        { id: 'eventos', label: 'Eventos del Club', icon: '📅', count: isMember ? eventos.length : undefined },
        { id: 'miembros', label: 'Padrón de Miembros', icon: '👥', count: isMember ? miembros.length : undefined },
        ...(canManage ? [{ id: 'publicar', label: 'Crear Avisos y Eventos', icon: '✍️' }] : [])
    ];

    return (
        <div className="web-dashboard">
            {/* 1. NAVBAR SUPERIOR FIJA INSTITUCIONAL */}
            <header className="admin-navbar-fixed">
                <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="menu-toggle" onClick={toggleSidebar} title="Abrir Menú Lateral">☰</button>
                    <span className="nav-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏆</span>
                        <span style={{ fontWeight: 'bold' }}>{club?.nombre || 'Club'}</span>
                    </span>
                </div>

                <div className="nav-right" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {/* Botón de Emergencias si es Encargado/Admin */}
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => navigate(`/club/${id}/emergencias`)}
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
                                transition: 'all 0.2s'
                            }}
                            title="Directorio médico y contactos de emergencia de los integrantes"
                        >
                            🚨 Emergencias
                        </button>
                    )}

                    {/* Botón de Chat si es Miembro */}
                    {isMember && (
                        <button
                            type="button"
                            onClick={() => navigate(`/chat/${id}`)}
                            style={{
                                background: '#00509e',
                                border: '1px solid rgba(255,255,255,0.3)',
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
                            💬 Chat
                        </button>
                    )}

                    {/* Perfil del Usuario */}
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, {user?.nombres}</span>
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

            {/* 2. LAYOUT PRINCIPAL DE ESCRITORIO CON SIDEBAR */}
            <div className="dashboard-layout">
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    esEncargado={canManage}
                />

                {/* 3. ÁREA PRINCIPAL CON SCROLL INDEPENDIENTE */}
                <main className="admin-main-scroll" style={{ backgroundColor: '#f0f2f5', padding: '24px 32px' }}>
                    <div style={{ maxWidth: '1380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* MENSAJES GLOBALES DE ERROR / ÉXITO */}
                        {error && (
                            <div style={{ background: '#f8d7da', color: '#721c24', padding: '14px 20px', borderRadius: '8px', borderLeft: '5px solid #dc3545', fontWeight: '500' }}>
                                ⚠️ {error}
                            </div>
                        )}
                        {success && (
                            <div style={{ background: '#d4edda', color: '#155724', padding: '14px 20px', borderRadius: '8px', borderLeft: '5px solid #28a745', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <span>{success}</span>
                                {activeTab === 'publicar' && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleTabChange('avisos')}
                                            style={{ background: '#003366', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            📢 Ver Muro de Avisos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTabChange('eventos')}
                                            style={{ background: '#00509e', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            📅 Ver Eventos Agendados
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CABECERA HORIZONTAL DE ESCRITORIO (HERO BANNER WEB) */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                            border: '1px solid #e1e5eb',
                            overflow: 'hidden'
                        }}>
                            {/* Franja superior de acento con gradiente institucional */}
                            <div style={{
                                height: '6px',
                                background: 'linear-gradient(90deg, #003366 0%, #800020 50%, #00509e 100%)'
                            }} />

                            <div style={{
                                padding: '22px 28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '20px'
                            }}>
                                {/* Lado Izquierdo: Emblema + Título + Metadatos */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '320px', flex: '1 1 500px' }}>
                                    <div style={{
                                        width: '72px',
                                        height: '72px',
                                        borderRadius: '14px',
                                        background: 'linear-gradient(135deg, #003366 0%, #00509e 100%)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2.5rem',
                                        boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
                                        flexShrink: 0
                                    }}>
                                        🏆
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                            <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#003366', fontWeight: '800', lineHeight: '1.2' }}>
                                                {club.nombre}
                                            </h1>
                                            <span className={`club-tag tag-${club.estatus?.toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                                                {club.estatus?.replace('_', ' ')}
                                            </span>
                                            {isMember ? (
                                                <span style={{
                                                    fontSize: '0.8rem',
                                                    background: '#d4edda',
                                                    color: '#155724',
                                                    padding: '4px 12px',
                                                    borderRadius: '15px',
                                                    fontWeight: 'bold',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    ✓ {miRolInterno === 'encargado_profesor' ? 'Profesor Titular' : miRolInterno === 'encargado_alumno' ? 'Alumno Encargado' : 'Miembro Activo'}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
                                                    ℹ️ Invitado / No inscrito
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.9rem', color: '#555', marginTop: '6px' }}>
                                            <span>👨‍🏫 <strong>Profesor Titular:</strong> {club.profesor_nombres} {club.profesor_apellidos}</span>
                                            {club.espacios_tiempos && (
                                                <span>🕒 <strong>Horario:</strong> {club.espacios_tiempos}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Lado Derecho: Acciones Rápidas */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => handleTabChange('publicar')}
                                            style={{
                                                background: activeTab === 'publicar' ? '#1e8449' : '#28a745',
                                                border: 'none',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                padding: '10px 18px',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 6px rgba(40, 167, 69, 0.25)',
                                                transition: 'all 0.2s'
                                            }}
                                            title="Abrir apartado de creación de avisos y eventos"
                                        >
                                            ✍️ Crear Avisos / Eventos
                                        </button>
                                    )}

                                    {isMember ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/chat/${id}`)}
                                            style={{
                                                background: '#003366',
                                                border: 'none',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                padding: '10px 18px',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 6px rgba(0, 51, 102, 0.25)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            💬 Entrar al Chat
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleUnirseDirecto}
                                            disabled={joining}
                                            style={{
                                                background: '#28a745',
                                                border: 'none',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                padding: '10px 18px',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 6px rgba(40, 167, 69, 0.25)'
                                            }}
                                        >
                                            {joining ? '⏳ Uniendo...' : '🚀 Unirme a este Club'}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => navigate(esAdmin ? '/admin' : '/gestion')}
                                        style={{
                                            background: '#e9ecef',
                                            border: '1px solid #ced4da',
                                            color: '#333',
                                            cursor: 'pointer',
                                            padding: '10px 16px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        🔙 Volver
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* BARRA DE PESTAÑAS DE ESCRITORIO (DESKTOP TABS) */}
                        <div style={{
                            display: 'flex',
                            background: '#ffffff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            border: '1px solid #e1e5eb',
                            overflowX: 'auto',
                            padding: '6px',
                            gap: '6px'
                        }}>
                            {tabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                const isSpecialTab = tab.id === 'publicar';

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleTabChange(tab.id)}
                                        style={{
                                            flex: '1',
                                            minWidth: '170px',
                                            padding: '12px 18px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: isActive ? '700' : '600',
                                            fontSize: '0.92rem',
                                            background: isActive 
                                                ? (isSpecialTab ? '#1e8449' : '#003366') 
                                                : (isSpecialTab ? '#e6f4ea' : 'transparent'),
                                            color: isActive 
                                                ? '#ffffff' 
                                                : (isSpecialTab ? '#1e8449' : '#495057'),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isActive ? '0 2px 6px rgba(0,51,102,0.2)' : 'none'
                                        }}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && (
                                            <span style={{
                                                background: isActive ? 'rgba(255,255,255,0.25)' : '#e9ecef',
                                                color: isActive ? '#ffffff' : '#495057',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ========================================================= */}
                        {/* PESTAÑA 1: INFORMACIÓN GENERAL (GRID WEB DE 2 COLUMNAS)   */}
                        {/* ========================================================= */}
                        {activeTab === 'detalles' && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) 380px',
                                gap: '24px',
                                alignItems: 'start'
                            }}>
                                {/* COLUMNA IZQUIERDA (PRINCIPAL) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    
                                    {/* Tarjeta de Descripción y Objetivos */}
                                    <div style={{ background: '#ffffff', padding: '26px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#003366', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            📖 Acerca del Club
                                        </h3>
                                        <p style={{ fontSize: '1rem', color: '#333', lineHeight: '1.65', margin: '0 0 20px 0' }}>
                                            {club.descripcion || 'Sin descripción registrada por el momento.'}
                                        </p>

                                        {club.objetivo && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <h4 style={{ margin: '0 0 8px 0', color: '#003366', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    🎯 Objetivo Formativo y Deportivo
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#444', lineHeight: '1.6', background: '#f8f9fa', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid #003366' }}>
                                                    {club.objetivo}
                                                </p>
                                            </div>
                                        )}

                                        {club.detalle_actividades && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <h4 style={{ margin: '0 0 8px 0', color: '#003366', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    📋 Dinámica y Detalle de Actividades
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#444', lineHeight: '1.6' }}>
                                                    {club.detalle_actividades}
                                                </p>
                                            </div>
                                        )}

                                        {club.impacto && (
                                            <div>
                                                <h4 style={{ margin: '0 0 8px 0', color: '#003366', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    🌟 Impacto en la Comunidad ESCOM
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#444', lineHeight: '1.6' }}>
                                                    {club.impacto}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tarjeta de Cronograma de Actividades */}
                                    <div style={{ background: '#ffffff', padding: '26px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#003366', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            🗓️ Cronograma Oficial de Actividades
                                        </h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#003366', color: '#fff', textAlign: 'left' }}>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.9rem', width: '25%' }}>Mes / Período</th>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.9rem' }}>Actividad Programada</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cronogramaItems.length > 0 ? (
                                                        cronogramaItems.map((item, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fbfd' }}>
                                                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#003366', fontSize: '0.92rem' }}>
                                                                    {item.mes || `Período ${idx + 1}`}
                                                                </td>
                                                                <td style={{ padding: '12px 16px', color: '#333', fontSize: '0.92rem', lineHeight: '1.5' }}>
                                                                    {item.actividad}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                                                No hay cronograma de actividades registrado en la propuesta oficial.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA (SIDEBAR WEB DE INFORMACIÓN) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                    {/* Tarjeta de Código de Unión Oficial */}
                                    <div style={{
                                        background: '#ffffff',
                                        padding: '24px',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        border: '1px solid #e1e5eb',
                                        textAlign: 'center'
                                    }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#003366', fontSize: '1.1rem', fontWeight: '700' }}>
                                            🔑 Código Oficial de Acceso
                                        </h4>
                                        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#666' }}>
                                            Comparte este código para permitir a otros alumnos integrarse a este club.
                                        </p>

                                        <div style={{
                                            background: '#f8f9fa',
                                            border: '2px dashed #003366',
                                            borderRadius: '10px',
                                            padding: '16px',
                                            marginBottom: '14px'
                                        }}>
                                            <div style={{
                                                fontSize: '1.8rem',
                                                fontFamily: 'monospace',
                                                fontWeight: 'bold',
                                                color: '#003366',
                                                letterSpacing: '2px'
                                            }}>
                                                {club.codigo_union || 'NO-ASIGNADO'}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleCopyCode}
                                            style={{
                                                width: '100%',
                                                padding: '11px',
                                                background: copied ? '#28a745' : '#003366',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '0.92rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                        >
                                            {copied ? '✓ ¡Código Copiado al Portapapeles!' : '📋 Copiar Código Oficial'}
                                        </button>

                                        {!isMember && (
                                            <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleUnirseDirecto}
                                                    disabled={joining}
                                                    style={{
                                                        width: '100%',
                                                        padding: '11px',
                                                        background: '#28a745',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.92rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    {joining ? '⏳ Procesando unión...' : '🚀 Unirme a este Club Ahora'}
                                                </button>

                                                {joinMessage.text && (
                                                    <div style={{
                                                        marginTop: '10px',
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        background: joinMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                                                        color: joinMessage.type === 'success' ? '#155724' : '#721c24'
                                                    }}>
                                                        {joinMessage.text}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tarjeta de Horarios y Espacios */}
                                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#003366', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            🕒 Horarios y Espacios
                                        </h4>
                                        <div style={{ background: '#f8f9fa', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #00509e', fontSize: '0.92rem', color: '#333', lineHeight: '1.5' }}>
                                            {club.espacios_tiempos || 'Horarios por definir con los encargados.'}
                                        </div>
                                    </div>

                                    {/* Tarjeta de Encargados / Liderazgo */}
                                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        <h4 style={{ margin: '0 0 14px 0', color: '#003366', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            👥 Liderazgo del Club
                                        </h4>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {/* Profesor Encargado */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e7f3ff', color: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                                                    👨‍🏫
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#003366', fontWeight: 'bold' }}>
                                                        Profesor Titular Encargado
                                                    </span>
                                                    <div style={{ fontWeight: '700', color: '#1c1e21', fontSize: '0.95rem' }}>
                                                        {club.profesor_nombres} {club.profesor_apellidos}
                                                    </div>
                                                    {club.profesor_correo && (
                                                        <div style={{ fontSize: '0.82rem', color: '#666' }}>
                                                            {club.profesor_correo}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Alumno Encargado */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e6f4ea', color: '#1e8449', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                                                    🎓
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#1e8449', fontWeight: 'bold' }}>
                                                        Alumno Encargado
                                                    </span>
                                                    <div style={{ fontWeight: '700', color: '#1c1e21', fontSize: '0.95rem' }}>
                                                        {club.alumno_nombres ? `${club.alumno_nombres} ${club.alumno_apellidos}` : 'No asignado'}
                                                    </div>
                                                    {club.alumno_boleta && (
                                                        <div style={{ fontSize: '0.82rem', color: '#666' }}>
                                                            Boleta: {club.alumno_boleta}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* PESTAÑA 2: AVISOS INTERNOS (MURO DE LECTURA LIMPIO)       */}
                        {/* ========================================================= */}
                        {activeTab === 'avisos' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {!isMember ? (
                                    <div style={{ background: '#ffffff', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e1e5eb' }}>
                                        <span style={{ fontSize: '3rem' }}>🔒</span>
                                        <h3 style={{ color: '#003366', marginTop: '12px' }}>Avisos Internos Reservados para Miembros</h3>
                                        <p style={{ color: '#666', maxWidth: '600px', margin: '10px auto 20px auto', lineHeight: '1.6' }}>
                                            Los avisos y comunicados oficiales son exclusivos para los integrantes inscritos en este club. Únete con el código oficial para acceder a esta sección.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleUnirseDirecto}
                                            disabled={joining}
                                            style={{
                                                padding: '10px 24px',
                                                background: '#28a745',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🚀 Unirme al Club
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <h3 style={{ margin: 0, color: '#003366', fontSize: '1.25rem' }}>
                                                    📢 Muro de Avisos del Club
                                                </h3>
                                                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                                    {avisosVisibles.length} aviso(s) disponible(s)
                                                </span>
                                            </div>

                                            {/* Atajo al apartado de creación para encargados */}
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={irACrearAviso}
                                                    style={{
                                                        background: '#003366',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '8px 16px',
                                                        fontSize: '0.86rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    ✍️ Redactar Nuevo Aviso
                                                </button>
                                            )}
                                        </div>

                                        {loadingAvisos ? (
                                            <p style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando avisos...</p>
                                        ) : avisosVisibles.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                {avisosVisibles.map(aviso => {
                                                    const rolEmisor = aviso.rol_en_club || aviso.rol_usuario;
                                                    const esProfesor = rolEmisor === 'encargado_profesor' || Number(aviso.role_id) === 3;
                                                    const esAlumnoEncargado = rolEmisor === 'encargado_alumno' || Number(aviso.role_id) === 2;
                                                    const esAlta = aviso.prioridad === 'alta';
                                                    const esBaja = aviso.prioridad === 'baja';

                                                    return (
                                                        <div
                                                            key={aviso.id}
                                                            style={{
                                                                border: '1px solid #e1e5eb',
                                                                borderLeft: `5px solid ${esAlta ? '#dc3545' : esBaja ? '#28a745' : '#003366'}`,
                                                                borderRadius: '10px',
                                                                padding: '18px 22px',
                                                                backgroundColor: esAlta ? '#fffcfc' : '#fbfcfd',
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontWeight: '700', color: '#003366', fontSize: '1rem' }}>
                                                                        {aviso.nombres ? `${aviso.nombres} ${aviso.apellidos}` : 'Encargado del Club'}
                                                                    </span>

                                                                    {esProfesor && (
                                                                        <span style={{ fontSize: '0.75rem', background: '#e7f3ff', color: '#003366', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                                            👨‍🏫 Profesor Titular
                                                                        </span>
                                                                    )}
                                                                    {esAlumnoEncargado && (
                                                                        <span style={{ fontSize: '0.75rem', background: '#e6f4ea', color: '#1e8449', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                                            🎓 Alumno Encargado
                                                                        </span>
                                                                    )}

                                                                    {/* Insignia de Prioridad */}
                                                                    {esAlta && (
                                                                        <span style={{ fontSize: '0.74rem', background: '#ffeef0', color: '#dc3545', border: '1px solid #f5c6cb', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                            🔴 Alta Prioridad
                                                                        </span>
                                                                    )}
                                                                    {esBaja && (
                                                                        <span style={{ fontSize: '0.74rem', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                            🟢 Baja Prioridad
                                                                        </span>
                                                                    )}
                                                                    {!esAlta && !esBaja && (
                                                                        <span style={{ fontSize: '0.74rem', background: '#e7f3ff', color: '#003366', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                            🔵 Prioridad Normal
                                                                        </span>
                                                                    )}

                                                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                                                        🕒 {new Date(aviso.fecha_envio || aviso.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDescartarAviso(aviso.id, e)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#888',
                                                                        cursor: 'pointer',
                                                                        fontSize: '1.1rem',
                                                                        padding: '2px 6px'
                                                                    }}
                                                                    title="Descartar este aviso de mi vista"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>

                                                            {aviso.titulo && (
                                                                <h4 style={{ margin: '0 0 8px 0', color: esAlta ? '#b02a37' : '#003366', fontSize: '1.05rem', fontWeight: 'bold' }}>
                                                                    {aviso.titulo}
                                                                </h4>
                                                            )}

                                                            <p style={{ margin: 0, color: '#333', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                                                {aviso.contenido}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                                No hay avisos recientes para mostrar en este momento.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* PESTAÑA 3: EVENTOS DEL CLUB (AGENDA / GRID LIMPIO)         */}
                        {/* ========================================================= */}
                        {activeTab === 'eventos' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {!isMember ? (
                                    <div style={{ background: '#ffffff', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e1e5eb' }}>
                                        <span style={{ fontSize: '3rem' }}>🔒</span>
                                        <h3 style={{ color: '#003366', marginTop: '12px' }}>Eventos Reservados para Miembros</h3>
                                        <p style={{ color: '#666', maxWidth: '600px', margin: '10px auto 20px auto', lineHeight: '1.6' }}>
                                            La agenda de entrenamientos, torneos y confirmaciones de asistencia son exclusivas para los miembros activos.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleUnirseDirecto}
                                            disabled={joining}
                                            style={{ padding: '10px 24px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            🚀 Unirme al Club
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <h3 style={{ margin: 0, color: '#003366', fontSize: '1.25rem' }}>
                                                    📅 Próximos Eventos y Actividades
                                                </h3>
                                                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                                    {eventos.length} evento(s) agendado(s)
                                                </span>
                                            </div>

                                            {/* Atajo al apartado de creación para encargados */}
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={irACrearEvento}
                                                    style={{
                                                        background: '#003366',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '8px 16px',
                                                        fontSize: '0.86rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    ➕ Agendar Nuevo Evento
                                                </button>
                                            )}
                                        </div>

                                        {loadingEventos ? (
                                            <p style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando eventos...</p>
                                        ) : eventos.length > 0 ? (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                                                gap: '18px'
                                            }}>
                                                {eventos.map(evento => {
                                                    const fechaObj = new Date(String(evento.fecha_evento).replace(' ', 'T'));
                                                    const eventoYaPaso = !isNaN(fechaObj.getTime()) && fechaObj.getTime() < Date.now();
                                                    const esAlumnoOProfesor = user && [2, 3, 4].includes(Number(user.role_id));
                                                    const esAltaPrioridad = evento.prioridad === 'alta';
                                                    const esBajaPrioridad = evento.prioridad === 'baja';

                                                    return (
                                                        <div
                                                            key={evento.id}
                                                            style={{
                                                                border: esAltaPrioridad ? '1px solid #f5c6cb' : '1px solid #e1e5eb',
                                                                borderLeft: esAltaPrioridad ? '5px solid #dc3545' : esBajaPrioridad ? '5px solid #28a745' : '5px solid #003366',
                                                                borderRadius: '10px',
                                                                padding: '20px',
                                                                backgroundColor: esAltaPrioridad ? '#fffcfc' : '#fbfcfd',
                                                                display: 'flex',
                                                                gap: '16px',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                                                            }}
                                                        >
                                                            {/* Insignia de Fecha Tipo Calendario Web */}
                                                            <div style={{
                                                                width: '65px',
                                                                height: '75px',
                                                                borderRadius: '8px',
                                                                overflow: 'hidden',
                                                                border: '1px solid #ced4da',
                                                                textAlign: 'center',
                                                                flexShrink: 0,
                                                                backgroundColor: '#fff'
                                                            }}>
                                                                <div style={{
                                                                    background: esAltaPrioridad ? '#dc3545' : '#003366',
                                                                    color: '#fff',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 'bold',
                                                                    textTransform: 'uppercase',
                                                                    padding: '3px 0'
                                                                }}>
                                                                    {!isNaN(fechaObj.getTime()) ? fechaObj.toLocaleString('es-MX', { month: 'short' }) : 'EVT'}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '1.6rem',
                                                                    fontWeight: 'bold',
                                                                    color: '#333',
                                                                    lineHeight: '1.3'
                                                                }}>
                                                                    {!isNaN(fechaObj.getTime()) ? fechaObj.getDate() : '—'}
                                                                </div>
                                                            </div>

                                                            {/* Información del Evento y Asistencia */}
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                                <div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                                                        <h4 style={{ margin: 0, color: '#003366', fontSize: '1.1rem' }}>
                                                                            {evento.titulo}
                                                                        </h4>
                                                                        {esAltaPrioridad && (
                                                                            <span style={{ fontSize: '0.72rem', background: '#ffeef0', color: '#dc3545', border: '1px solid #f5c6cb', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                                                                                🔴 Alta Prioridad
                                                                            </span>
                                                                        )}
                                                                        {esBajaPrioridad && (
                                                                            <span style={{ fontSize: '0.72rem', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                                                                                🟢 Baja Prioridad
                                                                            </span>
                                                                        )}
                                                                        {!esAltaPrioridad && !esBajaPrioridad && (
                                                                            <span style={{ fontSize: '0.72rem', background: '#e7f3ff', color: '#003366', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                                                                                🔵 Normal
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div style={{ fontSize: '0.85rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                                                                        <span>🕒 {!isNaN(fechaObj.getTime()) ? fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Hora por confirmar'}</span>
                                                                        {evento.lugar && <span>📍 {evento.lugar}</span>}
                                                                    </div>

                                                                    {evento.descripcion && (
                                                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#444', lineHeight: '1.4' }}>
                                                                            {evento.descripcion}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '6px' }}>
                                                                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                                                                        👥 <strong>Confirmados:</strong> {evento.total_asistentes || 0} integrantes
                                                                    </div>

                                                                    {esAlumnoOProfesor && (
                                                                        eventoYaPaso ? (
                                                                            <div style={{ fontSize: '0.82rem', color: '#888', background: '#f0f2f5', padding: '5px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span>🕒 Evento finalizado.</span>
                                                                                {Number(evento.mi_respuesta) === 1 && <strong style={{ color: '#28a745' }}>✓ Asististe</strong>}
                                                                                {Number(evento.mi_respuesta) === 0 && <strong style={{ color: '#dc3545' }}>✗ No asististe</strong>}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAsistencia(evento.id, 1)}
                                                                                    style={{
                                                                                        padding: '6px 12px',
                                                                                        border: 'none',
                                                                                        borderRadius: '6px',
                                                                                        cursor: 'pointer',
                                                                                        fontWeight: 'bold',
                                                                                        fontSize: '0.85rem',
                                                                                        background: Number(evento.mi_respuesta) === 1 ? '#28a745' : '#e4e6eb',
                                                                                        color: Number(evento.mi_respuesta) === 1 ? '#fff' : '#333'
                                                                                    }}
                                                                                >
                                                                                    ✓ {Number(evento.mi_respuesta) === 1 ? 'Asistencia confirmada' : 'Asistiré'}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAsistencia(evento.id, 0)}
                                                                                    style={{
                                                                                        padding: '6px 12px',
                                                                                        border: 'none',
                                                                                        borderRadius: '6px',
                                                                                        cursor: 'pointer',
                                                                                        fontWeight: 'bold',
                                                                                        fontSize: '0.85rem',
                                                                                        background: Number(evento.mi_respuesta) === 0 ? '#dc3545' : '#e4e6eb',
                                                                                        color: Number(evento.mi_respuesta) === 0 ? '#fff' : '#333'
                                                                                    }}
                                                                                >
                                                                                    ✗ {Number(evento.mi_respuesta) === 0 ? 'No asistirás' : 'No asistiré'}
                                                                                </button>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                                No hay eventos programados en este momento.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* PESTAÑA 4: PADRÓN DE MIEMBROS (TABLA WEB CON FILTROS)     */}
                        {/* ========================================================= */}
                        {activeTab === 'miembros' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {!isMember ? (
                                    <div style={{ background: '#ffffff', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e1e5eb' }}>
                                        <span style={{ fontSize: '3rem' }}>🔒</span>
                                        <h3 style={{ color: '#003366', marginTop: '12px' }}>Padrón Reservado para Miembros</h3>
                                        <p style={{ color: '#666', maxWidth: '600px', margin: '10px auto 20px auto', lineHeight: '1.6' }}>
                                            La lista oficial de integrantes y sus roles institucionales es visible únicamente para miembros del club.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleUnirseDirecto}
                                            disabled={joining}
                                            style={{ padding: '10px 24px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            🚀 Unirme al Club
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ background: '#ffffff', padding: '26px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e5eb' }}>
                                        
                                        {/* Barra Superior de Herramientas Web */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 4px 0', color: '#003366', fontSize: '1.3rem' }}>
                                                    👥 Padrón Oficial de Miembros
                                                </h3>
                                                <span style={{ fontSize: '0.88rem', color: '#666' }}>
                                                    {filteredMiembros.length} de {miembros.length} integrantes listados
                                                </span>
                                            </div>

                                            {/* Acceso al Directorio Completo si es Encargado/Admin */}
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/club/${id}/emergencias`)}
                                                    style={{
                                                        background: '#dc3545',
                                                        border: 'none',
                                                        color: '#fff',
                                                        cursor: 'pointer',
                                                        padding: '9px 16px',
                                                        borderRadius: '6px',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.88rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 2px 6px rgba(220, 53, 69, 0.25)'
                                                    }}
                                                >
                                                    🚨 Abrir Directorio Médico Completo
                                                </button>
                                            )}
                                        </div>

                                        {/* Filtros y Buscador en Tiempo Real */}
                                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                            <div style={{ flex: '1 1 300px' }}>
                                                <input
                                                    type="text"
                                                    value={searchMember}
                                                    onChange={(e) => setSearchMember(e.target.value)}
                                                    placeholder="🔍 Buscar integrante por nombre, correo o boleta..."
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ced4da',
                                                        fontSize: '0.92rem',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterRol('todos')}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ced4da',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        background: filterRol === 'todos' ? '#003366' : '#f8f9fa',
                                                        color: filterRol === 'todos' ? '#fff' : '#444'
                                                    }}
                                                >
                                                    Todos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterRol('encargados')}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ced4da',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        background: filterRol === 'encargados' ? '#003366' : '#f8f9fa',
                                                        color: filterRol === 'encargados' ? '#fff' : '#444'
                                                    }}
                                                >
                                                    Encargados
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterRol('alumnos')}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ced4da',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        background: filterRol === 'alumnos' ? '#003366' : '#f8f9fa',
                                                        color: filterRol === 'alumnos' ? '#fff' : '#444'
                                                    }}
                                                >
                                                    Alumnos
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tabla de Integrantes */}
                                        <div style={{ overflowX: 'auto', border: '1px solid #e1e5eb', borderRadius: '8px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#003366', color: '#fff' }}>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.88rem' }}>#</th>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.88rem' }}>Integrante</th>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.88rem' }}>Correo Institucional</th>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.88rem' }}>Rol en el Club</th>
                                                        <th style={{ padding: '12px 16px', fontSize: '0.88rem' }}>Estatus</th>
                                                        {canManage && (
                                                            <th style={{ padding: '12px 16px', fontSize: '0.88rem', textAlign: 'center' }}>Acciones</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loadingMiembros ? (
                                                        <tr>
                                                            <td colSpan={canManage ? 6 : 5} style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                                                                Cargando lista de miembros...
                                                            </td>
                                                        </tr>
                                                    ) : filteredMiembros.length > 0 ? (
                                                        filteredMiembros.map((miembro, idx) => (
                                                            <tr key={miembro.id || idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfdfe' }}>
                                                                <td style={{ padding: '12px 16px', color: '#888', fontSize: '0.88rem' }}>
                                                                    {idx + 1}
                                                                </td>
                                                                <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1c1e21', fontSize: '0.92rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#003366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                            {(miembro.nombres || 'U').charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div>{miembro.nombres} {miembro.apellidos}</div>
                                                                            {miembro.boleta && (
                                                                                <small style={{ color: '#888', fontFamily: 'monospace' }}>Boleta: {miembro.boleta}</small>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '12px 16px', color: '#555', fontSize: '0.9rem' }}>
                                                                    {miembro.correo || '—'}
                                                                </td>
                                                                <td style={{ padding: '12px 16px' }}>
                                                                    <span style={{
                                                                        fontSize: '0.78rem',
                                                                        padding: '4px 10px',
                                                                        borderRadius: '12px',
                                                                        background: miembro.rol_en_club === 'encargado_profesor' ? '#e7f3ff' : miembro.rol_en_club === 'encargado_alumno' ? '#e6f4ea' : '#f0f2f5',
                                                                        color: miembro.rol_en_club === 'encargado_profesor' ? '#003366' : miembro.rol_en_club === 'encargado_alumno' ? '#1e8449' : '#555',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        {miembro.rol_en_club === 'encargado_profesor' ? '👨‍🏫 Profesor Titular' : miembro.rol_en_club === 'encargado_alumno' ? '🎓 Alumno Encargado' : '🏃 Miembro'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px 16px' }}>
                                                                    <span style={{
                                                                        fontSize: '0.78rem',
                                                                        padding: '3px 8px',
                                                                        borderRadius: '10px',
                                                                        background: miembro.estatus === 'activo' ? '#d4edda' : '#fff3cd',
                                                                        color: miembro.estatus === 'activo' ? '#155724' : '#856404',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        {miembro.estatus || 'activo'}
                                                                    </span>
                                                                </td>
                                                                {canManage && (
                                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleVerEmergencia(miembro)}
                                                                            style={{
                                                                                background: '#e7f3ff',
                                                                                color: '#003366',
                                                                                border: '1px solid #b6ddff',
                                                                                padding: '6px 12px',
                                                                                borderRadius: '6px',
                                                                                cursor: 'pointer',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '0.82rem',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '5px'
                                                                            }}
                                                                        >
                                                                            🩺 Ficha Médica
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={canManage ? 6 : 5} style={{ padding: '30px', textAlign: 'center', color: '#888' }}>
                                                                No se encontraron miembros que coincidan con la búsqueda.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* PESTAÑA 5: APARTADO APARTE - CREAR AVISOS Y EVENTOS       */}
                        {/* ========================================================= */}
                        {activeTab === 'publicar' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                {!canManage ? (
                                    <div style={{ background: '#ffffff', padding: '50px 30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e1e5eb' }}>
                                        <span style={{ fontSize: '3.5rem' }}>🚫</span>
                                        <h3 style={{ color: '#dc3545', marginTop: '12px' }}>Acceso Exclusivo para Encargados</h3>
                                        <p style={{ color: '#666', maxWidth: '550px', margin: '10px auto 20px auto' }}>
                                            Este apartado de publicación y programación está reservado únicamente para el Profesor Titular, Alumno Encargado y Administradores.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleTabChange('detalles')}
                                            className="btn-review-club"
                                        >
                                            Volver a Información General
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Barra Superior del Apartado de Creación */}
                                        <div style={{
                                            background: '#ffffff',
                                            padding: '24px 28px',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                            border: '1px solid #e1e5eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '16px'
                                        }}>
                                            <div>
                                                <h2 style={{ margin: 0, color: '#003366', fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span>✍️</span>
                                                    <span>Centro de Creación y Publicación del Club</span>
                                                </h2>
                                                <p style={{ margin: '6px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                                                    Redacta avisos urgentes o agenda nuevos eventos y entrenamientos oficiales para los integrantes.
                                                </p>
                                            </div>

                                            {/* Selector de Vista: Ambos, Solo Aviso, Solo Evento */}
                                            <div style={{ display: 'flex', background: '#f0f2f5', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubTabCreacion('ambos')}
                                                    style={{
                                                        padding: '7px 14px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        background: subTabCreacion === 'ambos' ? '#003366' : 'transparent',
                                                        color: subTabCreacion === 'ambos' ? '#fff' : '#555',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    📋 Ver Ambos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubTabCreacion('aviso')}
                                                    style={{
                                                        padding: '7px 14px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        background: subTabCreacion === 'aviso' ? '#003366' : 'transparent',
                                                        color: subTabCreacion === 'aviso' ? '#fff' : '#555',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    📢 Redactar Aviso
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubTabCreacion('evento')}
                                                    style={{
                                                        padding: '7px 14px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        background: subTabCreacion === 'evento' ? '#003366' : 'transparent',
                                                        color: subTabCreacion === 'evento' ? '#fff' : '#555',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    📅 Agendar Evento
                                                </button>
                                            </div>
                                        </div>

                                        {/* Formulario(s) de Creación */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: subTabCreacion === 'ambos' ? 'repeat(auto-fit, minmax(480px, 1fr))' : '1fr',
                                            gap: '24px',
                                            alignItems: 'start'
                                        }}>

                                            {/* PANEL 1: PUBLICAR AVISO INTERNO */}
                                            {(subTabCreacion === 'ambos' || subTabCreacion === 'aviso') && (
                                                <div style={{
                                                    background: '#ffffff',
                                                    padding: '28px',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                                                    border: '1px solid #e1e5eb',
                                                    borderTop: '5px solid #003366'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f0f2f5', paddingBottom: '12px' }}>
                                                        <h3 style={{ margin: 0, color: '#003366', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span>📢</span>
                                                            <span>Publicar Aviso Oficial</span>
                                                        </h3>
                                                        <span style={{
                                                            fontSize: '0.78rem',
                                                            background: '#e7f3ff',
                                                            color: '#003366',
                                                            padding: '4px 10px',
                                                            borderRadius: '10px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            Publicarás como: {miRolInterno === 'encargado_profesor' ? 'Profesor Titular' : miRolInterno === 'encargado_alumno' ? 'Alumno Encargado' : 'Administrador'}
                                                        </span>
                                                    </div>

                                                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#555', lineHeight: '1.5' }}>
                                                        El aviso se notificará y mostrará inmediatamente en el Muro de Avisos para todos los miembros inscritos.
                                                    </p>

                                                    <form onSubmit={handlePublicarAviso}>
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '6px', color: '#333' }}>
                                                                Título o Asunto del Aviso (Opcional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={tituloAviso}
                                                                onChange={(e) => setTituloAviso(e.target.value)}
                                                                placeholder="Ej. Convocatoria importante / Cambio de horario de práctica"
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '11px 14px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #ced4da',
                                                                    boxSizing: 'border-box',
                                                                    fontSize: '0.92rem'
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Selector de Prioridad del Aviso */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px', color: '#333' }}>
                                                                Nivel de Prioridad del Comunicado:
                                                            </label>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrioridadAviso('alta')}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px',
                                                                        padding: '10px 14px',
                                                                        borderRadius: '8px',
                                                                        border: prioridadAviso === 'alta' ? '2px solid #dc3545' : '1px solid #ced4da',
                                                                        background: prioridadAviso === 'alta' ? '#fff5f5' : '#fff',
                                                                        color: prioridadAviso === 'alta' ? '#dc3545' : '#555',
                                                                        fontWeight: prioridadAviso === 'alta' ? '700' : '500',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.88rem',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span>🔴</span>
                                                                    <span>Alta Prioridad</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrioridadAviso('normal')}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px',
                                                                        padding: '10px 14px',
                                                                        borderRadius: '8px',
                                                                        border: prioridadAviso === 'normal' ? '2px solid #003366' : '1px solid #ced4da',
                                                                        background: prioridadAviso === 'normal' ? '#f0f5fa' : '#fff',
                                                                        color: prioridadAviso === 'normal' ? '#003366' : '#555',
                                                                        fontWeight: prioridadAviso === 'normal' ? '700' : '500',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.88rem',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span>🔵</span>
                                                                    <span>Normal</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrioridadAviso('baja')}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px',
                                                                        padding: '10px 14px',
                                                                        borderRadius: '8px',
                                                                        border: prioridadAviso === 'baja' ? '2px solid #28a745' : '1px solid #ced4da',
                                                                        background: prioridadAviso === 'baja' ? '#f4fbf6' : '#fff',
                                                                        color: prioridadAviso === 'baja' ? '#28a745' : '#555',
                                                                        fontWeight: prioridadAviso === 'baja' ? '700' : '500',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.88rem',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span>🟢</span>
                                                                    <span>Baja Prioridad</span>
                                                                </button>
                                                            </div>
                                                            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#666' }}>
                                                                {prioridadAviso === 'alta' && '⚡ Los avisos de alta prioridad se ordenan al inicio del panel de los integrantes con distintivo rojo.'}
                                                                {prioridadAviso === 'normal' && 'ℹ️ Publicación estándar visible en el orden cronológico general.'}
                                                                {prioridadAviso === 'baja' && '🌱 Información secundaria o recordatorios cotidianos sin carácter urgente.'}
                                                            </div>
                                                        </div>

                                                        <div style={{ marginBottom: '18px' }}>
                                                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', color: '#333' }}>
                                                                Mensaje o Comunicado Oficial *
                                                            </label>
                                                            <textarea
                                                                rows="6"
                                                                value={nuevoAviso}
                                                                onChange={(e) => setNuevoAviso(e.target.value)}
                                                                placeholder="Escribe las indicaciones, cambios de horario, avisos de partidos o información relevante para los alumnos..."
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '14px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #ced4da',
                                                                    boxSizing: 'border-box',
                                                                    fontSize: '0.95rem',
                                                                    fontFamily: 'inherit',
                                                                    resize: 'vertical'
                                                                }}
                                                                required
                                                            />
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem', color: '#888' }}>
                                                                <span>Caracteres: {nuevoAviso.length}</span>
                                                                <span>Formato texto plano</span>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                            <button
                                                                type="submit"
                                                                className="btn-review-club"
                                                                style={{ padding: '12px 26px', fontSize: '0.95rem', fontWeight: 'bold' }}
                                                            >
                                                                📢 Publicar Aviso Ahora
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}

                                            {/* PANEL 2: AGENDAR NUEVO EVENTO */}
                                            {(subTabCreacion === 'ambos' || subTabCreacion === 'evento') && (
                                                <div style={{
                                                    background: '#ffffff',
                                                    padding: '28px',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                                                    border: '1px solid #e1e5eb',
                                                    borderTop: '5px solid #28a745'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f0f2f5', paddingBottom: '12px' }}>
                                                        <h3 style={{ margin: 0, color: '#155724', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span>📅</span>
                                                            <span>Agendar Nuevo Evento o Entrenamiento</span>
                                                        </h3>
                                                        <span style={{
                                                            fontSize: '0.78rem',
                                                            background: '#d4edda',
                                                            color: '#155724',
                                                            padding: '4px 10px',
                                                            borderRadius: '10px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            Con Registro de Asistencia (RSVP)
                                                        </span>
                                                    </div>

                                                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#555', lineHeight: '1.5' }}>
                                                        Registra los entrenamientos, pruebas o encuentros deportivos para que los integrantes puedan confirmar su asistencia.
                                                    </p>

                                                    <form onSubmit={handleCrearEvento}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                                                            <div>
                                                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px', color: '#333' }}>
                                                                    Título de la Actividad *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={eventoForm.titulo}
                                                                    onChange={(e) => setEventoForm({ ...eventoForm, titulo: e.target.value })}
                                                                    placeholder="Ej. Sesión técnica de calentamiento / Torneo amistoso"
                                                                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
                                                                    required
                                                                />
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                                                <div>
                                                                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px', color: '#333' }}>
                                                                    Fecha y Hora del Evento *
                                                                    </label>
                                                                    <input
                                                                        type="datetime-local"
                                                                        value={eventoForm.fecha_evento}
                                                                        onChange={(e) => setEventoForm({ ...eventoForm, fecha_evento: e.target.value })}
                                                                        style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
                                                                        required
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px', color: '#333' }}>
                                                                        Lugar o Instalación
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={eventoForm.lugar}
                                                                        onChange={(e) => setEventoForm({ ...eventoForm, lugar: e.target.value })}
                                                                        placeholder="Ej. Canchas techadas ESCOM / Gimnasio"
                                                                        style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px', color: '#333' }}>
                                                                    Detalles o Requisitos de Asistencia
                                                                </label>
                                                                <textarea
                                                                    rows="3"
                                                                    value={eventoForm.descripcion}
                                                                    onChange={(e) => setEventoForm({ ...eventoForm, descripcion: e.target.value })}
                                                                    placeholder="Ej. Acudir con uniforme deportivo, hidratación personal y calzado para duela..."
                                                                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                                                />
                                                            </div>

                                                            {/* Selector de Prioridad del Evento */}
                                                            <div>
                                                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px', color: '#333' }}>
                                                                    Prioridad del Evento y Notificación a Miembros:
                                                                </label>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEventoForm({ ...eventoForm, prioridad: 'alta' })}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '8px',
                                                                            padding: '10px 14px',
                                                                            borderRadius: '8px',
                                                                            border: (eventoForm.prioridad || 'alta') === 'alta' ? '2px solid #dc3545' : '1px solid #ced4da',
                                                                            background: (eventoForm.prioridad || 'alta') === 'alta' ? '#fff5f5' : '#fff',
                                                                            color: (eventoForm.prioridad || 'alta') === 'alta' ? '#dc3545' : '#555',
                                                                            fontWeight: (eventoForm.prioridad || 'alta') === 'alta' ? '700' : '500',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.88rem',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                    >
                                                                        <span>🔴</span>
                                                                        <span>Alta Prioridad ⭐</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEventoForm({ ...eventoForm, prioridad: 'normal' })}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '8px',
                                                                            padding: '10px 14px',
                                                                            borderRadius: '8px',
                                                                            border: eventoForm.prioridad === 'normal' ? '2px solid #003366' : '1px solid #ced4da',
                                                                            background: eventoForm.prioridad === 'normal' ? '#f0f5fa' : '#fff',
                                                                            color: eventoForm.prioridad === 'normal' ? '#003366' : '#555',
                                                                            fontWeight: eventoForm.prioridad === 'normal' ? '700' : '500',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.88rem',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                    >
                                                                        <span>🔵</span>
                                                                        <span>Normal</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEventoForm({ ...eventoForm, prioridad: 'baja' })}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '8px',
                                                                            padding: '10px 14px',
                                                                            borderRadius: '8px',
                                                                            border: eventoForm.prioridad === 'baja' ? '2px solid #28a745' : '1px solid #ced4da',
                                                                            background: eventoForm.prioridad === 'baja' ? '#f4fbf6' : '#fff',
                                                                            color: eventoForm.prioridad === 'baja' ? '#28a745' : '#555',
                                                                            fontWeight: eventoForm.prioridad === 'baja' ? '700' : '500',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.88rem',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                    >
                                                                        <span>🟢</span>
                                                                        <span>Baja Prioridad</span>
                                                                    </button>
                                                                </div>

                                                                {/* Notificación informativa */}
                                                                <div style={{
                                                                    marginTop: '10px',
                                                                    padding: '10px 14px',
                                                                    borderRadius: '8px',
                                                                    background: '#eef6ff',
                                                                    border: '1px solid #c9e0fa',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '10px',
                                                                    fontSize: '0.84rem',
                                                                    color: '#003366'
                                                                }}>
                                                                    <span style={{ fontSize: '1.2rem' }}>📢</span>
                                                                    <span>
                                                                        Al agendar este evento, se emitirá automáticamente un aviso a todos los miembros inscritos con <strong>{(eventoForm.prioridad || 'alta').toUpperCase()} PRIORIDAD</strong> en sus tableros.
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                            <button
                                                                type="submit"
                                                                style={{
                                                                    padding: '12px 26px',
                                                                    background: '#28a745',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.95rem',
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 2px 6px rgba(40, 167, 69, 0.25)'
                                                                }}
                                                            >
                                                                📅 Guardar y Agendar Evento
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}

                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* OVERLAY DEL SIDEBAR CUANDO ESTÁ ABIERTO */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            {/* MODAL DE FICHA MÉDICA DE EMERGENCIA (WEB 2 COLUMNAS) */}
            {modalEmergenciaAbierto && (
                <div className="club-details-overlay" onClick={() => setModalEmergenciaAbierto(false)}>
                    <div
                        className="club-details-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '850px', width: '92%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
                    >
                        <button
                            type="button"
                            className="close-modal-btn"
                            onClick={() => setModalEmergenciaAbierto(false)}
                        >
                            ✕
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '1.8rem' }}>🩺</span>
                            <h2 style={{ margin: 0, color: '#003366', fontSize: '1.4rem' }}>
                                Ficha Médica y de Emergencia
                            </h2>
                        </div>
                        <p style={{ color: '#666', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
                            Uso estrictamente confidencial para encargados en situaciones de contingencia de salud.
                        </p>

                        {loadingEmergencia ? (
                            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando datos de emergencia...</p>
                        ) : errorEmergencia ? (
                            <div style={{ background: '#f8d7da', color: '#721c24', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                                {errorEmergencia}
                            </div>
                        ) : selectedEmergencia ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Encabezado del Alumno */}
                                <div style={{ background: '#f8f9fa', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #003366' }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1c1e21' }}>
                                        {selectedEmergencia.usuario?.nombres} {selectedEmergencia.usuario?.apellidos}
                                    </div>
                                    <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.88rem', color: '#555' }}>
                                        <span>📧 {selectedEmergencia.usuario?.correo}</span>
                                        {selectedEmergencia.usuario?.boleta && (
                                            <span>🎓 Boleta: <strong>{selectedEmergencia.usuario?.boleta}</strong></span>
                                        )}
                                    </div>
                                </div>

                                {/* Layout de 2 Columnas para Ficha Médica */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                                    
                                    {/* Columna Izquierda: Datos Clínicos */}
                                    <div style={{ background: '#fff', border: '1px solid #e1e5eb', borderRadius: '8px', padding: '18px' }}>
                                        <h4 style={{ margin: '0 0 14px 0', color: '#003366', fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                                            🩺 Información Clínica
                                        </h4>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                                            <div>
                                                <span style={{ color: '#666', display: 'block', fontSize: '0.8rem' }}>TIPO DE SANGRE</span>
                                                <span style={{
                                                    display: 'inline-block',
                                                    marginTop: '4px',
                                                    background: '#dc3545',
                                                    color: '#fff',
                                                    fontWeight: 'bold',
                                                    padding: '3px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    {selectedEmergencia.ficha_medica?.tipo_sangre || 'No especificado'}
                                                </span>
                                            </div>

                                            <div>
                                                <span style={{ color: '#666', display: 'block', fontSize: '0.8rem' }}>ALERGIAS</span>
                                                <strong style={{ color: selectedEmergencia.ficha_medica?.alergias ? '#dc3545' : '#333' }}>
                                                    {selectedEmergencia.ficha_medica?.alergias || 'Ninguna registrada'}
                                                </strong>
                                            </div>

                                            <div>
                                                <span style={{ color: '#666', display: 'block', fontSize: '0.8rem' }}>PADECIMIENTOS CRÓNICOS</span>
                                                <strong>{selectedEmergencia.ficha_medica?.padecimientos || 'Ninguno registrado'}</strong>
                                            </div>

                                            <div>
                                                <span style={{ color: '#666', display: 'block', fontSize: '0.8rem' }}>SEGURO MÉDICO / NSS</span>
                                                <strong>{selectedEmergencia.ficha_medica?.seguro_medico || 'IMSS Facultativo'} ({selectedEmergencia.ficha_medica?.numero_poliza || 'N/A'})</strong>
                                            </div>

                                            {selectedEmergencia.ficha_medica?.clinica && (
                                                <div>
                                                    <span style={{ color: '#666', display: 'block', fontSize: '0.8rem' }}>CLÍNICA / UMF</span>
                                                    <strong>{selectedEmergencia.ficha_medica.clinica}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Columna Derecha: Contactos de Emergencia */}
                                    <div style={{ background: '#fff', border: '1px solid #e1e5eb', borderRadius: '8px', padding: '18px' }}>
                                        <h4 style={{ margin: '0 0 14px 0', color: '#003366', fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                                            📞 Contactos de Emergencia
                                        </h4>

                                        {selectedEmergencia.contactos && selectedEmergencia.contactos.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {selectedEmergencia.contactos.map((c, idx) => (
                                                    <div key={idx} style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '0.95rem' }}>
                                                            {c.nombre}
                                                        </div>
                                                        <div style={{ fontSize: '0.82rem', color: '#666', marginBottom: '8px' }}>
                                                            Parentesco: {c.parentesco || 'Familiar'}
                                                        </div>

                                                        {c.telefono && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopiarTelefono(c.telefono)}
                                                                    style={{
                                                                        padding: '8px 14px',
                                                                        background: telefonoCopiado === c.telefono ? '#28a745' : '#003366',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 'bold',
                                                                        fontSize: '0.85rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}
                                                                >
                                                                    📋 {telefonoCopiado === c.telefono ? '✓ ¡Número Copiado!' : `Copiar: ${c.telefono}`}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                                El alumno no tiene contactos de emergencia registrados en su perfil.
                                            </p>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ) : null}

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setModalEmergenciaAbierto(false)}
                                style={{
                                    padding: '9px 18px',
                                    background: '#6c757d',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
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

export default ClubDetailsPage;