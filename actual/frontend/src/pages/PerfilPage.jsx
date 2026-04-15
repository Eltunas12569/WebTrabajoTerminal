import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './css/Dashboards.css'; // Importamos el CSS del Dashboard principal
import './css/CrearClubPage.css'; // Reutilizamos este CSS para el contenedor de tarjeta

const PerfilPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;

    const [originalData, setOriginalData] = useState(null);
    const [formData, setFormData] = useState({
        // Pre-llenamos con la información de la sesión actual por si el backend tarda
        nombres: user?.nombres || '',
        apellido_paterno: user?.apellido_paterno || (user?.apellidos ? user.apellidos.split(' ')[0] : ''),
        apellido_materno: user?.apellido_materno || (user?.apellidos ? user.apellidos.split(' ').slice(1).join(' ') : ''),
        correo: user?.correo || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        tipo_sangre: '',
        alergias: '',
        contacto_emergencia_1_nombre: '',
        contacto_emergencia_1_telefono: '',
        contacto_emergencia_2_nombre: '',
        contacto_emergencia_2_telefono: '',
        contacto_emergencia_3_nombre: '',
        contacto_emergencia_3_telefono: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [tieneFicha, setTieneFicha] = useState(false);

    useEffect(() => {
        const fetchPerfil = async () => {
            try {
                const response = await axios.get(`${API_URL}/auth/perfil`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                const data = response.data;
                
                // Verificamos si el backend envió datos médicos
                if (data.ficha_medica) {
                    setTieneFicha(true);
                }
                
                const loadedData = {
                    nombres: data.nombres || '',
                    apellido_paterno: data.apellido_paterno || '',
                    apellido_materno: data.apellido_materno || '',
                    correo: data.correo || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                    tipo_sangre: data.ficha_medica?.tipo_sangre || '',
                    alergias: data.ficha_medica?.alergias || '',
                    contacto_emergencia_1_nombre: data.ficha_medica?.contacto_emergencia_1_nombre || '',
                    contacto_emergencia_1_telefono: data.ficha_medica?.contacto_emergencia_1_telefono || '',
                    contacto_emergencia_2_nombre: data.ficha_medica?.contacto_emergencia_2_nombre || '',
                    contacto_emergencia_2_telefono: data.ficha_medica?.contacto_emergencia_2_telefono || '',
                    contacto_emergencia_3_nombre: data.ficha_medica?.contacto_emergencia_3_nombre || '',
                    contacto_emergencia_3_telefono: data.ficha_medica?.contacto_emergencia_3_telefono || ''
                };
                setFormData(loadedData);
                setOriginalData(loadedData); // Guardamos la "foto" original
            } catch (err) {
                console.error("Error al cargar perfil:", err);
                // Si falla, aseguramos que al menos se vean los datos de la sesión
                const fallbackData = {
                    nombres: user?.nombres || '',
                    apellido_paterno: user?.apellido_paterno || (user?.apellidos ? user.apellidos.split(' ')[0] : ''),
                    apellido_materno: user?.apellido_materno || (user?.apellidos ? user.apellidos.split(' ').slice(1).join(' ') : ''),
                    correo: user?.correo || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                    tipo_sangre: '',
                    alergias: '',
                    contacto_emergencia_1_nombre: '',
                    contacto_emergencia_1_telefono: '',
                    contacto_emergencia_2_nombre: '',
                    contacto_emergencia_2_telefono: '',
                    contacto_emergencia_3_nombre: '',
                    contacto_emergencia_3_telefono: ''
                };
                setFormData(fallbackData);
                setOriginalData(fallbackData); // Guardamos la "foto" original
            } finally {
                setLoading(false);
            }
        };
        fetchPerfil();
    }, [API_URL]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        if (formData.newPassword && !formData.currentPassword) {
            setError('Debes ingresar tu contraseña actual para cambiarla.');
            return;
        }

        setSaving(true);
        try {
            const response = await axios.put(`${API_URL}/auth/perfil`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSuccess(response.data.message);
            setTieneFicha(true); // Al guardar exitosamente, ya cuenta con ficha
            // Limpiar los campos de contraseña y actualizar la "foto" original para que se oculte el botón
            const updatedData = { ...formData, currentPassword: '', newPassword: '', confirmNewPassword: '' };
            setFormData(updatedData);
            setOriginalData(updatedData);
        } catch (err) {
            console.error("Error al actualizar perfil:", err);
            setError(err.response?.data?.message || 'Error al actualizar el perfil.');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (user?.role_id === 1) navigate('/admin');
        else navigate('/gestion');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        const text = name || "U";
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Comprueba si los datos del formulario son diferentes a la copia original que llegó del servidor
    const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData);

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
                            {user?.role_id === 1 ? (
                                <>
                                    <li onClick={() => navigate('/admin')}>🏠 Inicio</li>
                                    <li onClick={() => navigate('/admin')}>📋 Lista de Clubs</li>
                                    <li onClick={() => navigate('/admin/avisos')}>📢 Gestión de Avisos</li>
                                </>
                            ) : (
                                <>
                                    <li onClick={() => navigate('/gestion')}>🏠 Inicio</li>
                                    <li onClick={() => navigate('/gestion')}>📅 Mis Actividades</li>
                                    {user?.role_id === 2 && <li onClick={() => navigate('/gestion')}>📋 Pasar Lista</li>}
                                    {user?.role_id === 3 && <li onClick={() => navigate('/crear-club')} className="special-link">➕ Crear Club</li>}
                                </>
                            )}
                            <li onClick={() => navigate('/perfil')}>⚙️ Configurar Perfil</li>
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll" style={{ backgroundColor: '#f4f6f8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#003366', width: '100%' }}>Cargando datos de perfil...</div>
                    ) : (
                        <div style={{ maxWidth: '1300px', width: '100%', marginTop: '20px', display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '0 20px' }}>
                            <div style={{ flexShrink: 0 }}>
                            </div>
                            <div className="crear-club-card" style={{ flex: 1, marginTop: '0', maxWidth: '100%' }}>
                            <h1 className="crear-club-title">⚙️ Configuración de Perfil</h1>
                            <p className="crear-club-subtitle">Actualiza tu contraseña de acceso.</p>

                            <form onSubmit={handleSubmit} className="crear-club-form">
                                <div style={{ display: 'flex', gap: '30px' }}>
                                    {/* Columna Izquierda: Información Personal */}
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ marginBottom: '15px', color: '#003366', fontSize: '1.1rem' }}>Datos Personales</h3>
                                        <div className="form-group"><label>Nombres</label><input type="text" name="nombres" value={formData.nombres} disabled /></div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div className="form-group" style={{ flex: 1 }}><label>Apellido Paterno</label><input type="text" name="apellido_paterno" value={formData.apellido_paterno} disabled /></div>
                                            <div className="form-group" style={{ flex: 1 }}><label>Apellido Materno</label><input type="text" name="apellido_materno" value={formData.apellido_materno} disabled /></div>
                                        </div>
                                        <div className="form-group"><label>Correo Electrónico</label><input type="email" name="correo" value={formData.correo} disabled /></div>
                                    </div>

                                    {/* Columna Derecha: Seguridad */}
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ marginBottom: '15px', color: '#003366', fontSize: '1.1rem' }}>Seguridad</h3>
                                        <div className="form-group"><label>Contraseña Actual</label><input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="Requerida solo si cambiarás de contraseña" /></div>
                                        <div className="form-group"><label>Nueva Contraseña</label><input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Mínimo 6 caracteres" /></div>
                                        <div className="form-group"><label>Confirmar Nueva Contraseña</label><input type="password" name="confirmNewPassword" value={formData.confirmNewPassword} onChange={handleChange} placeholder="Repite la nueva contraseña" /></div>
                                    </div>
                                </div>
                                
                                <hr style={{ margin: '30px 0', borderColor: '#e1e5eb' }} />
                                
                                <h3 style={{ marginBottom: '20px', color: '#003366', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🏥 Datos Médicos y de Emergencia
                                    {tieneFicha ? (
                                        <span style={{ fontSize: '0.8rem', background: '#d4edda', color: '#155724', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>✓ Información Cargada</span>
                                    ) : (
                                        <span style={{ fontSize: '0.8rem', background: '#fff3cd', color: '#856404', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>⚠️ Sin Registro Previo</span>
                                    )}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                    <div className="form-group"><label>Tipo de Sangre</label><input type="text" name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} placeholder="Ej. O+" /></div>
                                    <div className="form-group"><label>Alergias</label><input type="text" name="alergias" value={formData.alergias} onChange={handleChange} placeholder="Ninguna / Penicilina, etc." /></div>
                                    
                                    <div className="form-group"><label>Contacto Emergencia 1 (Nombre)</label><input type="text" name="contacto_emergencia_1_nombre" value={formData.contacto_emergencia_1_nombre} onChange={handleChange} required /></div>
                                    <div className="form-group"><label>Contacto Emergencia 1 (Teléfono)</label><input type="text" name="contacto_emergencia_1_telefono" value={formData.contacto_emergencia_1_telefono} onChange={handleChange} required /></div>
                                    
                                    <div className="form-group"><label>Contacto Emergencia 2 (Nombre)</label><input type="text" name="contacto_emergencia_2_nombre" value={formData.contacto_emergencia_2_nombre} onChange={handleChange} required /></div>
                                    <div className="form-group"><label>Contacto Emergencia 2 (Teléfono)</label><input type="text" name="contacto_emergencia_2_telefono" value={formData.contacto_emergencia_2_telefono} onChange={handleChange} required /></div>
                                    
                                    <div className="form-group"><label>Contacto Emergencia 3 (Nombre)</label><input type="text" name="contacto_emergencia_3_nombre" value={formData.contacto_emergencia_3_nombre} onChange={handleChange} required /></div>
                                    <div className="form-group"><label>Contacto Emergencia 3 (Teléfono)</label><input type="text" name="contacto_emergencia_3_telefono" value={formData.contacto_emergencia_3_telefono} onChange={handleChange} required /></div>
                                </div>

                                {/* El botón y la línea solo aparecen si hasChanges es true */}
                                {hasChanges && (
                                    <>
                                        <hr style={{ margin: '25px 0', borderColor: '#e1e5eb' }} />
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button type="submit" className="btn-crear-club" disabled={saving} style={{ marginTop: '0', maxWidth: '300px' }}>{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button>
                                        </div>
                                    </>
                                )}
                            </form>
                            {error && <div className="message-banner error">{error}</div>}{success && <div className="message-banner success">{success}</div>}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PerfilPage;