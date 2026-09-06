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
        contactos: [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }] // Mínimo 2 contactos
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [medicalError, setMedicalError] = useState('');
    const [medicalSuccess, setMedicalSuccess] = useState('');
    const [personalError, setPersonalError] = useState('');
    const [personalSuccess, setPersonalSuccess] = useState('');
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
                    contactos: data.ficha_medica?.contactos?.length > 0 ? data.ficha_medica.contactos : [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }]
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
                    contactos: [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }]
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
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleContactChange = (index, field, value) => {
        const newContacts = [...formData.contactos];
        if (field === 'telefono') {
            newContacts[index][field] = value.replace(/\D/g, '').slice(0, 15);
        } else {
            newContacts[index][field] = value;
        }
        setFormData({ ...formData, contactos: newContacts });
    };

    const addContact = () => {
        setFormData({ ...formData, contactos: [...formData.contactos, { nombre: '', telefono: '' }] });
    };

    const removeContact = (index) => {
        // No permitir eliminar si solo quedan 2
        if (formData.contactos.length <= 2) return;
        const newContacts = formData.contactos.filter((_, i) => i !== index);
        setFormData({ ...formData, contactos: newContacts });
    };

    const buildPayload = (type) => {
        const base = originalData || formData;
        if (type === 'personal') {
            return {
                nombres: formData.nombres,
                apellido_paterno: formData.apellido_paterno,
                apellido_materno: formData.apellido_materno,
                tipo_sangre: base.tipo_sangre,
                alergias: base.alergias,
                contactos: base.contactos
            };
        }
        if (type === 'password') {
            return {
                nombres: base.nombres,
                apellido_paterno: base.apellido_paterno,
                apellido_materno: base.apellido_materno,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
                tipo_sangre: base.tipo_sangre,
                alergias: base.alergias,
                contactos: base.contactos
            };
        }
        return {
            nombres: base.nombres,
            apellido_paterno: base.apellido_paterno,
            apellido_materno: base.apellido_materno,
            tipo_sangre: formData.tipo_sangre,
            alergias: formData.alergias,
            contactos: formData.contactos
        };
    };

    const submitData = async (e, type) => {
        e.preventDefault();
        
        if (type === 'password') {
            setPasswordError('');
            setPasswordSuccess('');
        } else if (type === 'personal') {
            setPersonalError('');
            setPersonalSuccess('');
        } else {
            setMedicalError('');
            setMedicalSuccess('');
        }

        if (type === 'password') {
            if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
                setPasswordError('Las contraseñas nuevas no coinciden.');
                return;
            }
            if (formData.newPassword && !formData.currentPassword) {
                setPasswordError('Debes ingresar tu contraseña actual para cambiarla.');
                return;
            }
            if (formData.newPassword && formData.newPassword.length < 8) {
                setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
                return;
            }
            const contactosBase = (originalData || formData).contactos || [];
            const contactosValidos = contactosBase.filter(c => c.nombre?.trim() && c.telefono?.trim());
            if (contactosValidos.length < 2) {
                setPasswordError('Completa primero la sección de datos médicos con al menos 2 contactos de emergencia.');
                return;
            }
        } else if (type === 'personal') {
            if (!formData.nombres || !formData.apellido_paterno) {
                setPersonalError('Los nombres y el apellido paterno son obligatorios.');
                return;
            }
            const contactosBase = (originalData || formData).contactos || [];
            const contactosValidos = contactosBase.filter(c => c.nombre?.trim() && c.telefono?.trim());
            if (contactosValidos.length < 2) {
                setPersonalError('Completa primero la sección de datos médicos con al menos 2 contactos de emergencia.');
                return;
            }
        } else if (type === 'medical') {
            if (formData.contactos.length < 2) {
                setMedicalError('Debes registrar al menos 2 contactos de emergencia.');
                return;
            }
            for (const contacto of formData.contactos) {
                if (!contacto.nombre.trim() || !contacto.telefono.trim()) {
                    setMedicalError('Todos los contactos de emergencia deben tener nombre y teléfono.');
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const payload = buildPayload(type);
            const response = await axios.put(`${API_URL}/auth/perfil`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (type === 'password') {
                setPasswordSuccess(response.data.message);
            } else if (type === 'personal') {
                setPersonalSuccess(response.data.message);
            } else {
                setMedicalSuccess(response.data.message);
            }
            setTieneFicha(true); // Al guardar exitosamente, ya cuenta con ficha
            // Limpiar los campos de contraseña y actualizar la "foto" original para que se oculte el botón
            const updatedData = { ...formData, currentPassword: '', newPassword: '', confirmNewPassword: '' };
            setFormData(updatedData);
            setOriginalData(updatedData);
        } catch (err) {
            console.error("Error al actualizar perfil:", err);
            const errorMsg = err.response?.data?.message || 'Error al actualizar el perfil.';
            if (type === 'password') {
                setPasswordError(errorMsg);
            } else if (type === 'personal') {
                setPersonalError(errorMsg);
            } else {
                setMedicalError(errorMsg);
            }
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

    // Comprueba si hay cambios en la contraseña
    const hasPasswordChanges = formData.currentPassword || formData.newPassword || formData.confirmNewPassword;

    // Comprueba si hay cambios en los datos personales
    const personalFields = ['nombres', 'apellido_paterno', 'apellido_materno'];
    const hasPersonalChanges = originalData && personalFields.some(field => formData[field] !== originalData[field]);

    // Comprueba si hay cambios en los datos médicos
    const medicalFields = [
        'tipo_sangre', 'alergias'
    ];
    const hasMedicalChanges = originalData && (medicalFields.some(field => formData[field] !== originalData[field]) || JSON.stringify(formData.contactos) !== JSON.stringify(originalData.contactos));

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
                            <p className="crear-club-subtitle">Actualiza tu contraseña de acceso y datos médicos.</p>

                            <div className="crear-club-form">
                                <div style={{ display: 'flex', gap: '30px' }}>
                                    {/* Columna Izquierda: Información Personal */}
                                    <div style={{ flex: 1 }}>
                                        <form onSubmit={(e) => submitData(e, 'personal')}>
                                            <h3 style={{ marginBottom: '15px', color: '#003366', fontSize: '1.1rem' }}>Datos Personales</h3>
                                            <div className="form-group"><label>Nombres</label><input type="text" name="nombres" value={formData.nombres || ''} onChange={handleChange} required /></div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div className="form-group" style={{ flex: 1 }}><label>Apellido Paterno</label><input type="text" name="apellido_paterno" value={formData.apellido_paterno || ''} onChange={handleChange} required /></div>
                                                <div className="form-group" style={{ flex: 1 }}><label>Apellido Materno</label><input type="text" name="apellido_materno" value={formData.apellido_materno || ''} onChange={handleChange} /></div>
                                            </div>
                                            <div className="form-group"><label>Correo Electrónico</label><input type="email" name="correo" value={formData.correo || ''} disabled title="El correo institucional no puede modificarse" /></div>
                                            
                                            {hasPersonalChanges ? (
                                                <button type="submit" className="btn-crear-club" disabled={saving} style={{ marginTop: '10px', maxWidth: '300px' }}>{saving ? 'Guardando...' : '💾 Guardar Datos Personales'}</button>
                                            ) : null}
                                            {personalError && <div className="message-banner error" style={{ marginTop: '10px' }}>{personalError}</div>}
                                            {personalSuccess && <div className="message-banner success" style={{ marginTop: '10px' }}>{personalSuccess}</div>}
                                        </form>
                                    </div>

                                    {/* Columna Derecha: Seguridad */}
                                    <div style={{ flex: 1 }}>
                                        <form onSubmit={(e) => submitData(e, 'password')}>
                                        <h3 style={{ marginBottom: '15px', color: '#003366', fontSize: '1.1rem' }}>Seguridad</h3>
                                        <div className="form-group"><label>Contraseña Actual</label><input type="password" name="currentPassword" value={formData.currentPassword || ''} onChange={handleChange} placeholder="Requerida solo si cambiarás de contraseña" /></div>
                                        <div className="form-group"><label>Nueva Contraseña</label><input type="password" name="newPassword" value={formData.newPassword || ''} onChange={handleChange} placeholder="Mínimo 8 caracteres" /></div>
                                        <div className="form-group"><label>Confirmar Nueva Contraseña</label><input type="password" name="confirmNewPassword" value={formData.confirmNewPassword || ''} onChange={handleChange} placeholder="Repite la nueva contraseña" /></div>
                                        {hasPasswordChanges ? (
                                            <button type="submit" className="btn-crear-club" disabled={saving} style={{ marginTop: '10px', maxWidth: '300px' }}>{saving ? 'Guardando...' : '💾 Guardar Contraseña'}</button>
                                        ) : null}
                                        {passwordError && <div className="message-banner error" style={{ marginTop: '10px' }}>{passwordError}</div>}
                                        {passwordSuccess && <div className="message-banner success" style={{ marginTop: '10px' }}>{passwordSuccess}</div>}
                                        </form>
                                    </div>
                                </div>
                                
                                <hr style={{ margin: '30px 0', borderColor: '#e1e5eb' }} />
                                
                                <form onSubmit={(e) => submitData(e, 'medical')}>
                                <h3 style={{ marginBottom: '20px', color: '#003366', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🏥 Datos Médicos y de Emergencia
                                    {tieneFicha ? (
                                        <span style={{ fontSize: '0.8rem', background: '#d4edda', color: '#155724', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>✓ Información Cargada</span>
                                    ) : (
                                        <span style={{ fontSize: '0.8rem', background: '#fff3cd', color: '#856404', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>⚠️ Sin Registro Previo</span>
                                    )}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Tipo de Sangre</label>
                                        <select name="tipo_sangre" value={formData.tipo_sangre || ''} onChange={handleChange}>
                                            <option value="">Selecciona una opción</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Alergias</label><input type="text" name="alergias" value={formData.alergias || ''} onChange={handleChange} placeholder="Ninguna / Penicilina, etc." /></div>
                                </div>

                                {formData.contactos.map((contacto, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '15px', padding: '15px', border: '1px solid #e1e5eb', borderRadius: '8px' }}>
                                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                            <label>Contacto de Emergencia #{index + 1} (Nombre)</label>
                                            <input type="text" value={contacto.nombre} onChange={(e) => handleContactChange(index, 'nombre', e.target.value)} required />
                                        </div>
                                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                            <label>Contacto de Emergencia #{index + 1} (Teléfono)</label>
                                            <input type="text" value={contacto.telefono} onChange={(e) => handleContactChange(index, 'telefono', e.target.value)} required />
                                        </div>
                                        {formData.contactos.length > 2 && (
                                            <button type="button" onClick={() => removeContact(index)} style={{ padding: '10px', background: '#fce8e6', color: '#e53935', border: 'none', borderRadius: '5px', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: '5px' }} title="Eliminar contacto">
                                                ✖
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addContact}
                                    style={{ display: 'inline-block', padding: '8px 12px', background: '#e1e5eb', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' }}
                                >
                                    ➕ Agregar otro contacto
                                </button>

                                {/* El botón y la línea solo aparecen si hasMedicalChanges es true */}
                                {hasMedicalChanges && (
                                    <>
                                        <hr style={{ margin: '25px 0', borderColor: '#e1e5eb' }} />
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button type="submit" className="btn-crear-club" disabled={saving} style={{ marginTop: '0', maxWidth: '300px' }}>{saving ? 'Guardando...' : '💾 Guardar Datos Médicos'}</button>
                                        </div>
                                    </>
                                )}
                                {medicalError && <div className="message-banner error" style={{ marginTop: '15px' }}>{medicalError}</div>}
                                {medicalSuccess && <div className="message-banner success" style={{ marginTop: '15px' }}>{medicalSuccess}</div>}
                                </form>
                            </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PerfilPage;