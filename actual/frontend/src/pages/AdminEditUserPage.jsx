import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';
import './css/AdminUsers.css';

const AdminEditUserPage = () => {
    const { user, logout } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get(`/users/${id}/admin-edit`);
                setFormData({
                    nombres: response.data.nombres || '',
                    apellido_paterno: response.data.apellido_paterno || '',
                    apellido_materno: response.data.apellido_materno || '',
                    correo: response.data.correo || '',
                    role_id: Number(response.data.role_id),
                    boleta: response.data.boleta || '',
                    carrera: response.data.carrera || '',
                    num_empleado: response.data.num_empleado || ''
                });
            } catch (requestError) {
                setError(requestError.response?.data?.message || 'No se pudo cargar el usuario.');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const response = await api.put(`/users/${id}/admin-edit`, formData);
            setMessage(response.data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'No se pudo actualizar el usuario.');
        } finally {
            setSaving(false);
        }
    };

    const roleLabel = formData?.role_id === 3 ? 'Profesor' : formData?.role_id === 4 ? 'Alumno representante' : 'Alumno';

    return (
        <div className="web-dashboard">
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={() => setIsSidebarOpen((open) => !open)}>☰</button>
                    <span className="nav-title">🏆 Sistema de Clubs - ESCOM</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, <strong>{user?.nombres || 'Administrador'}</strong></span>
                        <div className="profile-bubble">{user?.nombres?.charAt(0).toUpperCase() || 'A'}</div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <aside className={`admin-sidebar-fixed ${isSidebarOpen ? 'active' : ''}`}>
                    <nav className="sidebar-links">
                        <ul>
                            <li onClick={() => navigate('/admin')}>🏠 Inicio</li>
                            <li onClick={() => navigate('/admin/avisos')}>📢 Gestión de Avisos</li>
                            <li onClick={() => navigate('/admin/usuarios')}>👥 Usuarios del sistema</li>
                            <li onClick={() => navigate('/perfil')}>⚙️ Configurar Perfil</li>
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll">
                    <div className="admin-users-header">
                        <div>
                            <p className="admin-users-eyebrow">Administración segura</p>
                            <h1>Modificar usuario</h1>
                            <p>Solo un administrador puede guardar estos cambios. Los administradores no son editables.</p>
                        </div>
                    </div>

                    {loading && <div className="loading-state">Cargando usuario...</div>}
                    {error && !formData && <div className="message-banner error">{error}</div>}
                    {!loading && formData && (
                        <form className="admin-edit-form" onSubmit={handleSubmit}>
                            <div className="admin-edit-role">Rol actual: <strong>{roleLabel}</strong></div>
                            <div className="admin-edit-grid">
                                <label>Nombres<input name="nombres" value={formData.nombres} onChange={handleChange} required maxLength={100} /></label>
                                <label>Apellido paterno<input name="apellido_paterno" value={formData.apellido_paterno} onChange={handleChange} required maxLength={100} /></label>
                                <label>Apellido materno<input name="apellido_materno" value={formData.apellido_materno} onChange={handleChange} maxLength={100} /></label>
                                <label>Correo institucional<input name="correo" type="email" value={formData.correo} onChange={handleChange} required maxLength={100} /></label>
                                {formData.role_id === 3 ? (
                                    <label>Número de empleado<input name="num_empleado" value={formData.num_empleado} onChange={handleChange} required maxLength={20} /></label>
                                ) : (
                                    <>
                                        <label>Boleta<input name="boleta" value={formData.boleta} onChange={handleChange} required maxLength={10} /></label>
                                        <label>Carrera<input name="carrera" value={formData.carrera} onChange={handleChange} required maxLength={150} /></label>
                                    </>
                                )}
                            </div>
                            {error && <div className="message-banner error">{error}</div>}
                            {message && <div className="message-banner success">{message}</div>}
                            <div className="admin-edit-actions">
                                <button type="button" className="admin-edit-cancel" onClick={() => navigate('/admin/usuarios')}>Cancelar</button>
                                <button type="submit" className="admin-edit-save" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
                            </div>
                        </form>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminEditUserPage;
