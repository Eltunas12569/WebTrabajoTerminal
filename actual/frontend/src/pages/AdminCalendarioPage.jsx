import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CalendarioEventos from '../components/CalendarioEventos';
import Sidebar from '../components/Sidebar';

/**
 * Página de Gestión y Supervisión de Eventos para el Administrador.
 * Permite alternar entre:
 * 1. Vista de Calendario Mensual con lista lateral de eventos.
 * 2. Catálogo completo de TODOS los eventos registrados en el sistema,
 *    con búsqueda por texto, filtro por club, filtro temporal (próximos/pasados) y ordenamiento.
 */
const AdminCalendarioPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estado de la vista activa: 'calendario' o 'todos'
    const [vistaActiva, setVistaActiva] = useState('calendario');

    // Filtros para la vista de todos los eventos
    const [busqueda, setBusqueda] = useState('');
    const [filtroClub, setFiltroClub] = useState('todos');
    const [filtroTiempo, setFiltroTiempo] = useState('todos'); // 'todos', 'proximos', 'pasados', 'este_mes'
    const [orden, setOrden] = useState('proximos_primero'); // 'proximos_primero', 'recientes', 'antiguos', 'asistentes'
    const [eventoDetalle, setEventoDetalle] = useState(null);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const paletaColores = [
        '#003366', '#1b7a43', '#800020', '#b7791f',
        '#6b21a8', '#0f766e', '#9a3412', '#1d4ed8',
        '#475569', '#be185d'
    ];

    const getClubColor = (clubId) => {
        const idNum = Number(clubId) || 0;
        return paletaColores[idNum % paletaColores.length];
    };

    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        const text = name || "U";
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError('');
        try {
            // 1. Obtener todos los clubes registrados en la base de datos
            const resClubes = await api.get('/clubes');
            const listaClubes = resClubes.data || [];
            setClubes(listaClubes);

            // 2. Obtener los eventos de todos los clubes en paralelo
            const eventosPromises = listaClubes.map(async (club) => {
                try {
                    const resEv = await api.get(`/clubes/${club.id}/eventos`);
                    return (resEv.data || []).map(ev => ({
                        ...ev,
                        club_id: club.id,
                        club_nombre: club.nombre
                    }));
                } catch (err) {
                    console.warn(`No se pudieron cargar eventos para club ${club.nombre}:`, err);
                    return [];
                }
            });

            const resultados = await Promise.all(eventosPromises);
            setEventos(resultados.flat());
        } catch (err) {
            console.error("Error al cargar eventos para el administrador:", err);
            setError('Ocurrió un error al cargar los eventos institucionales.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const parseFecha = (fechaStr) => {
        if (!fechaStr) return null;
        try {
            const normalizada = String(fechaStr).replace(' ', 'T');
            const d = new Date(normalizada);
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    };

    // Filtrado de eventos para la vista de catálogo
    const hoy = new Date();

    const eventosFiltradosCatalogo = eventos.filter(ev => {
        // Filtro por texto
        const termino = busqueda.trim().toLowerCase();
        if (termino) {
            const coincideTitulo = ev.titulo?.toLowerCase().includes(termino);
            const coincideDesc = ev.descripcion?.toLowerCase().includes(termino);
            const coincideLugar = ev.lugar?.toLowerCase().includes(termino);
            const coincideClub = ev.club_nombre?.toLowerCase().includes(termino);
            if (!coincideTitulo && !coincideDesc && !coincideLugar && !coincideClub) {
                return false;
            }
        }

        // Filtro por club
        if (filtroClub !== 'todos' && String(ev.club_id) !== String(filtroClub)) {
            return false;
        }

        // Filtro por temporalidad
        const fechaEv = parseFecha(ev.fecha_evento);
        if (filtroTiempo === 'proximos') {
            if (!fechaEv || fechaEv < hoy) return false;
        } else if (filtroTiempo === 'pasados') {
            if (!fechaEv || fechaEv >= hoy) return false;
        } else if (filtroTiempo === 'este_mes') {
            if (!fechaEv || fechaEv.getMonth() !== hoy.getMonth() || fechaEv.getFullYear() !== hoy.getFullYear()) {
                return false;
            }
        }

        return true;
    }).sort((a, b) => {
        const fA = parseFecha(a.fecha_evento)?.getTime() || 0;
        const fB = parseFecha(b.fecha_evento)?.getTime() || 0;

        if (orden === 'proximos_primero') {
            // Próximos eventos primero
            const diffA = fA - hoy.getTime();
            const diffB = fB - hoy.getTime();
            if (diffA >= 0 && diffB >= 0) return diffA - diffB;
            if (diffA >= 0) return -1;
            if (diffB >= 0) return 1;
            return fB - fA;
        } else if (orden === 'recientes') {
            return fB - fA;
        } else if (orden === 'antiguos') {
            return fA - fB;
        } else if (orden === 'asistentes') {
            return (Number(b.total_asistentes) || 0) - (Number(a.total_asistentes) || 0);
        }
        return 0;
    });

    // Conteo estadístico
    const totalProximos = eventos.filter(ev => {
        const d = parseFecha(ev.fecha_evento);
        return d && d >= hoy;
    }).length;

    const totalPasados = eventos.filter(ev => {
        const d = parseFecha(ev.fecha_evento);
        return d && d < hoy;
    }).length;

    const totalAsistenciasGlobales = eventos.reduce((acum, ev) => acum + (Number(ev.total_asistentes) || 0), 0);

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">🏆 Sistema de Clubs - ESCOM</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">
                            Hola, <span className="user-name-highlight">
                                {user?.nombres || "Administrador"}
                            </span>
                        </span>
                        <div
                            className="profile-bubble"
                            style={{ backgroundColor: getAvatarColor(user?.nombres) }}
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
                            {(user?.nombres || "A").charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main className="admin-main-scroll">
                    <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
                        {/* Cabecera del Panel de Eventos */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px 0', color: '#003366', fontSize: '1.65rem', fontWeight: '700' }}>
                                        🗓️ Gestión y Supervisión de Eventos
                                    </h2>
                                    <p style={{ margin: 0, color: '#555', fontSize: '0.92rem' }}>
                                        Monitoreo de todos los eventos registrados por los clubes deportivos y culturales de la institución.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#003366', background: '#e7f3ff', padding: '6px 12px', borderRadius: '15px', fontWeight: '600' }}>
                                        📅 {eventos.length} Totales
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#1b7a43', background: '#e6f4ea', padding: '6px 12px', borderRadius: '15px', fontWeight: '600' }}>
                                        🟢 {totalProximos} Próximos
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: '15px', fontWeight: '600' }}>
                                        👥 {totalAsistenciasGlobales} Asistencias
                                    </span>
                                </div>
                            </div>
                            <hr style={{ margin: '14px 0 18px 0', borderColor: '#d1d5db' }} />

                            {/* Selector de Vistas: Vista Calendario vs Catálogo Completo */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setVistaActiva('calendario')}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        background: vistaActiva === 'calendario' ? '#003366' : '#e4e6eb',
                                        color: vistaActiva === 'calendario' ? '#ffffff' : '#1c1e21',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: vistaActiva === 'calendario' ? '0 2px 6px rgba(0, 51, 102, 0.25)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    🗓️ Vista Calendario
                                </button>
                                <button
                                    onClick={() => setVistaActiva('todos')}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        background: vistaActiva === 'todos' ? '#003366' : '#e4e6eb',
                                        color: vistaActiva === 'todos' ? '#ffffff' : '#1c1e21',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: vistaActiva === 'todos' ? '0 2px 6px rgba(0, 51, 102, 0.25)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    📋 Todos los Eventos Registrados ({eventos.length})
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="message-banner error" style={{ marginBottom: '16px' }}>
                                {error}
                            </div>
                        )}

                        {/* VISTA 1: CALENDARIO INTERACTIVO */}
                        {vistaActiva === 'calendario' && (
                            <CalendarioEventos
                                eventos={eventos}
                                modo="admin"
                                clubes={clubes}
                                cargando={loading}
                                onRefresh={fetchAllData}
                            />
                        )}

                        {/* VISTA 2: CATÁLOGO DE TODOS LOS EVENTOS CON FILTROS AVANZADOS */}
                        {vistaActiva === 'todos' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Barra de Filtros y Búsqueda */}
                                <div style={{
                                    background: '#ffffff',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    border: '1px solid #e1e5eb',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    {/* Fila 1: Búsqueda de texto y selector de club */}
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ flex: '1 1 260px', position: 'relative' }}>
                                            <input
                                                type="search"
                                                placeholder="🔍 Buscar por título, lugar, descripción..."
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.92rem',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>

                                        <div style={{ flex: '1 1 220px' }}>
                                            <select
                                                value={filtroClub}
                                                onChange={(e) => setFiltroClub(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.92rem',
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <option value="todos">🏆 Todos los Clubes ({eventos.length})</option>
                                                {clubes.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ flex: '1 1 200px' }}>
                                            <select
                                                value={orden}
                                                onChange={(e) => setOrden(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.92rem',
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <option value="proximos_primero">⏳ Más próximos primero</option>
                                                <option value="recientes">📅 Más recientes en fecha</option>
                                                <option value="antiguos">🕒 Más antiguos en fecha</option>
                                                <option value="asistentes">👥 Mayor asistencia</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Fila 2: Botones de filtro por Temporalidad */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>
                                            Estado:
                                        </span>
                                        {[
                                            { id: 'todos', label: 'Todos los tiempos', conteo: eventos.length },
                                            { id: 'proximos', label: '🟢 Próximos', conteo: totalProximos },
                                            { id: 'este_mes', label: '📅 Este mes', conteo: eventos.filter(ev => {
                                                const d = parseFecha(ev.fecha_evento);
                                                return d && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
                                            }).length },
                                            { id: 'pasados', label: '⚪ Pasados', conteo: totalPasados }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setFiltroTiempo(tab.id)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '20px',
                                                    border: '1px solid',
                                                    borderColor: filtroTiempo === tab.id ? '#003366' : '#cbd5e1',
                                                    background: filtroTiempo === tab.id ? '#003366' : '#f8fafc',
                                                    color: filtroTiempo === tab.id ? '#ffffff' : '#334155',
                                                    cursor: 'pointer',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '600',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {tab.label} ({tab.conteo})
                                            </button>
                                        ))}

                                        {(busqueda || filtroClub !== 'todos' || filtroTiempo !== 'todos') && (
                                            <button
                                                onClick={() => {
                                                    setBusqueda('');
                                                    setFiltroClub('todos');
                                                    setFiltroTiempo('todos');
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#dc2626',
                                                    cursor: 'pointer',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 'bold',
                                                    textDecoration: 'underline',
                                                    marginLeft: 'auto'
                                                }}
                                            >
                                                Limpiar filtros
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Lista / Catálogo de Eventos */}
                                {loading ? (
                                    <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
                                        ⏳ Cargando todos los eventos registrados...
                                    </div>
                                ) : eventosFiltradosCatalogo.length === 0 ? (
                                    <div style={{
                                        background: '#ffffff',
                                        padding: '40px 20px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        color: '#64748b',
                                        border: '1px solid #e1e5eb'
                                    }}>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>No se encontraron eventos con los filtros seleccionados.</p>
                                        <button
                                            onClick={() => {
                                                setBusqueda('');
                                                setFiltroClub('todos');
                                                setFiltroTiempo('todos');
                                            }}
                                            className="btn-review-club"
                                        >
                                            Restablecer filtros
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                                        {eventosFiltradosCatalogo.map(ev => {
                                            const d = parseFecha(ev.fecha_evento);
                                            const esFuturo = d && d >= hoy;
                                            const colorClub = getClubColor(ev.club_id);

                                            return (
                                                <div
                                                    key={ev.id}
                                                    onClick={() => setEventoDetalle(ev)}
                                                    style={{
                                                        background: '#ffffff',
                                                        borderRadius: '12px',
                                                        border: '1px solid #e2e8f0',
                                                        borderLeft: `6px solid ${colorClub}`,
                                                        padding: '16px 18px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '10px',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                                                    }}
                                                >
                                                    {/* Cabecera de la tarjeta: Club y Estado temporal */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                        <span style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 'bold',
                                                            color: colorClub,
                                                            background: `${colorClub}15`,
                                                            padding: '2px 8px',
                                                            borderRadius: '8px'
                                                        }}>
                                                            🏆 {ev.club_nombre}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontWeight: 'bold',
                                                            background: esFuturo ? '#e6f4ea' : '#f1f5f9',
                                                            color: esFuturo ? '#1b7a43' : '#64748b'
                                                        }}>
                                                            {esFuturo ? '🟢 Próximo' : '⚪ Finalizado'}
                                                        </span>
                                                    </div>

                                                    {/* Título y descripción */}
                                                    <div>
                                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.08rem', color: '#1e293b' }}>
                                                            {ev.titulo}
                                                        </h4>
                                                        {ev.descripcion && (
                                                            <p style={{
                                                                margin: 0,
                                                                color: '#64748b',
                                                                fontSize: '0.88rem',
                                                                lineHeight: '1.4',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {ev.descripcion}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Fecha, Hora y Lugar */}
                                                    <div style={{
                                                        fontSize: '0.84rem',
                                                        color: '#475569',
                                                        background: '#f8fafc',
                                                        padding: '8px 10px',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px'
                                                    }}>
                                                        <div>
                                                            📅 {d ? d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha no especificada'}
                                                            {' · '}
                                                            🕒 {d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''} hrs
                                                        </div>
                                                        {ev.lugar && (
                                                            <div>
                                                                📍 {ev.lugar}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Pie de la tarjeta: Asistentes y botón */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                                                        <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: '600' }}>
                                                            👥 {ev.total_asistentes || 0} confirmados
                                                        </span>
                                                        <span style={{ fontSize: '0.84rem', color: '#1877f2', fontWeight: 'bold' }}>
                                                            Ver detalle →
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal de Detalle Completo para Administrador */}
            {eventoDetalle && (
                <div
                    onClick={() => setEventoDetalle(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            maxWidth: '560px',
                            width: '100%',
                            padding: '24px 28px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            position: 'relative',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                    >
                        <button
                            onClick={() => setEventoDetalle(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>

                        <div>
                            <span style={{
                                background: `${getClubColor(eventoDetalle.club_id)}18`,
                                color: getClubColor(eventoDetalle.club_id),
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                marginBottom: '6px'
                            }}>
                                🏆 {eventoDetalle.club_nombre}
                            </span>
                            <h3 style={{ margin: '0 0 6px 0', color: '#003366', fontSize: '1.4rem' }}>
                                {eventoDetalle.titulo}
                            </h3>
                        </div>

                        <div style={{
                            background: '#f8fafc',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '0.92rem',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div>
                                📅 <strong>Fecha completa:</strong> {parseFecha(eventoDetalle.fecha_evento)?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div>
                                🕒 <strong>Hora:</strong> {parseFecha(eventoDetalle.fecha_evento)?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                            </div>
                            {eventoDetalle.lugar && (
                                <div>
                                    📍 <strong>Lugar asignado:</strong> {eventoDetalle.lugar}
                                </div>
                            )}
                            <div>
                                👥 <strong>Total de alumnos/profesores confirmados:</strong> {eventoDetalle.total_asistentes || 0}
                            </div>
                            {eventoDetalle.fecha_creacion && (
                                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                    🕒 Registrado en el sistema: {new Date(eventoDetalle.fecha_creacion).toLocaleDateString('es-MX')}
                                </div>
                            )}
                        </div>

                        {eventoDetalle.descripcion && (
                            <div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#334155' }}>Descripción del Evento:</h4>
                                <p style={{ margin: 0, color: '#475569', lineHeight: '1.55', whiteSpace: 'pre-line', fontSize: '0.92rem' }}>
                                    {eventoDetalle.descripcion}
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                onClick={() => setEventoDetalle(null)}
                                style={{
                                    background: '#003366',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 20px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
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

export default AdminCalendarioPage;
