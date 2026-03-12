import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './css/Dashboards.css';

// Componente interno para selector con búsqueda (Autocomplete)
const SearchableSelect = ({ options, value, onChange, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Sincronizar el texto del input con el valor seleccionado (ID)
        const selected = options.find(o => o.id == value);
        if (selected) {
            setSearchTerm(`${selected.nombres} ${selected.apellidos} (Boleta: ${selected.boleta})`);
        } else if (!isOpen) {
            // Solo limpiar si no está abierto (el usuario no está escribiendo activamente)
            setSearchTerm('');
        }
    }, [value, options, isOpen]);

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                className="login-input"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Pequeño retraso para permitir capturar el click en la lista
                autoComplete="off"
            />
            {isOpen && (
                <ul style={{
                    position: 'absolute', top: '100%', left: 0, width: '100%',
                    maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white',
                    border: '1px solid #ccc', borderRadius: '0 0 8px 8px', zIndex: 1000,
                    listStyle: 'none', padding: 0, margin: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {options.filter(op => 
                        `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(op => (
                        <li key={op.id}
                            style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', color: '#333' }}
                            onMouseDown={() => { onChange(op.id); setIsOpen(false); }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f2f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                            {op.nombres} {op.apellidos} (Boleta: {op.boleta})
                        </li>
                    ))}
                    {options.filter(op => `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <li style={{ padding: '10px', color: '#999' }}>No se encontraron resultados</li>
                    )}
                </ul>
            )}
        </div>
    );
};

const AdminDashboard = () => {
    // Extraemos logout y user del Contexto corregido
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showClubDetails, setShowClubDetails] = useState(false); // Nuevo estado para controlar la visibilidad de la modal
    const [selectedClub, setSelectedClub] = useState(null); // Nuevo estado para almacenar el club seleccionado
    
    // Estados para la edición
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ nombre: '', descripcion: '', profesor_encargado_id: '', alumno_encargado_id: '' });
    const [profesores, setProfesores] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [saving, setSaving] = useState(false);

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
        fetchCatalogos(); // Cargamos profesores y alumnos al iniciar
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

    // Función para obtener listas de profesores y alumnos para los selectores
    const fetchCatalogos = async () => {
        try {
            const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
            const [profRes, alumRes] = await Promise.all([
                axios.get(`${API_URL}/users/professors`, { headers }),
                axios.get(`${API_URL}/users/students-in-charge`, { headers })
            ]);
            setProfesores(profRes.data);
            setAlumnos(alumRes.data);
        } catch (error) {
            console.error("Error al cargar catálogos para edición:", error);
        }
    };

    // Función para abrir la modal de detalles del club
    const handleReviewClick = (club) => {
        setSelectedClub(club);
        setEditData({
            nombre: club.nombre,
            descripcion: club.descripcion,
            profesor_encargado_id: club.profesor_encargado_id,
            alumno_encargado_id: club.alumno_encargado_id
        });
        setIsEditing(false); // Reseteamos modo edición
        setShowClubDetails(true);
    };

    // Función para cerrar la modal de detalles del club
    const closeClubDetails = () => {
        setShowClubDetails(false);
        setSelectedClub(null);
        setActionError(''); // Limpiar errores al cerrar la modal
        setIsEditing(false);
    };

    // Función para guardar cambios del club
    const handleSaveChanges = async () => {
        setSaving(true);
        setActionError('');
        try {
            await axios.put(`${API_URL}/clubes/${selectedClub.id}`, {
                nombre: editData.nombre,
                descripcion: editData.descripcion,
                nuevo_profesor_id: editData.profesor_encargado_id,
                nuevo_alumno_id: editData.alumno_encargado_id
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            await fetchClubes(); // Recargar lista
            closeClubDetails();
            alert("Club y encargados actualizados correctamente.");
        } catch (error) {
            console.error("Error al guardar cambios:", error);
            setActionError(error.response?.data?.message || "Error al actualizar el club.");
        } finally {
            setSaving(false);
        }
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

    // Función para eliminar un club
    const handleDeleteClub = async (e, clubId) => {
        e.stopPropagation(); // Evita que se abra el modal de detalles al hacer click en eliminar
        
        if (!window.confirm("¿Estás seguro de que deseas eliminar este club permanentemente? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/clubes/${clubId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            // Si se elimina correctamente, recargamos la lista
            await fetchClubes();
            
            // Si el club eliminado estaba abierto en el modal, lo cerramos
            if (selectedClub && selectedClub.id === clubId) {
                closeClubDetails();
            }
        } catch (error) {
            console.error("Error al eliminar el club:", error);
            alert("No se pudo eliminar el club. Verifica que tengas los permisos necesarios.");
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
                            
                            <h2 className="modal-title">
                                {isEditing ? 'Editar Club' : `Detalles del Club: ${selectedClub.nombre}`}
                            </h2>

                            <div className="modal-content">
                                {actionError && <div className="message-banner error" style={{marginBottom: '15px'}}>{actionError}</div>}

                                {isEditing ? (
                                    /* --- MODO EDICIÓN --- */
                                    <div className="edit-form-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Nombre del Club</label>
                                            <input 
                                                type="text" 
                                                className="login-input" 
                                                value={editData.nombre} 
                                                onChange={(e) => setEditData({...editData, nombre: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Descripción</label>
                                            <textarea 
                                                className="login-input" 
                                                rows="3"
                                                value={editData.descripcion} 
                                                onChange={(e) => setEditData({...editData, descripcion: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Profesor Encargado</label>
                                            <SearchableSelect 
                                                options={profesores}
                                                value={editData.profesor_encargado_id}
                                                onChange={(id) => setEditData({...editData, profesor_encargado_id: id})}
                                                placeholder="Buscar profesor por nombre o boleta..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Alumno Encargado</label>
                                            <SearchableSelect 
                                                options={alumnos}
                                                value={editData.alumno_encargado_id}
                                                onChange={(id) => setEditData({...editData, alumno_encargado_id: id})}
                                                placeholder="Buscar alumno por nombre o boleta..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* --- MODO LECTURA --- */
                                    <>
                                        <p><strong>Descripción:</strong> {selectedClub.descripcion}</p>
                                        <p><strong>Estatus:</strong> <span className={`club-tag tag-${selectedClub.estatus?.toLowerCase()}`}>{selectedClub.estatus}</span></p>
                                        <p><strong>Fecha de Creación:</strong> {new Date(selectedClub.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p><strong>Profesor Encargado:</strong> {selectedClub.profesor_nombres} {selectedClub.profesor_apellidos}</p>
                                        <p><strong>Alumno Encargado:</strong> {selectedClub.alumno_nombres} {selectedClub.alumno_apellidos}</p>
                                    </>
                                )}
                            </div>
                            <div className="modal-actions">
                                {selectedClub.estatus === 'en_revision' && (
                                    !isEditing && (
                                        <>  
                                        <button 
                                            className="btn-approve"
                                            onClick={() => handleApproveClub(selectedClub.id)}
                                            disabled={approving || rejecting}
                                        >{approving ? 'Aprobando...' : 'Aprobar Club'}</button>
                                        <button className="btn-reject">Rechazar Club</button>
                                        </>
                                    )
                                )}

                                {isEditing ? (
                                    <>
                                        <button 
                                            className="btn-view-club" // Reutilizamos estilo azul
                                            onClick={handleSaveChanges}
                                            disabled={saving}
                                        >
                                            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                                        </button>
                                        <button 
                                            className="btn-delete-club" // Reutilizamos estilo rojo/gris
                                            style={{ backgroundColor: '#6c757d', color: 'white' }}
                                            onClick={() => setIsEditing(false)}
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            className="btn-view-club"
                                            style={{ backgroundColor: '#ffc107', color: '#333' }}
                                            onClick={() => setIsEditing(true)}
                                        >
                                            ✏️ Editar Encargados
                                        </button>
                                        <button 
                                            className="btn-delete-club" 
                                            onClick={(e) => handleDeleteClub(e, selectedClub.id)}
                                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            🗑️ Eliminar Club
                                        </button>
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