import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/Dashboards.css';

const AdminDashboard = () => {
    // Extraemos logout y user del Contexto corregido
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Función para generar un color aleatorio consistente por usuario
    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        // Fallback por si nombres es undefined inicialmente
        const text = name || "U";
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    useEffect(() => {
        fetchClubes();
    }, []);

    // Función para obtener los clubes (extraída para poder ser llamada después de acciones)
    const fetchClubes = async () => {
        setLoading(true);
        try {
            const response = await api.get('/clubes');
            setClubes(response.data);
        } catch (error) {
            console.error("Error al conectar:", error);
        } finally {
            setLoading(false);
        }
    };

    // Navegación hacia la nueva página de detalles
    const goToClubDetails = (clubId) => {
        navigate(`/admin/club/${clubId}`);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const goToAvisos = () => {
        setIsSidebarOpen(false);
        navigate('/admin/avisos');
    };

    const goToProfile = () => {
        setIsSidebarOpen(false);
        navigate('/perfil');
    };
    
    const filteredClubs = clubes.filter((club) => {
        const matchesName = club.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || club.estatus === statusFilter;
        return matchesName && matchesStatus;
    });

    const noClubsMessage = loading
        ? 'Buscando clubes en la base de datos...'
        : clubes.length === 0
            ? 'No hay clubes registrados.'
            : 'No se encontraron clubes con esos filtros.';

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{backgroundColor: '#003366', color: '#fff'}}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">🏆 Sistema de Clubs - ESCOM</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">
                            {/* Verificación de seguridad para el nombre */}
                            Hola, <span className="user-name-highlight">
                                {user?.nombres || "Cargando..."}
                            </span>
                        </span>

                        <div
                            className="profile-bubble"
                            style={{ backgroundColor: getAvatarColor(user?.nombres) }}
                        >
                            {/* Obtenemos la inicial de forma segura */}
                            {(user?.nombres || "U").charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <aside className={`admin-sidebar-fixed ${isSidebarOpen ? 'active' : ''}`}>
                    <nav className="sidebar-links">
                        <ul>
                            <li onClick={toggleSidebar}>🏠 Inicio</li>
                            <li onClick={toggleSidebar}>📋 Lista de Clubs</li>
                            <li onClick={goToAvisos}>
                                📢 Gestión de Avisos
                            </li>
                            <li onClick={goToProfile}>
                                ⚙️ Configurar Perfil
                            </li>
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll">
                    <div className="page-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>Gestión de Clubes</h2>
                            <hr style={{ marginTop: '12px', borderColor: '#d1d5db' }} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 14px',
                                    borderRadius: '999px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: '#1c1e21'
                                }}
                            >
                                <span>🔍</span>
                                <span>Filtros</span>
                            </button>
                            {showFilters && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 12px)',
                                    right: 0,
                                    width: '320px',
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '16px',
                                    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
                                    padding: '16px',
                                    zIndex: 20
                                }}>
                                    <div style={{ marginBottom: '14px', fontWeight: '700', color: '#111' }}>Opciones de filtro</div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>Nombre</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Busca un club..."
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>Estado</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                                        >
                                            <option value="all">Todos los estados</option>
                                            <option value="esperando_firmas">Esperando firmas</option>
                                            <option value="en_revision">En revisión</option>
                                            <option value="activo">Activo</option>
                                            <option value="rechazado">Rechazado</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="clubs-grid-container">
                        {!loading && filteredClubs.length > 0 ? (
                            filteredClubs.map((club) => (
                                <div key={club.id} className="club-card-admin">
                                    <div className="club-card-header">
                                        <h3>{club.nombre}</h3>
                                        {/* Aplicamos las clases de tag ordenadas del CSS */}
                                        <span className={`club-tag tag-${club.estatus?.toLowerCase()}`}>
                                            {club.estatus}
                                        </span>
                                    </div>
                                    <div className="club-card-body">
                                        <p>{club.descripcion}</p>
                                    </div>
                                    <div className="club-card-footer">
                                        {['en_revision', 'esperando_firmas'].includes(club.estatus) ? (
                                            <button className="btn-review-club" onClick={() => goToClubDetails(club.id)}>Revisar</button>
                                        ) : (
                                            <button className="btn-view-club" onClick={() => goToClubDetails(club.id)}>Ver Detalles</button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="loading-state">
                                {noClubsMessage}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;