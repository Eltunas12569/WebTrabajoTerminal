import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './css/Dashboards.css';

const AdminDashboard = () => {
    // Extraemos logout y user del Contexto corregido
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showClubDetails, setShowClubDetails] = useState(false); // Nuevo estado para controlar la visibilidad de la modal
    const [selectedClub, setSelectedClub] = useState(null); // Nuevo estado para almacenar el club seleccionado
    const [approving, setApproving] = useState(false); // Estado para el botón de aprobar
    const [rejecting, setRejecting] = useState(false); // Estado para el botón de rechazar (se mantiene para futuras implementaciones)
    const [actionError, setActionError] = useState(''); // Estado para errores en acciones de modal

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
        setActionError(''); // Limpiamos errores de acciones anteriores
        try {
            const response = await axios.get(`${API_URL}/clubes`);
            setClubes(response.data);
        } catch (error) {
            console.error("Error al conectar:", error);
        } finally {
            setLoading(false);
        }
    };

    // Función para abrir la modal de detalles del club
    const handleReviewClick = (club) => {
        setSelectedClub(club);
        setShowClubDetails(true);
    };

    // Función para cerrar la modal de detalles del club
    const closeClubDetails = () => {
        setShowClubDetails(false);
        setSelectedClub(null);
        setActionError(''); // Limpiar errores al cerrar la modal
    };

    // Función para aprobar un club
    const handleApproveClub = async (clubId) => {
        setApproving(true);
        setActionError('');
        try {
            await axios.put(`${API_URL}/clubes/${clubId}/status`, { estatus: 'activo' }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            // Refrescar la lista de clubes y cerrar la modal
            await fetchClubes();
            closeClubDetails();
        } catch (error) {
            console.error("Error al aprobar el club:", error);
            setActionError(error.response?.data?.message || 'Error al aprobar el club.');
        } finally {
            setApproving(false);
        }
    };
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    
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
                                            <button className="btn-review-club" onClick={() => handleReviewClick(club)}>Revisar</button>
                                        ) : (
                                            <button className="btn-view-club" onClick={() => handleReviewClick(club)}>Ver Detalles</button>
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

                {/* Modal de Detalles del Club */}
                {showClubDetails && selectedClub && (
                    <div className="club-details-overlay">
                        <div className="club-details-modal">
                            <button className="close-modal-btn" onClick={closeClubDetails}>×</button>
                            <h2 className="modal-title">Detalles del Club: {selectedClub.nombre}</h2>
                            <div className="modal-content">
                                <p><strong>Descripción:</strong> {selectedClub.descripcion}</p>
                                <p><strong>Estatus:</strong> <span className={`club-tag tag-${selectedClub.estatus?.toLowerCase()}`}>{selectedClub.estatus}</span></p>
                                <p><strong>Fecha de Creación:</strong> {new Date(selectedClub.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <p>
                                    <strong>Profesor Encargado:</strong> {selectedClub.profesor_nombres} {selectedClub.profesor_apellidos}
                                    {selectedClub.profesor_encargado_id && ` (ID: ${selectedClub.profesor_encargado_id})`}
                                </p>
                                <p>
                                    <strong>Alumno Encargado:</strong> {selectedClub.alumno_nombres} {selectedClub.alumno_apellidos}
                                    {selectedClub.alumno_encargado_id && ` (ID: ${selectedClub.alumno_encargado_id})`}
                                </p>
                            </div>
                            <div className="modal-actions">
                                {selectedClub.estatus === 'en_revision' && (
                                    <>  
                                        {actionError && <div className="message-banner error">{actionError}</div>}
                                        <button 
                                            className="btn-approve"
                                            onClick={() => handleApproveClub(selectedClub.id)}
                                            disabled={approving || rejecting}
                                        >{approving ? 'Aprobando...' : 'Aprobar Club'}</button>
                                        <button className="btn-reject">Rechazar Club</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;