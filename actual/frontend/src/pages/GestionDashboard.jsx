import React, { useState, useEffect } from 'react'; // Import useEffect
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios
import './css/Dashboards.css';

const GestionDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('clubs'); // Default to clubs tab
    const [userClubs, setUserClubs] = useState([]); // State for user's clubs
    const [loadingClubs, setLoadingClubs] = useState(true); // Loading state for clubs
    
    const [avisos, setAvisos] = useState([]); // Estado para los avisos combinados
    const [loadingAvisos, setLoadingAvisos] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL; // Get API_URL

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const goToProfile = () => {
        setIsSidebarOpen(false);
        navigate('/perfil');
    };

    const goToCreateClub = () => {
        setIsSidebarOpen(false);
        navigate('/crear-club');
    };

    // Fetch user's clubs when component mounts or user changes
    useEffect(() => {
        const fetchUserClubs = async () => {
            if (user && user.id) { // Ensure user and user.id are available
                setLoadingClubs(true);
                try {
                    const response = await axios.get(`${API_URL}/clubes/user/${user.id}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}` // Assuming token is stored in localStorage
                        }
                    });
                    setUserClubs(response.data);
                } catch (error) {
                    console.error("Error al obtener los clubes del usuario:", error);
                    // Handle error, maybe set an error state
                } finally {
                    setLoadingClubs(false);
                }
            }
        };
        fetchUserClubs();
    }, [user, API_URL]); // Re-run when user or API_URL changes

    // Obtener los avisos (Globales + Clubs) del usuario
    useEffect(() => {
        const fetchAvisos = async () => {
            if (user && user.id) {
                setLoadingAvisos(true);
                try {
                    const response = await axios.get(`${API_URL}/avisos/user/${user.id}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    setAvisos(response.data);
                } catch (error) {
                    console.error("Error al obtener los avisos:", error);
                } finally {
                    setLoadingAvisos(false);
                }
            }
        };
        fetchAvisos();
    }, [user, API_URL]);

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
                        <div className="profile-bubble">{user?.nombres?.charAt(0).toUpperCase()}</div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <aside className={`admin-sidebar-fixed ${isSidebarOpen ? 'active' : ''}`}>
                    <nav className="sidebar-links">
                        <ul>
                            <li onClick={() => { setActiveTab('avisos'); setIsSidebarOpen(false); }}>🏠 Inicio</li>
                            <li onClick={() => { setActiveTab('clubs'); setIsSidebarOpen(false); }}>📅 Mis Actividades</li>
                            
                            {/* Mostrar Pasar Lista solo a Administradores (1) y Profesores (2) */}
                            {(user?.role_id === 1 || user?.role_id === 2) && <li onClick={toggleSidebar}>📋 Pasar Lista</li>}

                            {/* Opción para crear club, solo para profesores (rol 3) */}
                            {user?.role_id === 3 && (
                                <li onClick={goToCreateClub} className="special-link">➕ Crear Club</li>
                            )}
                            <li onClick={goToProfile}>
                                ⚙️ Configurar Perfil
                            </li>
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll">
                    <div className="hub-container-centered">
                        <div className="folder-tabs">
                            <button 
                                className={`folder-btn ${activeTab === 'avisos' ? 'active-avisos' : ''}`}
                                onClick={() => setActiveTab('avisos')}
                            >
                                📁 🔔 Avisos <span className="tab-badge">{avisos.length}</span>
                            </button>
                            <button 
                                className={`folder-btn ${activeTab === 'clubs' ? 'active-clubs' : ''}`}
                                onClick={() => setActiveTab('clubs')}
                            >
                                📁 👥 Clubs <span className="tab-badge">{userClubs.length}</span>
                            </button>
                        </div>

                        <div className="folder-body" style={{ borderColor: activeTab === 'avisos' ? '#ff9800' : '#003366' }}>
                            {activeTab === 'avisos' ? (
                                <div className="avisos-list">
                                    {loadingAvisos ? (
                                        <p style={{ padding: '20px' }}>Cargando avisos...</p>
                                    ) : avisos.length > 0 ? (
                                        avisos.map(aviso => (
                                            <div key={`${aviso.tipo}-${aviso.id}`} className="aviso-item" style={{ borderLeft: aviso.prioridad === 'alta' ? '4px solid #dc3545' : '4px solid #003366' }}>
                                                <div className="aviso-header">
                                                    <h4>
                                                        {aviso.tipo === 'global' ? '🌍 ' : '🛡️ '} 
                                                        {aviso.titulo}
                                                    </h4>
                                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                                        {new Date(aviso.tiempo).toLocaleDateString('es-MX')}
                                                    </span>
                                                </div>
                                                <p>{aviso.descripcion}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ padding: '20px' }}>No hay avisos nuevos por el momento.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="clubs-list-simple"> {/* This is the clubs tab content */}
                                    {loadingClubs ? (
                                        <p>Cargando tus clubes...</p>
                                    ) : userClubs.length > 0 ? (
                                        userClubs.map(club => (
                                            <div key={club.id} className="club-row">
                                                <div className="club-row-info">
                                                    <h4>{club.nombre}</h4>
                                                    <p>Encargado: {club.profesor_nombres} {club.profesor_apellidos}</p>
                                                    <p>Estatus del club: {club.estatus}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No estás inscrito en ningún club activo.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
        </div>
    );
};

export default GestionDashboard;