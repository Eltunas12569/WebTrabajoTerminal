import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Componente modular y reutilizable de Barra Lateral (Sidebar).
 * Centraliza la navegación del sistema según el rol del usuario:
 * - Rol 1: Administrador (Supervisión institucional).
 * - Roles 2, 3 y 4: Alumnos y Profesores (Gestión de clubes y actividades).
 * 
 * Props:
 * - isOpen (boolean): Estado visible en dispositivos móviles.
 * - onClose (function): Callback ejecutado para cerrar el menú lateral.
 * - activeTab (string, opcional): Pestaña activa si la vista usa tabs locales (ej. GestionDashboard).
 * - onTabChange (function, opcional): Manejador para alternar tabs locales sin recargar ruta.
 * - esEncargado (boolean, opcional): Indicador de si el usuario es encargado activo de club.
 * - canalActivo (string, opcional): Canal activo en la sala de chat institucional ('directivos' o 'encargados').
 * - onSelectCanal (function, opcional): Callback para cambiar canal en CanalesChatPage.
 */
const Sidebar = ({
    isOpen = false,
    onClose = () => {},
    activeTab = '',
    onTabChange = null,
    esEncargado: propEsEncargado = undefined,
    canalActivo = '',
    onSelectCanal = null
}) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [esEncargado, setEsEncargado] = useState(propEsEncargado || false);

    // Si no se suministra la prop esEncargado y el usuario es alumno/profesor, verificar en el backend
    useEffect(() => {
        if (propEsEncargado !== undefined) {
            setEsEncargado(propEsEncargado);
            return;
        }

        if (user && user.role_id !== 1 && user.id) {
            api.get(`/clubes/user/${user.id}`)
                .then(res => {
                    const clubs = res.data || [];
                    const tieneCargo = clubs.some(c => 
                        ['encargado_profesor', 'encargado_alumno'].includes(c.mi_rol_interno) 
                        && c.inscripcion_estatus === 'activo'
                    );
                    setEsEncargado(tieneCargo);
                })
                .catch(err => {
                    console.warn("Sidebar: No se pudo verificar rol de encargado:", err);
                });
        }
    }, [user, propEsEncargado]);

    const handleAction = (callback) => {
        if (typeof onClose === 'function') {
            onClose();
        }
        if (typeof callback === 'function') {
            callback();
        }
    };

    const activeItemStyle = {
        backgroundColor: '#e2e8f0',
        fontWeight: 'bold',
        color: '#003366',
        borderLeft: '4px solid #003366'
    };

    const isPathActive = (path) => {
        if (path === '/admin') {
            return location.pathname === '/admin';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <>
            <aside className={`admin-sidebar-fixed ${isOpen ? 'active' : ''}`}>
                <nav className="sidebar-links">
                    <ul>
                        {/* =========================================================
                            MENÚ ADMINISTRADOR (ROL 1)
                           ========================================================= */}
                        {user?.role_id === 1 ? (
                            <>
                                <li 
                                    onClick={() => handleAction(() => navigate('/admin'))}
                                    style={isPathActive('/admin') && !isPathActive('/admin/avisos') && !isPathActive('/admin/usuarios') && !isPathActive('/admin/calendario') ? activeItemStyle : undefined}
                                >
                                    🏠 Inicio
                                </li>
                                <li 
                                    onClick={() => handleAction(() => navigate('/admin'))}
                                    style={isPathActive('/admin') && !isPathActive('/admin/avisos') && !isPathActive('/admin/usuarios') && !isPathActive('/admin/calendario') ? activeItemStyle : undefined}
                                >
                                    📋 Lista de Clubs
                                </li>
                                <li 
                                    onClick={() => handleAction(() => navigate('/admin/avisos'))}
                                    style={isPathActive('/admin/avisos') ? activeItemStyle : undefined}
                                >
                                    📢 Gestión de Avisos
                                </li>
                                <li 
                                    onClick={() => handleAction(() => navigate('/admin/usuarios'))}
                                    style={isPathActive('/admin/usuarios') ? activeItemStyle : undefined}
                                >
                                    👥 Usuarios del sistema
                                </li>
                                <li 
                                    onClick={() => handleAction(() => navigate('/admin/calendario'))}
                                    style={isPathActive('/admin/calendario') ? activeItemStyle : undefined}
                                >
                                    🗓️ Calendario de Eventos
                                </li>
                                <li 
                                    onClick={() => {
                                        if (onSelectCanal) {
                                            handleAction(() => onSelectCanal('directivos'));
                                        } else {
                                            handleAction(() => navigate('/chat-directivos'));
                                        }
                                    }}
                                    style={location.pathname === '/chat-directivos' || (location.pathname === '/canales-chat' && canalActivo === 'directivos') ? activeItemStyle : undefined}
                                >
                                    🏛️ Chat de Directivos
                                </li>
                            </>
                        ) : (
                            /* =========================================================
                                MENÚ ALUMNOS Y PROFESORES (ROLES 2, 3 Y 4)
                               ========================================================= */
                            <>
                                <li 
                                    onClick={() => {
                                        if (onTabChange) {
                                            handleAction(() => onTabChange('avisos'));
                                        } else {
                                            handleAction(() => navigate('/gestion'));
                                        }
                                    }}
                                    style={onTabChange && activeTab === 'avisos' ? activeItemStyle : (!onTabChange && location.pathname === '/gestion' ? activeItemStyle : undefined)}
                                >
                                    🏠 Inicio
                                </li>
                                <li 
                                    onClick={() => {
                                        if (onTabChange) {
                                            handleAction(() => onTabChange('clubs'));
                                        } else {
                                            handleAction(() => navigate('/gestion'));
                                        }
                                    }}
                                    style={onTabChange && activeTab === 'clubs' ? activeItemStyle : undefined}
                                >
                                    📅 Mis Clubs
                                </li>

                                {/* Opción de Unirse a un Club: solo para Alumnos (rol 2) */}
                                {user?.role_id === 2 && (
                                    <li 
                                        onClick={() => {
                                            if (onTabChange) {
                                                handleAction(() => onTabChange('unirse'));
                                            } else {
                                                handleAction(() => navigate('/gestion'));
                                            }
                                        }}
                                        style={onTabChange && activeTab === 'unirse' ? activeItemStyle : undefined}
                                    >
                                        🔑 Unirse a un Club
                                    </li>
                                )}

                                {/* Opción de Crear Club: solo para Profesores (rol 3) */}
                                {user?.role_id === 3 && (
                                    <li 
                                        onClick={() => handleAction(() => navigate('/crear-club'))}
                                        className="special-link"
                                        style={location.pathname === '/crear-club' ? activeItemStyle : undefined}
                                    >
                                        ➕ Crear Club
                                    </li>
                                )}

                                {/* Canales Institucionales para Encargados Activos */}
                                {esEncargado && (
                                    <>
                                        <li 
                                            onClick={() => {
                                                if (onSelectCanal) {
                                                    handleAction(() => onSelectCanal('directivos'));
                                                } else {
                                                    handleAction(() => navigate('/chat-directivos'));
                                                }
                                            }}
                                            style={location.pathname === '/chat-directivos' || (location.pathname === '/canales-chat' && canalActivo === 'directivos') ? activeItemStyle : undefined}
                                        >
                                            🏛️ Chat Directivos
                                        </li>
                                        <li 
                                            onClick={() => {
                                                if (onSelectCanal) {
                                                    handleAction(() => onSelectCanal('encargados'));
                                                } else {
                                                    handleAction(() => navigate('/chat-encargados'));
                                                }
                                            }}
                                            style={location.pathname === '/chat-encargados' || (location.pathname === '/canales-chat' && canalActivo === 'encargados') ? activeItemStyle : undefined}
                                        >
                                            🤝 Chat Encargados
                                        </li>
                                    </>
                                )}
                            </>
                        )}
                    </ul>
                </nav>
                <button onClick={logout} className="logout-button">Cerrar Sesión</button>
            </aside>

            {/* Overlay semitransparente para cerrar en pantallas reducidas al hacer clic fuera */}
            {isOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        zIndex: 999
                    }}
                />
            )}
        </>
    );
};

export default Sidebar;

