import React, { useState, useEffect } from 'react'; // Import useEffect
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // 1. Importamos el hook
import axios from 'axios'; // Import axios
import './css/Dashboards.css';

const GestionDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate(); // 2. Inicializamos el navegador
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('clubs'); // Default to clubs tab
    const [userClubs, setUserClubs] = useState([]); // State for user's clubs
    const [loadingClubs, setLoadingClubs] = useState(true); // Loading state for clubs
    const API_URL = import.meta.env.VITE_API_URL; // Get API_URL

    // Datos de ejemplo
    const avisos = [
        { id: 1, titulo: 'Nueva actualización', desc: 'La aplicación ha sido actualizada.', tiempo: 'Hace 5 min' },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // 3. Función para redirigir
    const goToCreateClub = () => {
        setIsSidebarOpen(false); // Cerramos el sidebar antes de irnos
        navigate('/crear-club'); // <--- Ruta a la que quieres ir
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
                            
                            {/* 4. Opción con redirección real */}
                            <li onClick={goToCreateClub} className="special-link">
                                ➕ Crear Club
                            </li>

                            {user?.rol !== 4 && <li onClick={toggleSidebar}>📋 Pasar Lista</li>}
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
                                    {avisos.map(aviso => (
                                        <div key={aviso.id} className="aviso-item">
                                            <div className="aviso-header">
                                                <h4>{aviso.titulo}</h4>
                                                <button className="close-x">×</button>
                                            </div>
                                            <p>{aviso.desc}</p>
                                        </div>
                                    ))}
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