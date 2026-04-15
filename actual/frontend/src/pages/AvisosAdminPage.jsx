import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css'; // Reutilizar estilos existentes

const AvisosAdminPage = () => {
    const { user, logout } = useAuth();
    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAllAvisos = async () => {
            try {
                setLoading(true);
                // Este es el nuevo endpoint que creamos en el backend
                const response = await api.get('/avisos/all-for-admin');
                setAvisos(response.data);
            } catch (err) {
                console.error("Error al cargar todos los avisos:", err);
                setError(err.response?.data?.message || 'No se pudieron cargar los avisos. ¿Tienes permisos de administrador?');
            } finally {
                setLoading(false);
            }
        };
        fetchAllAvisos();
    }, []);

    const getPrioridadStyle = (prioridad) => {
        const prio = prioridad?.toLowerCase();
        if (prio === 'alta') return { borderLeft: '5px solid #dc3545', backgroundColor: 'rgba(220, 53, 69, 0.05)' };
        if (prio === 'normal') return { borderLeft: '5px solid #007bff', backgroundColor: 'rgba(0, 123, 255, 0.05)' };
        if (prio === 'baja') return { borderLeft: '5px solid #28a745', backgroundColor: 'rgba(40, 167, 69, 0.05)' };
        return { borderLeft: '5px solid #6c757d' };
    };

    // Funciones para la UI de Dashboard (Navbar y Sidebar)
    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        const text = name || "U";
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const goToDashboard = () => {
        setIsSidebarOpen(false);
        navigate('/admin');
    };

    const goToCreateClub = () => {
        setIsSidebarOpen(false);
        navigate('/crear-club');
    };

    const goToAvisos = () => {
        setIsSidebarOpen(false);
        navigate('/admin/avisos');
    };

    const goToProfile = () => {
        setIsSidebarOpen(false);
        navigate('/perfil');
    };

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed" style={{backgroundColor: '#003366', color: '#fff'}}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">🏆 Sistema de Clubs - ESCOM</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">
                            Hola, <span className="user-name-highlight">
                                {user?.nombres || "Cargando..."}
                            </span>
                        </span>

                        <div className="profile-bubble" style={{ backgroundColor: getAvatarColor(user?.nombres) }}>
                            {(user?.nombres || "U").charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            {/* LAYOUT CON SIDEBAR Y CONTENIDO */}
            <div className="dashboard-layout">
                <aside className={`admin-sidebar-fixed ${isSidebarOpen ? 'active' : ''}`}>
                    <nav className="sidebar-links">
                        <ul>
                            <li onClick={goToDashboard}>🏠 Inicio</li>
                            <li onClick={goToDashboard}>📋 Lista de Clubs</li>
                            <li onClick={goToCreateClub} className="special-link">
                                ➕ Crear Club
                            </li>
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

                <main className="admin-main-scroll" style={{ backgroundColor: '#f4f6f8' }}>
                    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>Gestión de Avisos</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#666' }}>Visualiza todos los avisos globales y de clubes.</p>
                        </div>
                        <div>
                            {/* <button onClick={() => navigate('/admin/avisos/crear')} className="special-link" style={{ padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                ➕ Crear Aviso Global
                            </button> */}
                        </div>
                    </div>

                    {loading && <div className="loading-state">Cargando todos los avisos...</div>}
                    {error && <div className="message-banner error">{error}</div>}
                    
                    {!loading && !error && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                            {avisos.map(aviso => (
                                <div key={`${aviso.tipo}-${aviso.id}`} style={{
                                    background: '#fff',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                                    ...(aviso.tipo === 'global' ? getPrioridadStyle(aviso.prioridad) : { borderLeft: '5px solid #17a2b8', backgroundColor: 'rgba(23, 162, 184, 0.05)' })
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <h3 style={{ margin: 0, color: '#003366', fontSize: '1.2rem' }}>
                                            {aviso.tipo === 'global' ? `🌍 Aviso Global: ${aviso.titulo}` : `🛡️ Aviso de Club: ${aviso.nombre_club}`}
                                        </h3>
                                        <span style={{
                                            padding: '5px 12px',
                                            borderRadius: '15px',
                                            fontSize: '0.8rem',
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            background: aviso.activo ? '#28a745' : '#6c757d'
                                        }}>
                                            {aviso.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0 0 15px 0', color: '#333', lineHeight: '1.5' }}>{aviso.mensaje}</p>
                                    <div style={{ fontSize: '0.9em', color: '#555', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                        <span>
                                            <strong>Publicado:</strong> {new Date(aviso.fecha_creacion || aviso.fecha_envio).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                        {aviso.fecha_vencimiento && (
                                            <span>
                                                <strong>Vence:</strong> {new Date(aviso.fecha_vencimiento).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                             {avisos.length === 0 && (
                                <div className="loading-state">No se encontraron avisos.</div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AvisosAdminPage;