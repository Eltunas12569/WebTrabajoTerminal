import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './css/Dashboards.css';
import './css/GestionDashboard.css';
import AccionesAlumno from '../components/AccionesAlumno';
import CalendarioEventos from '../components/CalendarioEventos';
import Sidebar from '../components/Sidebar';

const getAvatarColor = (name) => {
    const colors = [
        '#800020', '#003366', '#1E8449', '#D4AC0D',
        '#7D3C98', '#A04000', '#2E4053', '#117864'
    ];
    const text = name || "U";
    const index = text.charCodeAt(0) % colors.length;
    return colors[index];
};

const GestionDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'avisos');

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location.state]);
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
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [memberFilterStatus, setMemberFilterStatus] = useState('todos');

    // Estados para invitar a otro alumno en el modal de firmas
    const [showInvitePanel, setShowInvitePanel] = useState(false);
    const [inviteSearchTerm, setInviteSearchTerm] = useState('');
    const [inviteResults, setInviteResults] = useState([]);
    const [searchingInvite, setSearchingInvite] = useState(false);
    const [selectedInviteStudent, setSelectedInviteStudent] = useState(null);
    const [sendingInvite, setSendingInvite] = useState(false);
    const [inviteFeedback, setInviteFeedback] = useState(null);
    const [inviteAsRepresentante, setInviteAsRepresentante] = useState(false);
    const [promotingStudentId, setPromotingStudentId] = useState(null);
    
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
                setUserClubs(response.data || []);
            } catch (error) {
                console.error("Error al obtener los clubes del usuario:", error);
                // Adaptación fallback: Si el endpoint específico falla en el servidor, consultar /clubes y filtrar
                try {
                    const fallbackRes = await api.get('/clubes');
                    const misClubes = (fallbackRes.data || []).filter(c =>
                        Number(c.profesor_encargado_id) === Number(user.id) ||
                        Number(c.alumno_encargado_id) === Number(user.id)
                    ).map(c => ({
                        ...c,
                        mi_rol_interno: Number(c.profesor_encargado_id) === Number(user.id) ? 'encargado_profesor' : 'encargado_alumno',
                        inscripcion_estatus: 'activo'
                    }));
                    if (misClubes.length > 0) {
                        setUserClubs(misClubes);
                    }
                } catch (fallbackErr) {
                    console.error("Fallback de clubes falló:", fallbackErr);
                }
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
            let misClubes = [];
            try {
                const resClubs = await api.get(`/clubes/user/${user.id}`);
                misClubes = resClubs.data || [];
            } catch (err) {
                try {
                    const fallbackRes = await api.get('/clubes');
                    misClubes = (fallbackRes.data || []).filter(c =>
                        Number(c.profesor_encargado_id) === Number(user.id) ||
                        Number(c.alumno_encargado_id) === Number(user.id)
                    );
                } catch (e) {
                    misClubes = [];
                }
            }

            let invitaciones = [];
            try {
                const resInv = await api.get('/clubes/invitaciones/pendientes');
                invitaciones = resInv.data || [];
            } catch (e) {
                console.warn("No se pudieron cargar invitaciones pendientes para eventos:", e);
            }

            const clubesMap = new Map();
            misClubes.forEach(c => {
                clubesMap.set(c.id, { ...c, id: c.id, nombre: c.nombre, esInvitacion: false });
            });
            invitaciones.forEach(inv => {
                if (!clubesMap.has(inv.club_id)) {
                    clubesMap.set(inv.club_id, { id: inv.club_id, nombre: inv.nombre, esInvitacion: true });
                }
            });

            const clubesLista = Array.from(clubesMap.values());

            const eventosPromises = clubesLista.map(async (c) => {
                const esEncargado = (
                    (['encargado_profesor', 'encargado_alumno'].includes(c.mi_rol_interno) && c.inscripcion_estatus === 'activo') ||
                    c.profesor_encargado_id === user?.id ||
                    c.alumno_encargado_id === user?.id
                );
                try {
                    const resEv = await api.get(`/clubes/${c.id}/eventos`);
                    return (resEv.data || []).map(ev => ({
                        ...ev,
                        club_id: c.id,
                        club_nombre: c.nombre,
                        es_invitacion: c.esInvitacion,
                        es_encargado: esEncargado
                    }));
                } catch (err) {
                    console.warn(`Error al cargar eventos del club ${c.id}:`, err);
                    return [];
                }
            });

            const [resultadosClubes, resGlobales] = await Promise.all([
                Promise.all(eventosPromises),
                api.get('/clubes/eventos/globales').catch(() => ({ data: [] }))
            ]);

            const eventosPorId = new Map();
            resultadosClubes.flat().forEach(ev => {
                eventosPorId.set(ev.id, ev);
            });

            (resGlobales.data || []).forEach(evGlobal => {
                if (!eventosPorId.has(evGlobal.id)) {
                    eventosPorId.set(evGlobal.id, {
                        ...evGlobal,
                        club_nombre: evGlobal.club_nombre || 'Evento Global',
                        es_invitacion: false,
                        es_encargado: false,
                        es_global: 1
                    });
                }
            });

            setEventosCalendario(Array.from(eventosPorId.values()));
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

    const fetchClubMembers = async (clubId) => {
        const response = await api.get(`/clubes/${clubId}/miembros`);
        const rawList = Array.isArray(response.data) ? response.data : [];
        return rawList.map(m => {
            const parseVal = (v) => {
                if (!v) return '';
                if (typeof v === 'string') return v;
                if (v.type === 'Buffer' && Array.isArray(v.data)) {
                    return String.fromCharCode.apply(null, v.data);
                }
                return String(v);
            };
            const nombres = parseVal(m.nombres);
            const apellidos = parseVal(m.apellidos).trim();
            const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Sin nombre registrado';
            const boleta = parseVal(m.boleta) || '—';
            const estatusNormalizado = String(m.estatus || '').trim().toLowerCase();
            return {
                id: m.id,
                nombres,
                apellidos,
                nombre_completo: nombreCompleto,
                boleta,
                correo: m.correo ? String(m.correo) : '',
                rol_en_club: m.rol_en_club || 'miembro',
                estatus: estatusNormalizado === 'activo' 
                    ? 'activo' 
                    : (estatusNormalizado === 'rechazado' ? 'rechazado' : 'pendiente')
            };
        });
    };

    const openMembersModal = async (club) => {
        setShowMembersModal(true);
        setLoadingMembers(true);
        setSelectedClubName(club.nombre);
        setSelectedClub(club);
        setMemberSearchTerm('');
        setMemberFilterStatus('todos');
        setShowInvitePanel(false);
        setInviteSearchTerm('');
        setInviteResults([]);
        setSelectedInviteStudent(null);
        setInviteFeedback(null);
        setInviteAsRepresentante(false);
        setPromotingStudentId(null);
        try {
            const members = await fetchClubMembers(club.id);
            setClubMembers(members);
        } catch (error) {
            console.error("Error al cargar firmas:", error);
            alert("No se pudo cargar la lista de firmas de este club.");
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleCloseMembersModal = () => {
        setShowMembersModal(false);
        setSelectedClub(null);
        setClubMembers([]);
        setMemberSearchTerm('');
        setMemberFilterStatus('todos');
        setShowInvitePanel(false);
        setInviteSearchTerm('');
        setInviteResults([]);
        setSelectedInviteStudent(null);
        setInviteFeedback(null);
        setInviteAsRepresentante(false);
        setPromotingStudentId(null);
        if (location.state?.openSignaturesClubId) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    };

    // Abrir panel enfocado en asignar al Alumno Representante
    const handleAbrirAsignarRepresentante = () => {
        setInviteAsRepresentante(true);
        setShowInvitePanel(true);
        setInviteFeedback(null);
        setSelectedInviteStudent(null);
        setInviteSearchTerm('');
        setInviteResults([]);
    };

    // Promover a un miembro existente de la lista para que sea el nuevo Alumno Representante
    const handlePromoverMiembro = async (miembro) => {
        if (!selectedClub || !miembro) return;
        const confirmMsg = miembro.estatus === 'activo'
            ? `¿Deseas nombrar a "${miembro.nombre_completo}" como el nuevo Alumno Representante del club?\n\nComo este alumno ya confirmó y firmó, el club contará de inmediato con su Alumno Representante validado.`
            : `¿Deseas nombrar a "${miembro.nombre_completo}" como el nuevo Alumno Representante del club?\n\nSe le actualizará su estatus para que firme como representante.`;

        if (!window.confirm(confirmMsg)) return;

        setPromotingStudentId(miembro.id);
        setInviteFeedback(null);
        try {
            const res = await api.put(`/clubes/${selectedClub.id}/asignar-representante`, {
                nuevo_usuario_id: miembro.id
            });
            alert(res.data.message || "¡Alumno representante asignado correctamente!");
            const updatedMembers = await fetchClubMembers(selectedClub.id);
            setClubMembers(updatedMembers);
            fetchUserClubs();
        } catch (err) {
            console.error("Error al promover alumno:", err);
            alert(err.response?.data?.message || "No se pudo asignar al alumno como representante.");
        } finally {
            setPromotingStudentId(null);
        }
    };

    // Búsqueda de estudiantes para invitar a otro alumno al club
    const handleSearchInviteStudents = async (query) => {
        setInviteSearchTerm(query);
        setSelectedInviteStudent(null);
        setInviteFeedback(null);
        const term = query.trim();
        if (term.length < 2) {
            setInviteResults([]);
            return;
        }
        setSearchingInvite(true);
        try {
            const res = await api.get('/users', { params: { busqueda: term } });
            const list = Array.isArray(res.data) ? res.data : [];
            // Alumnos con invitación vigente (activos o pendientes)
            const activeOrPendingIds = new Set(
                clubMembers
                    .filter(m => m.estatus === 'activo' || m.estatus === 'pendiente')
                    .map(m => Number(m.id))
            );
            // Filtrar solo alumnos (rol 2 y 4 en frontend o 2/3 en backend) y excluir los ya vigentes en este club
            const filtered = list.filter(u => {
                const isStudent = [2, 3, 4].includes(Number(u.role_id));
                const notAlreadyVigente = !activeOrPendingIds.has(Number(u.id));
                return isStudent && notAlreadyVigente;
            });
            setInviteResults(filtered);
        } catch (err) {
            console.error("Error al buscar estudiantes para invitar:", err);
            setInviteResults([]);
        } finally {
            setSearchingInvite(false);
        }
    };

    // Enviar invitación al estudiante seleccionado (como miembro o como representante)
    const handleSendInvite = async () => {
        if (!selectedClub || !selectedInviteStudent) return;
        setSendingInvite(true);
        setInviteFeedback(null);
        try {
            if (inviteAsRepresentante && representanteRechazo) {
                const res = await api.put(`/clubes/${selectedClub.id}/asignar-representante`, {
                    nuevo_usuario_id: selectedInviteStudent.id
                });
                setInviteFeedback({
                    type: 'success',
                    text: res.data.message || `Alumno representante asignado exitosamente a ${selectedInviteStudent.nombres}.`
                });
            } else {
                const res = await api.post(`/clubes/${selectedClub.id}/invitar`, {
                    usuario_id: selectedInviteStudent.id
                });
                setInviteFeedback({
                    type: 'success',
                    text: res.data.message || `Invitación enviada exitosamente a ${selectedInviteStudent.nombres}.`
                });
            }
            setSelectedInviteStudent(null);
            setInviteSearchTerm('');
            setInviteResults([]);
            // Recargar lista actualizada de miembros/firmas
            const updatedMembers = await fetchClubMembers(selectedClub.id);
            setClubMembers(updatedMembers);
            fetchUserClubs();
        } catch (err) {
            console.error("Error al procesar invitación / asignación:", err);
            setInviteFeedback({
                type: 'error',
                text: err.response?.data?.message || "Ocurrió un error al procesar la solicitud."
            });
        } finally {
            setSendingInvite(false);
        }
    };

    // Efecto para abrir automáticamente el modal de firmas si se redirige desde la creación de un club
    useEffect(() => {
        if (location.state?.openSignaturesClubId) {
            const targetClubId = location.state.openSignaturesClubId;
            const clubFound = userClubs.find(c => Number(c.id) === Number(targetClubId));
            if (clubFound) {
                openMembersModal(clubFound);
                navigate(location.pathname, { replace: true, state: {} });
            } else if (!loadingClubs) {
                api.get('/clubes').then(res => {
                    const found = (res.data || []).find(c => Number(c.id) === Number(targetClubId));
                    if (found) {
                        openMembersModal(found);
                    }
                }).catch(err => console.error("Error al buscar club recién creado:", err))
                  .finally(() => {
                    navigate(location.pathname, { replace: true, state: {} });
                  });
            }
        }
    }, [location.state?.openSignaturesClubId, userClubs, loadingClubs]);

    const MIN_FIRMAS = 20;
    const firmadosCount = clubMembers.filter(m => m.estatus === 'activo').length;
    const pendientesCount = clubMembers.filter(m => m.estatus === 'pendiente').length;
    const rechazadosCount = clubMembers.filter(m => m.estatus === 'rechazado').length;
    const porcentajeProgreso = Math.min(100, Math.round((firmadosCount / MIN_FIRMAS) * 100));

    // Detección del estado del Alumno Representante
    const representanteActual = clubMembers.find(m => m.rol_en_club === 'encargado_alumno');
    const representanteActivo = Boolean(representanteActual && representanteActual.estatus === 'activo');
    const representanteRechazo = Boolean(representanteActual && representanteActual.estatus === 'rechazado');
    const representantePendiente = Boolean(representanteActual && representanteActual.estatus === 'pendiente');

    // La meta para enviar a revisión requiere 20 firmas y obligatoriamente la firma del Alumno Representante
    const metaCumplida = firmadosCount >= MIN_FIRMAS && representanteActivo;

    // Permiso para reasignar representante (Profesor Titular o Administrador)
    const esProfesorTitularClub = user && selectedClub && (
        Number(user.id) === Number(selectedClub.profesor_encargado_id) ||
        selectedClub.mi_rol_interno === 'encargado_profesor'
    );
    const puedeGestionarRepresentante = Boolean(
        user && (Number(user.role_id || user.rol) === 1 || esProfesorTitularClub)
    );

    const filteredClubMembers = clubMembers.filter(m => {
        if (memberFilterStatus === 'firmados' && m.estatus !== 'activo') return false;
        if (memberFilterStatus === 'pendientes' && m.estatus !== 'pendiente') return false;
        if (memberFilterStatus === 'rechazados' && m.estatus !== 'rechazado') return false;
        if (memberSearchTerm.trim()) {
            const term = memberSearchTerm.toLowerCase();
            const fullName = (m.nombre_completo || '').toLowerCase();
            const boleta = String(m.boleta || '').toLowerCase();
            const email = (m.correo || '').toLowerCase();
            return fullName.includes(term) || boleta.includes(term) || email.includes(term);
        }
        return true;
    });

    const handleEnviarRevision = async () => {
        if (!selectedClub) return;
        if (!representanteActivo) {
            alert("No se puede enviar a revisión: El club requiere obligatoriamente que el Alumno Representante haya aceptado y firmado su participación.");
            return;
        }
        if (firmadosCount < MIN_FIRMAS) {
            alert(`Aún faltan confirmaciones. Se requieren al menos ${MIN_FIRMAS} firmas de estudiantes y actualmente hay ${firmadosCount}.`);
            return;
        }
        setSendingReview(true);
        try {
            const response = await api.put(`/clubes/${selectedClub.id}/enviar-revision`, {});
            alert(response.data.message || "¡Club enviado a revisión institucional exitosamente!");
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
                    <span className="nav-title">    Sistema de Clubs</span>
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

                                {(esAlumno || esProfesor) && (
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

                                                            {club.estatus === 'esperando_firmas' && (club.mi_rol_interno === 'encargado_profesor' || club.mi_rol_interno === 'encargado_alumno' || user?.role_id === 1) && (
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
                                                    : 'Puedes unirte a un club activo desde la pestaña "Explorar / Unirse a un Club" o registrar un nuevo club desde el menú lateral.'}
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
                <div 
                    className="club-details-overlay" 
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCloseMembersModal();
                        }
                    }}
                >
                    <div
                        className="club-details-modal signatures-modal-dialog"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            type="button" 
                            className="sig-modal-close-btn" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCloseMembersModal();
                            }}
                            title="Cerrar ventana"
                            aria-label="Cerrar ventana"
                        >
                            ✕
                        </button>
                        
                        <div className="sig-modal-header">
                            <div className="sig-modal-header-top">
                                <span className="sig-modal-badge">
                                    {selectedClub?.estatus === 'esperando_firmas' ? '⏳ Esperando Firmas' : (selectedClub?.estatus || 'Expediente')}
                                </span>
                                {selectedClub?.codigo_union && (
                                    <span className="sig-modal-code">Código: {selectedClub.codigo_union}</span>
                                )}
                            </div>
                            <h2 className="sig-modal-title">{selectedClubName}</h2>
                            <p className="sig-modal-subtitle">
                                Control de Firmas de Conformidad e Integrantes Registrados
                            </p>
                        </div>
                        
                        {loadingMembers ? (
                            <div className="sig-loading-state">
                                <div className="sig-spinner"></div>
                                <p>Cargando lista de firmas de los alumnos...</p>
                            </div>
                        ) : (
                            <div className="sig-modal-body">
                                {/* Banner explicativo de estado */}
                                {selectedClub?.estatus === 'esperando_firmas' && (
                                    <>
                                        {representanteRechazo && (
                                            <div className="sig-status-notice error-alert">
                                                <div className="sig-notice-icon">⚠️</div>
                                                <div className="sig-notice-content">
                                                    <strong>¡Atención! El Alumno Representante declinó la invitación</strong>
                                                    <p>
                                                        Para que el club pueda constituirse y enviarse a revisión institucional, es indispensable contar con un Alumno Representante activo. 
                                                        {puedeGestionarRepresentante 
                                                            ? " Puedes promover a cualquiera de los integrantes que ya firmaron en la lista o asignar a un nuevo estudiante como representante." 
                                                            : " El Profesor Titular o la administración deben asignar a un nuevo representante."}
                                                    </p>
                                                    {puedeGestionarRepresentante && (
                                                        <button
                                                            type="button"
                                                            className="sig-btn-notice-action"
                                                            onClick={handleAbrirAsignarRepresentante}
                                                        >
                                                            ⭐ Asignar Nuevo Representante
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!representanteRechazo && (
                                            <div className={`sig-status-notice ${metaCumplida ? 'ready' : (firmadosCount >= MIN_FIRMAS && !representanteActivo ? 'warning-rep' : 'waiting')}`}>
                                                <div className="sig-notice-icon">{metaCumplida ? '🎉' : (firmadosCount >= MIN_FIRMAS && !representanteActivo ? '⏳' : 'ℹ️')}</div>
                                                <div className="sig-notice-content">
                                                    <strong>
                                                        {metaCumplida 
                                                            ? '¡Requisitos de firmas alcanzados!' 
                                                            : firmadosCount >= MIN_FIRMAS && !representanteActivo
                                                                ? 'Meta de firmas alcanzada (Esperando firma del Alumno Representante)'
                                                                : 'Expediente en recopilación de firmas'}
                                                    </strong>
                                                    <p>
                                                        {metaCumplida
                                                            ? `Se han recolectado ${firmadosCount} firmas de alumnos (mínimo requerido: ${MIN_FIRMAS}) y el Alumno Representante ha firmado su conformidad. Ya puedes enviar el club a revisión del comité institucional.`
                                                            : firmadosCount >= MIN_FIRMAS && !representanteActivo
                                                                ? `Se cuenta con las ${firmadosCount} firmas requeridas, pero el Alumno Representante aún no confirma su participación. Una vez que firme, se habilitará el envío institucional.`
                                                                : `Se requiere que al menos ${MIN_FIRMAS} estudiantes confirmen y firmen su participación para validar el club, incluyendo al Alumno Representante. Faltan ${Math.max(0, MIN_FIRMAS - firmadosCount)} firmas.`}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Resumen en 4 tarjetas métricas */}
                                <div className="signatures-summary-grid">
                                    <div className="sig-metric-box">
                                        <span className="sig-metric-val">{clubMembers.length}</span>
                                        <span className="sig-metric-label">Total en Lista</span>
                                    </div>
                                    <div className="sig-metric-box success">
                                        <span className="sig-metric-val" style={{ color: '#16a34a' }}>
                                            {firmadosCount} / {MIN_FIRMAS}
                                        </span>
                                        <span className="sig-metric-label">Firmados ✓</span>
                                    </div>
                                    <div className="sig-metric-box warning">
                                        <span className="sig-metric-val" style={{ color: '#d97706' }}>
                                            {pendientesCount}
                                        </span>
                                        <span className="sig-metric-label">Pendientes ⏳</span>
                                    </div>
                                    <div className="sig-metric-box danger">
                                        <span className="sig-metric-val" style={{ color: '#dc2626' }}>
                                            {rechazadosCount}
                                        </span>
                                        <span className="sig-metric-label">Rechazados ❌</span>
                                    </div>
                                </div>

                                {/* Barra de progreso de firmas */}
                                <div className="sig-progress-container">
                                    <div className="sig-progress-header">
                                        <span className="sig-progress-title">Avance hacia la meta de firmas requeridas</span>
                                        <span className={`sig-progress-percent ${metaCumplida ? 'complete' : ''}`}>
                                            {porcentajeProgreso}% ({firmadosCount} de {MIN_FIRMAS})
                                        </span>
                                    </div>
                                    <div className="sig-progress-track">
                                        <div 
                                            className={`sig-progress-fill ${metaCumplida ? 'complete' : ''}`}
                                            style={{ width: `${porcentajeProgreso}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Barra de búsqueda, filtros rápidos y botón de invitar */}
                                <div className="sig-toolbar">
                                    <div className="sig-search-box">
                                        <span className="sig-search-icon">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar alumno por nombre o boleta..."
                                            value={memberSearchTerm}
                                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                                        />
                                        {memberSearchTerm && (
                                            <button 
                                                type="button" 
                                                className="sig-search-clear" 
                                                onClick={() => setMemberSearchTerm('')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <div className="sig-filters">
                                        <button
                                            type="button"
                                            className={`sig-filter-btn ${memberFilterStatus === 'todos' ? 'active' : ''}`}
                                            onClick={() => setMemberFilterStatus('todos')}
                                        >
                                            Todos ({clubMembers.length})
                                        </button>
                                        <button
                                            type="button"
                                            className={`sig-filter-btn ${memberFilterStatus === 'firmados' ? 'active' : ''}`}
                                            onClick={() => setMemberFilterStatus('firmados')}
                                        >
                                            Firmados ({firmadosCount})
                                        </button>
                                        <button
                                            type="button"
                                            className={`sig-filter-btn ${memberFilterStatus === 'pendientes' ? 'active' : ''}`}
                                            onClick={() => setMemberFilterStatus('pendientes')}
                                        >
                                            Pendientes ({pendientesCount})
                                        </button>
                                        <button
                                            type="button"
                                            className={`sig-filter-btn rejected ${memberFilterStatus === 'rechazados' ? 'active' : ''}`}
                                            onClick={() => setMemberFilterStatus('rechazados')}
                                        >
                                            Rechazados ({rechazadosCount})
                                        </button>
                                    </div>
                                    <div className="sig-toolbar-actions">
                                        {puedeGestionarRepresentante && selectedClub?.estatus === 'esperando_firmas' && representanteRechazo && (
                                            <button
                                                type="button"
                                                className="sig-btn-asignar-rep-toolbar"
                                                onClick={handleAbrirAsignarRepresentante}
                                                title="Asignar o reemplazar al Alumno Representante que declinó la invitación"
                                            >
                                                ⭐ Asignar Representante
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={`sig-invite-toggle-btn ${showInvitePanel ? 'active' : ''}`}
                                            onClick={() => {
                                                setShowInvitePanel(prev => !prev);
                                                setInviteFeedback(null);
                                                setInviteAsRepresentante(false);
                                            }}
                                        >
                                            {showInvitePanel ? '✕ Cerrar Panel' : '➕ Invitar a Otro Alumno'}
                                        </button>
                                    </div>
                                </div>

                                {/* Panel desplegable para invitar o asignar alumno */}
                                {showInvitePanel && (
                                    <div className={`sig-invite-panel ${inviteAsRepresentante ? 'rep-mode' : ''}`}>
                                        <div className="sig-invite-panel-header">
                                            <div className="sig-invite-panel-title">
                                                <span className="sig-invite-panel-icon">{inviteAsRepresentante ? '⭐' : '✉️'}</span>
                                                <div>
                                                    <strong>
                                                        {inviteAsRepresentante 
                                                            ? 'Asignar Nuevo Alumno Representante' 
                                                            : 'Invitar a un nuevo estudiante al club'}
                                                    </strong>
                                                    <p>
                                                        {inviteAsRepresentante 
                                                            ? 'Busca a un alumno por nombre o boleta para nombrarlo como Alumno Representante y enviarle su invitación/confirmación:' 
                                                            : 'Busca a un alumno por nombre o boleta para enviarle una invitación y recabar su firma:'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="sig-invite-close-btn"
                                                onClick={() => {
                                                    setShowInvitePanel(false);
                                                    setInviteFeedback(null);
                                                    setInviteAsRepresentante(false);
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>

                                        {/* Selector de rol de la invitación solo si el representante declinó */}
                                        {puedeGestionarRepresentante && representanteRechazo && (
                                            <div className="sig-invite-role-selector">
                                                <span className="sig-invite-role-label">Rol a asignar:</span>
                                                <div className="sig-invite-role-buttons">
                                                    <button
                                                        type="button"
                                                        className={`sig-invite-role-chip ${!inviteAsRepresentante ? 'active' : ''}`}
                                                        onClick={() => setInviteAsRepresentante(false)}
                                                    >
                                                        👤 Integrante común
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`sig-invite-role-chip rep ${inviteAsRepresentante ? 'active' : ''}`}
                                                        onClick={() => setInviteAsRepresentante(true)}
                                                    >
                                                        ⭐ Alumno Representante
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {inviteFeedback && (
                                            <div className={`sig-invite-alert ${inviteFeedback.type}`}>
                                                <span>{inviteFeedback.type === 'success' ? '✓' : '⚠️'}</span>
                                                <span>{inviteFeedback.text}</span>
                                            </div>
                                        )}

                                        <div className="sig-invite-form">
                                            <div className="sig-invite-search-container">
                                                <div className="sig-invite-input-wrap">
                                                    <span className="sig-invite-search-icon">🔍</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Escribe al menos 2 letras o boleta del alumno..."
                                                        value={inviteSearchTerm}
                                                        onChange={(e) => handleSearchInviteStudents(e.target.value)}
                                                        className="sig-invite-input"
                                                    />
                                                    {searchingInvite && <span className="sig-invite-spinner-inline" />}
                                                </div>

                                                {/* Dropdown de sugerencias de alumnos */}
                                                {inviteResults.length > 0 && !selectedInviteStudent && (
                                                    <div className="sig-invite-dropdown">
                                                        {inviteResults.map((est) => (
                                                            <div
                                                                key={est.id}
                                                                className="sig-invite-dropdown-item"
                                                                onClick={() => {
                                                                    setSelectedInviteStudent(est);
                                                                    setInviteResults([]);
                                                                    setInviteSearchTerm(`${est.nombres} ${est.apellidos || ''}`.trim());
                                                                }}
                                                            >
                                                                <div className="sig-invite-student-info">
                                                                    <span className="sig-invite-student-name">
                                                                        {est.nombres} {est.apellidos}
                                                                    </span>
                                                                    <span className="sig-invite-student-boleta">
                                                                        Boleta: {est.boleta || '—'}
                                                                    </span>
                                                                </div>
                                                                <span className="sig-invite-select-badge">
                                                                    {inviteAsRepresentante ? 'Elegir Representante ➜' : 'Seleccionar ➜'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {inviteSearchTerm.trim().length >= 2 && !searchingInvite && inviteResults.length === 0 && !selectedInviteStudent && (
                                                    <div className="sig-invite-dropdown empty">
                                                        No se encontraron estudiantes disponibles con ese criterio.
                                                    </div>
                                                )}
                                            </div>

                                            {selectedInviteStudent && (
                                                <div className="sig-invite-selected-card">
                                                    <div className="sig-invite-selected-details">
                                                        <span className="sig-invite-selected-label">
                                                            {inviteAsRepresentante 
                                                                ? 'Estudiante para Alumno Representante:' 
                                                                : 'Estudiante seleccionado:'}
                                                        </span>
                                                        <strong className="sig-invite-selected-name">
                                                            {inviteAsRepresentante ? '⭐' : '🎓'} {selectedInviteStudent.nombres} {selectedInviteStudent.apellidos}
                                                        </strong>
                                                        <span className="sig-invite-selected-boleta">
                                                            Boleta: {selectedInviteStudent.boleta || 'Sin boleta'}
                                                        </span>
                                                    </div>
                                                    <div className="sig-invite-selected-actions">
                                                        <button
                                                            type="button"
                                                            className="sig-invite-btn-cancel-select"
                                                            onClick={() => {
                                                                setSelectedInviteStudent(null);
                                                                setInviteSearchTerm('');
                                                            }}
                                                        >
                                                            Cambiar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`sig-invite-btn-send ${inviteAsRepresentante ? 'rep-btn' : ''}`}
                                                            onClick={handleSendInvite}
                                                            disabled={sendingInvite}
                                                        >
                                                            {sendingInvite 
                                                                ? 'Procesando...' 
                                                                : inviteAsRepresentante
                                                                    ? '⭐ Asignar como Representante'
                                                                    : '📨 Enviar Invitación'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tabla de Miembros y Firmas */}
                                <div className="sig-table-wrapper">
                                    <table className="sig-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>#</th>
                                                <th>Estudiante</th>
                                                <th>Boleta</th>
                                                <th>Rol en Club</th>
                                                <th style={{ textAlign: 'center' }}>Estado de Firma</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredClubMembers.map((miembro, idx) => (
                                                <tr key={miembro.id}>
                                                    <td className="sig-td-idx">{idx + 1}</td>
                                                    <td className="sig-td-student">
                                                        <div className="sig-student-cell">
                                                            <div 
                                                                className="sig-avatar"
                                                                style={{ backgroundColor: getAvatarColor(miembro.nombres) }}
                                                            >
                                                                {(miembro.nombres || 'A').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="sig-student-names">
                                                                <span className="sig-name">{miembro.nombre_completo}</span>
                                                                {miembro.correo && (
                                                                    <span className="sig-email">{miembro.correo}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="sig-td-boleta">
                                                        <span className="sig-boleta-chip">{miembro.boleta}</span>
                                                    </td>
                                                    <td className="sig-td-rol">
                                                        <div className="sig-rol-cell-wrapper">
                                                            <span className={`role-badge-chip ${miembro.rol_en_club === 'encargado_alumno' ? 'lider' : 'miembro'}`}>
                                                                {miembro.rol_en_club === 'encargado_alumno' ? '⭐ Alumno Representante' : '👤 Integrante'}
                                                            </span>
                                                            {/* Botón para promover a representante solo si el representante principal rechazó */}
                                                            {miembro.rol_en_club !== 'encargado_alumno' && representanteRechazo && puedeGestionarRepresentante && selectedClub?.estatus === 'esperando_firmas' && (
                                                                <button
                                                                    type="button"
                                                                    className="sig-btn-promover-rep"
                                                                    title={miembro.estatus === 'activo'
                                                                        ? "Nombrar a este alumno como el nuevo Alumno Representante (ya cuenta con firma confirmada)"
                                                                        : "Nombrar a este alumno como el nuevo Alumno Representante"}
                                                                    onClick={() => handlePromoverMiembro(miembro)}
                                                                    disabled={promotingStudentId === miembro.id}
                                                                >
                                                                    {promotingStudentId === miembro.id ? 'Asignando...' : '⭐ Nombrar Representante'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="sig-td-status" style={{ textAlign: 'center' }}>
                                                        {miembro.estatus === 'activo' ? (
                                                            <span className="sig-status-badge signed">
                                                                ✓ Firmado
                                                            </span>
                                                        ) : miembro.estatus === 'rechazado' ? (
                                                            <div className="sig-status-rejected-wrap">
                                                                <span className="sig-status-badge rejected" title="El estudiante no aceptó la invitación">
                                                                    ❌ Rechazó invitación
                                                                </span>
                                                                {miembro.rol_en_club === 'encargado_alumno' && puedeGestionarRepresentante && selectedClub?.estatus === 'esperando_firmas' && (
                                                                    <button
                                                                        type="button"
                                                                        className="sig-btn-reemplazar-rep-mini"
                                                                        title="Buscar a otro estudiante para asignarlo como Alumno Representante"
                                                                        onClick={handleAbrirAsignarRepresentante}
                                                                    >
                                                                        ⭐ Reemplazar Representante
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="sig-status-badge pending">
                                                                ⏳ Pendiente de firma
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredClubMembers.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="sig-empty-row">
                                                        No se encontraron integrantes con el criterio seleccionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pie del Modal con Acciones */}
                                <div className="sig-modal-footer">
                                    <button
                                        type="button"
                                        className="btn-cancelar-club"
                                        onClick={handleCloseMembersModal}
                                    >
                                        Cerrar
                                    </button>

                                    {selectedClub?.estatus === 'esperando_firmas' && (
                                        <button 
                                            type="button"
                                            onClick={handleEnviarRevision}
                                            disabled={sendingReview || !metaCumplida}
                                            className={`btn-enviar-revision ${metaCumplida ? 'ready' : 'locked'}`}
                                            title={
                                                !representanteActivo
                                                    ? 'Se requiere obligatoriamente que el Alumno Representante acepte y firme su participación'
                                                    : firmadosCount < MIN_FIRMAS
                                                        ? `Faltan ${MIN_FIRMAS - firmadosCount} firmas de alumnos para habilitar el envío`
                                                        : 'Enviar club para validación de la administración'
                                            }
                                        >
                                            {sendingReview 
                                                ? 'Enviando...' 
                                                : metaCumplida
                                                    ? '🚀 Enviar Club a Revisión Institucional' 
                                                    : !representanteActivo
                                                        ? '🔒 Enviar a Revisión (Falta firma del Representante)'
                                                        : `🔒 Enviar a Revisión (Faltan ${MIN_FIRMAS - firmadosCount} firmas)`}
                                        </button>
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