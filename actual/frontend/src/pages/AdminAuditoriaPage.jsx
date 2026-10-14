import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './css/Dashboards.css';
import './css/AdminAuditoria.css';

const AdminAuditoriaPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [loadingClubes, setLoadingClubes] = useState(true);

    const [selectedClubId, setSelectedClubId] = useState(searchParams.get('clubId') || '');
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        const text = name || "U";
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // 1. Cargar lista de clubes
    useEffect(() => {
        const fetchClubes = async () => {
            setLoadingClubes(true);
            try {
                const res = await api.get('/clubes');
                const data = res.data || [];
                setClubes(data);

                const qClubId = searchParams.get('clubId');
                if (qClubId && data.some(c => String(c.id) === String(qClubId))) {
                    setSelectedClubId(String(qClubId));
                }
            } catch (err) {
                console.error("Error al cargar clubes:", err);
            } finally {
                setLoadingClubes(false);
            }
        };
        fetchClubes();
    }, []);

    // 2. Cargar historial del club seleccionado
    useEffect(() => {
        if (!selectedClubId) {
            setHistorial([]);
            return;
        }

        const fetchHistorial = async () => {
            setLoadingHistorial(true);
            try {
                const res = await api.get(`/clubes/${selectedClubId}/historial-encargados`);
                setHistorial(res.data || []);
            } catch (err) {
                console.error("Error al cargar historial:", err);
                setHistorial([]);
            } finally {
                setLoadingHistorial(false);
            }
        };

        fetchHistorial();
    }, [selectedClubId]);

    const handleSelectClub = (clubId) => {
        const idStr = clubId ? String(clubId) : '';
        setSelectedClubId(idStr);
        setFiltroRol('todos');
        if (idStr) {
            setSearchParams({ clubId: idStr });
        } else {
            setSearchParams({});
        }
    };

    const selectedClub = useMemo(() => {
        return clubes.find(c => String(c.id) === String(selectedClubId)) || null;
    }, [clubes, selectedClubId]);

    const filteredClubs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return clubes;
        return clubes.filter(c =>
            c.nombre?.toLowerCase().includes(q) ||
            c.profesor_nombres?.toLowerCase().includes(q) ||
            c.profesor_apellidos?.toLowerCase().includes(q) ||
            c.alumno_nombres?.toLowerCase().includes(q) ||
            c.alumno_apellidos?.toLowerCase().includes(q)
        );
    }, [clubes, searchTerm]);

    const historialFiltrado = useMemo(() => {
        if (filtroRol === 'profesor') return historial.filter(h => h.rol_en_club === 'encargado_profesor');
        if (filtroRol === 'alumno') return historial.filter(h => h.rol_en_club === 'encargado_alumno');
        return historial;
    }, [historial, filtroRol]);

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar} title="Abrir Menú">☰</button>
                    <span className="nav-title">Sistema de Clubs</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">
                            Hola, <span className="user-name-highlight">{user?.nombres || "Administrador"}</span>
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
                    <div className="admin-auditoria-simple-container">

                        {/* =========================================================
                            VISTA 1: NINGÚN CLUB SELECCIONADO -> TARJETAS DE CLUBES
                           ========================================================= */}
                        {!selectedClubId && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: '#003366', fontSize: '1.6rem', fontWeight: '700' }}>
                                            📜 Auditoría de Encargados
                                        </h2>
                                        <p style={{ margin: '4px 0 0 0', color: '#555', fontSize: '0.95rem' }}>
                                            Selecciona un club para consultar sus directivos actuales y el historial de relevos.
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#003366', background: '#e7f3ff', padding: '4px 12px', borderRadius: '15px', fontWeight: '600' }}>
                                        Total: {clubes.length} {clubes.length === 1 ? 'club' : 'clubes'}
                                    </span>
                                </div>
                                <hr style={{ margin: '0 0 18px 0', borderColor: '#d1d5db' }} />

                                {/* Barra de Búsqueda */}
                                <div style={{ position: 'relative', maxWidth: '380px', marginBottom: '20px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar club por nombre o encargado..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '9px 34px 9px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #d1d5db',
                                            background: '#fff',
                                            fontSize: '0.9rem',
                                            boxSizing: 'border-box',
                                            outline: 'none'
                                        }}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#888',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Listado de Tarjetas de Clubes */}
                                {loadingClubes ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        Cargando clubes...
                                    </div>
                                ) : filteredClubs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                        No se encontraron clubes con ese término de búsqueda.
                                    </div>
                                ) : (
                                    <div className="auditoria-tarjetas-grid">
                                        {filteredClubs.map((club) => (
                                            <div
                                                key={club.id}
                                                className="auditoria-tarjeta-cuadrada"
                                                onClick={() => handleSelectClub(club.id)}
                                            >
                                                <div>
                                                    <div className="tarjeta-cuadrada-header">
                                                        <h3>{club.nombre}</h3>
                                                        <span className={`club-tag tag-${club.estatus?.toLowerCase()}`}>
                                                            {club.estatus}
                                                        </span>
                                                    </div>

                                                    <div className="tarjeta-cuadrada-body">
                                                        <p className="tarjeta-cuadrada-desc">
                                                            {club.descripcion || 'Sin descripción disponible.'}
                                                        </p>
                                                        <div className="tarjeta-cuadrada-encargados">
                                                            <div>👨‍🏫 <strong>Profesor:</strong> {club.profesor_nombres ? `${club.profesor_nombres} ${club.profesor_apellidos || ''}` : 'No asignado'}</div>
                                                            <div>🎓 <strong>Alumno:</strong> {club.alumno_nombres ? `${club.alumno_nombres} ${club.alumno_apellidos || ''}` : 'No asignado'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="tarjeta-cuadrada-footer">
                                                    <button
                                                        type="button"
                                                        className="btn-tarjeta-auditoria"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectClub(club.id);
                                                        }}
                                                    >
                                                        📜 Ver Auditoría
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* =========================================================
                            VISTA 2: CLUB SELECCIONADO -> HISTORIAL DEL CLUB
                           ========================================================= */}
                        {selectedClub && (
                            <div className="auditoria-content-stack">
                                
                                {/* Botón Volver y Título del Club */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectClub('')}
                                        style={{
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            color: '#003366',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            fontWeight: '700',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        ← Volver a la Lista de Clubs
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h2 style={{ margin: 0, color: '#003366', fontSize: '1.5rem', fontWeight: '700' }}>
                                            {selectedClub.nombre}
                                        </h2>
                                        <span className={`club-tag tag-${selectedClub.estatus?.toLowerCase()}`}>
                                            {selectedClub.estatus}
                                        </span>
                                    </div>
                                </div>

                                {/* Tarjeta: Encargados Actuales */}
                                <div className="auditoria-card">
                                    <h3 className="auditoria-card-title">
                                        👥 Encargados Actuales
                                    </h3>
                                    <div className="auditoria-current-grid">
                                        {/* Profesor */}
                                        <div className="auditoria-current-item">
                                            <div className="auditoria-current-role role-profesor">
                                                👨‍🏫 Profesor Encargado
                                            </div>
                                            <div className="auditoria-current-name">
                                                {selectedClub.profesor_nombres ? `${selectedClub.profesor_nombres} ${selectedClub.profesor_apellidos || ''}` : 'No asignado'}
                                            </div>
                                            <div className="auditoria-current-meta">
                                                ✉️ <strong>Correo:</strong> {selectedClub.profesor_correo || 'No registrado'}
                                            </div>
                                            <div className="auditoria-current-meta">
                                                💼 <strong>Núm. Empleado:</strong> {selectedClub.profesor_num_empleado || 'No registrado'}
                                            </div>
                                        </div>

                                        {/* Alumno */}
                                        <div className="auditoria-current-item">
                                            <div className="auditoria-current-role role-alumno">
                                                🎓 Alumno Encargado
                                            </div>
                                            <div className="auditoria-current-name">
                                                {selectedClub.alumno_nombres ? `${selectedClub.alumno_nombres} ${selectedClub.alumno_apellidos || ''}` : 'No asignado'}
                                            </div>
                                            <div className="auditoria-current-meta">
                                                ✉️ <strong>Correo:</strong> {selectedClub.alumno_correo || 'No registrado'}
                                            </div>
                                            <div className="auditoria-current-meta">
                                                🆔 <strong>Boleta:</strong> {selectedClub.alumno_boleta || 'No registrada'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjeta: Historial de Encargados Anteriores */}
                                <div className="auditoria-card">
                                    <div className="auditoria-card-header-flex">
                                        <h3 className="auditoria-card-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                                            📜 Historial de Encargados Anteriores (Auditoría)
                                        </h3>
                                        {historial.length > 0 && (
                                            <div className="auditoria-role-filters">
                                                <button
                                                    type="button"
                                                    onClick={() => setFiltroRol('todos')}
                                                    className={`auditoria-filter-btn ${filtroRol === 'todos' ? 'active' : ''}`}
                                                >
                                                    Todos ({historial.length})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFiltroRol('profesor')}
                                                    className={`auditoria-filter-btn ${filtroRol === 'profesor' ? 'active' : ''}`}
                                                >
                                                    Profesores
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFiltroRol('alumno')}
                                                    className={`auditoria-filter-btn ${filtroRol === 'alumno' ? 'active' : ''}`}
                                                >
                                                    Alumnos
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {loadingHistorial ? (
                                        <p style={{ color: '#666', textAlign: 'center', margin: '20px 0' }}>
                                            Cargando historial de encargados...
                                        </p>
                                    ) : historial.length === 0 ? (
                                        <p style={{ color: '#666', margin: 0 }}>
                                            No hay encargados registrados previamente en el historial de este club.
                                        </p>
                                    ) : historialFiltrado.length === 0 ? (
                                        <p style={{ color: '#666', margin: 0 }}>
                                            No hay registros para el filtro seleccionado.
                                        </p>
                                    ) : (
                                        <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                                            <table className="auditoria-simple-table">
                                                <thead>
                                                    <tr>
                                                        <th>Nombre</th>
                                                        <th>Cargo</th>
                                                        <th>Contacto / ID</th>
                                                        <th>Período</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historialFiltrado.map((h, idx) => {
                                                        const esProfesor = h.rol_en_club === 'encargado_profesor';
                                                        return (
                                                            <tr key={h.id || idx}>
                                                                <td style={{ fontWeight: '600', color: '#1c1e21' }}>
                                                                    {h.nombre_completo}
                                                                </td>
                                                                <td>
                                                                    <span className={`auditoria-tag-cargo ${esProfesor ? 'tag-profesor' : 'tag-alumno'}`}>
                                                                        {esProfesor ? 'Profesor' : 'Alumno Líder'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ color: '#555', fontSize: '0.9rem' }}>
                                                                    {h.correo} {h.num_empleado ? `· EMP: ${h.num_empleado}` : h.boleta ? `· Boleta: ${h.boleta}` : ''}
                                                                </td>
                                                                <td style={{ color: '#666', fontSize: '0.9rem' }}>
                                                                    {h.fecha_inicio ? new Date(h.fecha_inicio).toLocaleDateString('es-MX') : '—'} hasta {h.fecha_fin ? new Date(h.fecha_fin).toLocaleDateString('es-MX') : 'Actual'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminAuditoriaPage;
