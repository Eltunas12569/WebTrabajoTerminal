import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/Dashboards.css';
import Sidebar from '../components/Sidebar';

const AdminDashboard = () => {
    // Extraemos logout y user del Contexto corregido
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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

    const goToUsers = () => {
        setIsSidebarOpen(false);
        navigate('/admin/usuarios');
    };
    
    const filteredClubs = clubes.filter((club) => {
        const matchesName = club.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || club.estatus === statusFilter;
        return matchesName && matchesStatus;
    });

    const statusOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'esperando_firmas', label: 'Esperando firmas' },
        { value: 'en_revision', label: 'En revisión' },
        { value: 'activo', label: 'Activos' },
        { value: 'rechazado', label: 'Rechazados' },
        { value: 'inactivo', label: 'Inactivos' }
    ];

    const counts = {
        all: clubes.length,
        esperando_firmas: clubes.filter(c => c.estatus === 'esperando_firmas').length,
        en_revision: clubes.filter(c => c.estatus === 'en_revision').length,
        activo: clubes.filter(c => c.estatus === 'activo').length,
        rechazado: clubes.filter(c => c.estatus === 'rechazado').length,
        inactivo: clubes.filter(c => c.estatus === 'inactivo').length
    };

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
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
                            {/* Obtenemos la inicial de forma segura */}
                            {(user?.nombres || "U").charAt(0).toUpperCase()}
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
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h2 style={{ margin: 0, color: '#003366', fontSize: '1.6rem', fontWeight: '700' }}>Gestión de Clubes</h2>
                            <span style={{ fontSize: '0.9rem', color: '#003366', background: '#e7f3ff', padding: '4px 12px', borderRadius: '15px', fontWeight: '600' }}>
                                Total: {clubes.length} {clubes.length === 1 ? 'club' : 'clubes'}
                            </span>
                        </div>
                        <hr style={{ margin: '0 0 18px 0', borderColor: '#d1d5db' }} />

                        {/* Barra de Búsqueda y Filtros de Estado como Botones */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                            background: '#fff',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #e4e6eb'
                        }}>
                            {/* Búsqueda por nombre */}
                            <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', flex: '1 1 220px' }}>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="🔍 Buscar por nombre..."
                                    style={{
                                        width: '100%',
                                        padding: '9px 32px 9px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        background: '#f9fafb',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        boxSizing: 'border-box'
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
                                        title="Limpiar búsqueda"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Separador vertical */}
                            <div style={{ width: '1px', height: '28px', background: '#e5e7eb' }} />

                            {/* Botones de filtro por estado */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {statusOptions.map((opt) => {
                                    const isSelected = statusFilter === opt.value;
                                    const count = counts[opt.value] || 0;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setStatusFilter(opt.value)}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: '20px',
                                                border: isSelected ? '1px solid #003366' : '1px solid #d1d5db',
                                                background: isSelected ? '#003366' : '#fff',
                                                color: isSelected ? '#fff' : '#4b5563',
                                                fontWeight: isSelected ? '700' : '500',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span>{opt.label}</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '1px 6px',
                                                borderRadius: '10px',
                                                background: isSelected ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                                                color: isSelected ? '#fff' : '#374151',
                                                fontWeight: 'bold'
                                            }}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
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