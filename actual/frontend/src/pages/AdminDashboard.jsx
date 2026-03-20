import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/Dashboards.css';

const AdminDashboard = () => {
    // Extraemos logout y user del Contexto corregido
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL;

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
    }, [API_URL]);

    // Función para obtener los clubes (extraída para poder ser llamada después de acciones)
    const fetchClubes = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/clubes`);
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

    const goToCreateClub = () => {
        setIsSidebarOpen(false);
        navigate('/crear-club');
    };
    
    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed">
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
                            <li onClick={goToCreateClub} className="special-link">
                                ➕ Crear Club
                            </li>
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll">
                    <div className="page-header">
                        <h2>Gestión de Clubes Deportivos</h2>
                        <hr />
                    </div>

                    <div className="clubs-grid-container">
                        {!loading && clubes.length > 0 ? (
                            clubes.map((club) => (
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
                                        {club.estatus === 'en_revision' ? (
                                            <button className="btn-review-club" onClick={() => goToClubDetails(club.id)}>Revisar</button>
                                        ) : (
                                            <button className="btn-view-club" onClick={() => goToClubDetails(club.id)}>Ver Detalles</button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="loading-state">
                                {loading ? "Buscando clubes en la base de datos..." : "No hay clubes registrados."}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;