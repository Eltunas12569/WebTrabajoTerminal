import React, { useState, useEffect } from 'react'; // Import useEffect
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios
import './css/Dashboards.css';
import AccionesAlumno from '../components/AccionesAlumno';

const GestionDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('avisos'); // Default to avisos tab
    const [userClubs, setUserClubs] = useState([]); // State for user's clubs
    const [loadingClubs, setLoadingClubs] = useState(true); // Loading state for clubs
    
    const [avisos, setAvisos] = useState([]); // Estado para los avisos combinados
    const [loadingAvisos, setLoadingAvisos] = useState(true);

    const [showMembersModal, setShowMembersModal] = useState(false);
    const [clubMembers, setClubMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [selectedClubName, setSelectedClubName] = useState('');
    const [selectedClub, setSelectedClub] = useState(null);
    const [sendingReview, setSendingReview] = useState(false);

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

    // Extraemos la función para poder llamarla después de aceptar una invitación o unirse con código
    const fetchUserClubs = async () => {
        if (user && user.id) { // Ensure user and user.id are available
            setLoadingClubs(true);
            try {
                const response = await axios.get(`${API_URL}/clubes/user/${user.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setUserClubs(response.data);
            } catch (error) {
                console.error("Error al obtener los clubes del usuario:", error);
            } finally {
                setLoadingClubs(false);
            }
        }
    };

    useEffect(() => {
        fetchUserClubs();
    }, [user, API_URL]); // Re-run when user or API_URL changes

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

    // Obtener los avisos (Globales + Clubs) del usuario
    useEffect(() => {
        fetchAvisos();
    }, [user, API_URL]);

    // Función para refrescar ambos paneles al aceptar/rechazar invitaciones o unirse a un club
    const handleUpdate = () => {
        fetchUserClubs();
        fetchAvisos();
    };

    const openMembersModal = async (club) => {
        setShowMembersModal(true);
        setLoadingMembers(true);
        setSelectedClubName(club.nombre);
        setSelectedClub(club);
        try {
            // Utilizamos el endpoint que ya preparaste en el backend para obtener el estado de las firmas
            const response = await axios.get(`${API_URL}/clubes/${club.id}/miembros`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setClubMembers(response.data);
        } catch (error) {
            console.error("Error al cargar firmas:", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleEnviarRevision = async () => {
        if (!selectedClub) return;
        setSendingReview(true);
        try {
            const response = await axios.put(`${API_URL}/clubes/${selectedClub.id}/enviar-revision`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert(response.data.message);
            setShowMembersModal(false);
            fetchUserClubs(); // Recargamos para actualizar el estatus en pantalla
        } catch (error) {
            alert(error.response?.data?.message || "Error al enviar a revisión. Asegúrate de tener suficientes firmas.");
        } finally {
            setSendingReview(false);
        }
    };

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
                            
                            {/* Mostrar Unirse a un Club solo a Alumnos (2) */}
                            {user?.role_id === 2 && <li onClick={() => { setActiveTab('unirse'); setIsSidebarOpen(false); }}>🔑 Unirse a un Club</li>}

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

                        <div className="folder-body" style={{ borderColor: activeTab === 'avisos' ? '#ff9800' : (activeTab === 'unirse' ? '#28a745' : '#003366') }}>
                            {activeTab === 'avisos' ? (
                                <div className="avisos-list">
                                    {/* Panel de Invitaciones (Renderizado como avisos urgentes) */}
                                    <AccionesAlumno onUpdate={handleUpdate} mostrar="invitaciones" />

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
                            ) : activeTab === 'unirse' ? (
                                <AccionesAlumno onUpdate={() => { handleUpdate(); setActiveTab('clubs'); }} mostrar="codigo" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                    <div className="clubs-list-simple">
                                        {loadingClubs ? (
                                            <p>Cargando tus clubes...</p>
                                        ) : userClubs.length > 0 ? (
                                            userClubs.map(club => (
                                                <div key={club.id} className="club-row">
                                                    <div className="club-row-info">
                                                        <h4>{club.nombre}</h4>
                                                        <p>Encargado: {club.profesor_nombres} {club.profesor_apellidos}</p>
                                                        <p>Estatus del club: {club.estatus}</p>
                                                        
                                                        {/* Botón exclusivo para los Profesores Titulares en etapa de recolección de firmas */}
                                                        {club.mi_rol_interno === 'encargado_profesor' && club.estatus === 'esperando_firmas' && (
                                                            <button 
                                                                onClick={() => openMembersModal(club)}
                                                                className="btn-review-club"
                                                                style={{ marginTop: '12px' }}
                                                            >
                                                                📋 Ver Detalles y Firmas
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p>No estás inscrito en ningún club activo.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            {/* Modal de Detalles y Firmas del Club */}
            {showMembersModal && (
                <div className="club-details-overlay" onClick={() => setShowMembersModal(false)}>
                    <div className="club-details-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button className="close-modal-btn" onClick={() => setShowMembersModal(false)}>✖</button>
                        <h2 className="modal-title" style={{ marginBottom: '5px' }}>{selectedClubName}</h2>
                        <p style={{ textAlign: 'center', color: '#666', marginTop: 0, marginBottom: '20px' }}>Estado de Firmas e Integrantes</p>
                        
                        {loadingMembers ? (
                            <p style={{ textAlign: 'center', padding: '20px' }}>Cargando lista de alumnos...</p>
                        ) : (
                            <div>
                                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #003366' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#003366' }}>Resumen de Firmas</h4>
                                    <p style={{ margin: '0' }}><strong>Total de alumnos en lista:</strong> {clubMembers.length}</p>
                                    <p style={{ margin: '5px 0 0 0' }}>
                                        <span style={{ color: '#155724' }}><strong>Firmaron:</strong> {clubMembers.filter(m => m.estatus === 'activo').length}</span> | 
                                        <span style={{ color: '#856404', marginLeft: '10px' }}><strong>Faltan:</strong> {clubMembers.filter(m => m.estatus === 'pendiente').length}</span>
                                    </p>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#003366', color: '#fff', textAlign: 'left' }}>
                                                <th style={{ padding: '12px', borderTopLeftRadius: '8px' }}>Alumno</th>
                                                <th style={{ padding: '12px' }}>Boleta</th>
                                                <th style={{ padding: '12px' }}>Rol</th>
                                                <th style={{ padding: '12px', borderTopRightRadius: '8px' }}>Firma</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clubMembers.map((miembro, idx) => (
                                                <tr key={miembro.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                    <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{miembro.nombres} {miembro.apellidos}</td>
                                                    <td style={{ padding: '12px', color: '#555' }}>{miembro.boleta || 'N/A'}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ 
                                                            fontSize: '0.85rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold',
                                                            backgroundColor: miembro.rol_en_club === 'encargado_alumno' ? '#e1e5eb' : 'transparent',
                                                            border: miembro.rol_en_club === 'encargado_alumno' ? '1px solid #ccc' : 'none'
                                                        }}>
                                                            {miembro.rol_en_club === 'encargado_alumno' ? '🎓 Líder' : 'Miembro'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {miembro.estatus === 'activo' ? (
                                                            <span style={{ color: '#155724', backgroundColor: '#d4edda', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ Firmado</span>
                                                        ) : (
                                                            <span style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>⏳ Pendiente</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {clubMembers.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay miembros inscritos.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Botón para enviar a revisión si el club sigue esperando firmas */}
                                    {selectedClub?.estatus === 'esperando_firmas' && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px', padding: '10px 0', borderTop: '1px solid #eee' }}>
                                            <button 
                                                onClick={handleEnviarRevision}
                                                disabled={sendingReview}
                                                style={{ 
                                                    padding: '12px 25px', backgroundColor: '#28a745', color: 'white', 
                                                    border: 'none', borderRadius: '8px', fontWeight: 'bold', 
                                                    cursor: sendingReview ? 'not-allowed' : 'pointer', fontSize: '1rem',
                                                    boxShadow: '0 4px 6px rgba(40, 167, 69, 0.2)', transition: 'background 0.2s'
                                                }}
                                                onMouseOver={(e) => !sendingReview && (e.target.style.backgroundColor = '#218838')}
                                                onMouseOut={(e) => !sendingReview && (e.target.style.backgroundColor = '#28a745')}
                                            >
                                                {sendingReview ? 'Enviando...' : '🚀 Enviar Club a Revisión Institucional'}
                                            </button>
                                        </div>
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