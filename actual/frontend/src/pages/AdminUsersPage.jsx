import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';
import './css/AdminUsers.css';
import Sidebar from '../components/Sidebar';

const roleNames = {
    1: 'Administrador',
    2: 'Alumno',
    3: 'Profesor',
    4: 'Alumno representante'
};

const AdminUsersPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await api.get('/users/all-for-admin');
                setUsuarios(response.data);
            } catch (requestError) {
                setError(requestError.response?.data?.message || 'No se pudo cargar la lista de usuarios.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsuarios();
    }, []);

    const handleDeleteUser = async (usuario) => {
        if (Number(usuario.role_id) === 1) {
            setError('No se puede eliminar a otro administrador.');
            return;
        }

        const nombreCompleto = `${usuario.nombres} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim();
        const confirmado = window.confirm(
            `⚠️ ¿Estás seguro de eliminar permanentemente al usuario "${nombreCompleto}" (${usuario.correo})?\n\nEsta acción no se puede deshacer.`
        );
        if (!confirmado) return;

        setDeletingId(usuario.id);
        setError('');
        setSuccessMessage('');

        try {
            const response = await api.delete(`/users/${usuario.id}/admin-delete`);
            setUsuarios((prev) => prev.filter((item) => item.id !== usuario.id));
            setSuccessMessage(response.data?.message || 'Usuario eliminado permanentemente del sistema.');
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                'No se pudo eliminar al usuario.'
            );
        } finally {
            setDeletingId(null);
        }
    };

    const filteredUsers = usuarios.filter((usuario) => {
        const fullName = `${usuario.nombres} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.toLowerCase();
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || fullName.includes(search) || usuario.correo.toLowerCase().includes(search);
        const matchesRole = roleFilter === 'all' || String(usuario.role_id) === roleFilter;
        return matchesSearch && matchesRole;
    });

    const toggleSidebar = () => setIsSidebarOpen((open) => !open);

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">Sistema de Clubs</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, <strong>{user?.nombres || 'Administrador'}</strong></span>
                        <div className="profile-bubble" onClick={() => navigate('/perfil')} title="Configurar Perfil" role="button">{user?.nombres?.charAt(0).toUpperCase() || 'A'}</div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main className="admin-main-scroll">
                    <div className="admin-users-header">
                        <div>
                            <p className="admin-users-eyebrow">Administración</p>
                            <h1>Usuarios del sistema</h1>
                            <p>Consulta las cuentas registradas, excepto la cuenta administradora actual.</p>
                        </div>
                    </div>

                    <div className="admin-users-toolbar">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar por nombre o correo"
                            aria-label="Buscar usuarios"
                        />
                        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filtrar por rol">
                            <option value="all">Todos los roles</option>
                            <option value="2">Alumnos</option>
                            <option value="3">Profesores</option>
                        </select>
                    </div>

                    {loading && <div className="loading-state">Cargando usuarios...</div>}
                    {error && <div className="message-banner error">{error}</div>}
                    {successMessage && <div className="message-banner success">{successMessage}</div>}
                    {!loading && (
                        <div className="admin-users-table-wrap">
                            <table className="admin-users-table">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Correo</th>
                                        <th>Rol</th>
                                        <th>Cuenta</th>
                                        <th>Aviso de privacidad</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>
                                                <strong>{usuario.nombres} {usuario.apellido_paterno}</strong>
                                                <span>{usuario.apellido_materno || 'Sin apellido materno'}</span>
                                            </td>
                                            <td>{usuario.correo}</td>
                                            <td><span className="user-role">{roleNames[usuario.role_id] || 'Sin rol'}</span></td>
                                            <td><span className={`user-status ${usuario.verificado ? 'verified' : 'pending'}`}>{usuario.verificado ? 'Verificada' : 'Pendiente'}</span></td>
                                            <td>
                                                <span className={`user-status ${usuario.acepta_privacidad ? 'verified' : 'pending'}`}>
                                                    {usuario.acepta_privacidad ? `Aceptado${usuario.version_aviso_privacidad ? ` v${usuario.version_aviso_privacidad}` : ''}` : 'No aceptado'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="user-actions-group">
                                                    <button className="user-edit-button" onClick={() => navigate(`/admin/usuarios/${usuario.id}/editar`)}>
                                                        Editar
                                                    </button>
                                                    {Number(usuario.role_id) !== 1 && (
                                                        <button
                                                            type="button"
                                                            className="user-delete-button"
                                                            onClick={() => handleDeleteUser(usuario)}
                                                            disabled={deletingId === usuario.id}
                                                        >
                                                            {deletingId === usuario.id ? 'Eliminando...' : '🗑️ Eliminar'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && <div className="admin-users-empty">No se encontraron usuarios con esos filtros.</div>}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminUsersPage;
