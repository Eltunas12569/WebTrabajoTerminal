import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';
import './css/CrearClubPage.css';

const CambiarPasswordPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profileData, setProfileData] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchPerfil = async () => {
            try {
                const response = await api.get('/auth/perfil');
                setProfileData(response.data);
            } catch (err) {
                console.error("Error al cargar perfil para cambio de contraseña:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPerfil();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!currentPassword) {
            setError('Debes ingresar tu contraseña actual.');
            return;
        }

        if (!newPassword) {
            setError('Debes ingresar una nueva contraseña.');
            return;
        }

        if (newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        if (currentPassword === newPassword) {
            setError('La nueva contraseña no puede ser igual a la contraseña actual.');
            return;
        }

        setSaving(true);
        try {
            // Se arma el payload manteniendo intactos los datos de perfil y médicos
            const baseContactos = profileData?.ficha_medica?.contactos || [];
            const contactosValidos = baseContactos.filter(c => c.nombre?.trim() && c.telefono?.trim());
            const contactosPayload = contactosValidos.length >= 2 
                ? contactosValidos 
                : [
                    { nombre: 'Contacto Emergencia 1', telefono: '5500000000' },
                    { nombre: 'Contacto Emergencia 2', telefono: '5500000000' }
                ];

            const payload = {
                nombres: profileData?.nombres || user?.nombres || '',
                apellido_paterno: profileData?.apellido_paterno || user?.apellido_paterno || '',
                apellido_materno: profileData?.apellido_materno || user?.apellido_materno || '',
                currentPassword: currentPassword,
                newPassword: newPassword,
                tipo_sangre: profileData?.ficha_medica?.tipo_sangre || 'O+',
                alergias: profileData?.ficha_medica?.alergias || '',
                contactos: contactosPayload
            };

            const response = await api.put('/auth/perfil', payload);
            setSuccess(response.data?.message || '¡Contraseña actualizada exitosamente!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

            // Redirige al perfil tras 2 segundos de confirmación
            setTimeout(() => {
                navigate('/perfil');
            }, 2000);
        } catch (err) {
            console.error("Error al cambiar contraseña:", err);
            const errorMsg = err.response?.data?.message || 'Error al actualizar la contraseña.';
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
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

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
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
                        <div
                            className="profile-bubble"
                            style={{ backgroundColor: getAvatarColor(user?.nombres) }}
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
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
                            <li onClick={() => navigate('/cambiar-password')} style={{ backgroundColor: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }}>🔑 Cambiar Contraseña</li>
                        </ul>
                    </nav>
                    <button onClick={logout} className="logout-button">Cerrar Sesión</button>
                </aside>

                <main className="admin-main-scroll" style={{ backgroundColor: '#f4f6f8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ maxWidth: '700px', width: '100%', marginTop: '30px', padding: '0 20px', boxSizing: 'border-box' }}>
                        
                        {/* Botón de retorno al perfil */}
                        <button
                            type="button"
                            onClick={() => navigate('/perfil')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#003366',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '18px',
                                padding: 0
                            }}
                        >
                            ← Volver al Perfil
                        </button>

                        <div className="crear-club-card" style={{ width: '100%', boxSizing: 'border-box', marginTop: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '2rem' }}>🔐</span>
                                <h1 className="crear-club-title" style={{ margin: 0, fontSize: '1.6rem' }}>Cambiar Contraseña</h1>
                            </div>
                            <p className="crear-club-subtitle" style={{ marginBottom: '25px' }}>
                                Ingresa tu contraseña actual y define una nueva clave segura para tu cuenta.
                            </p>

                            {/* Caja informativa de requisitos */}
                            <div style={{
                                backgroundColor: '#f0f4f8',
                                borderLeft: '4px solid #003366',
                                padding: '14px 18px',
                                borderRadius: '0 8px 8px 0',
                                marginBottom: '25px'
                            }}>
                                <h4 style={{ margin: '0 0 6px 0', color: '#003366', fontSize: '0.92rem' }}>Requisitos de seguridad:</h4>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', color: '#4a5568', lineHeight: '1.5' }}>
                                    <li>Mínimo 8 caracteres de longitud.</li>
                                    <li>Evita utilizar datos públicos como tu fecha de nacimiento o tu número de boleta.</li>
                                    <li>Asegúrate de recordar o almacenar tu nueva contraseña en un lugar seguro.</li>
                                </ul>
                            </div>

                            {loading ? (
                                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Cargando datos de seguridad...</p>
                            ) : (
                                <form onSubmit={handleSubmit} className="crear-club-form">
                                    {/* Contraseña Actual */}
                                    <div className="form-group" style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                                            Contraseña Actual *
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Ingresa tu contraseña actual"
                                                required
                                                style={{ width: '100%', paddingRight: '45px', boxSizing: 'border-box' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '1.1rem',
                                                    color: '#666'
                                                }}
                                                title={showCurrentPassword ? "Ocultar" : "Mostrar"}
                                            >
                                                {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nueva Contraseña */}
                                    <div className="form-group" style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                                            Nueva Contraseña *
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Mínimo 8 caracteres"
                                                required
                                                minLength={8}
                                                style={{ width: '100%', paddingRight: '45px', boxSizing: 'border-box' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '1.1rem',
                                                    color: '#666'
                                                }}
                                                title={showNewPassword ? "Ocultar" : "Mostrar"}
                                            >
                                                {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirmar Nueva Contraseña */}
                                    <div className="form-group" style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                                            Confirmar Nueva Contraseña *
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                placeholder="Repite la nueva contraseña"
                                                required
                                                minLength={8}
                                                style={{ width: '100%', paddingRight: '45px', boxSizing: 'border-box' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '1.1rem',
                                                    color: '#666'
                                                }}
                                                title={showConfirmPassword ? "Ocultar" : "Mostrar"}
                                            >
                                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mensajes de error / éxito */}
                                    {error && (
                                        <div className="message-banner error" style={{ marginBottom: '20px' }}>
                                            ⚠️ {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div className="message-banner success" style={{ marginBottom: '20px' }}>
                                            ✓ {success} (Redirigiendo...)
                                        </div>
                                    )}

                                    {/* Botones de acción */}
                                    <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                                        <button
                                            type="submit"
                                            className="btn-crear-club"
                                            disabled={saving}
                                            style={{ flex: 1, padding: '12px' }}
                                        >
                                            {saving ? 'Guardando...' : '💾 Actualizar Contraseña'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/perfil')}
                                            style={{
                                                padding: '12px 20px',
                                                backgroundColor: '#e2e8f0',
                                                color: '#4a5568',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CambiarPasswordPage;

