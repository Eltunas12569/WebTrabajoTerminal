import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css'; // Importamos el CSS del Dashboard principal
import './css/CrearClubPage.css'; // Reutilizamos este CSS para el contenedor de tarjeta

const PerfilPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [originalData, setOriginalData] = useState(null);
    const [formData, setFormData] = useState({
        // Pre-llenamos con la información de la sesión actual por si el backend tarda
        nombres: user?.nombres || '',
        apellido_paterno: user?.apellido_paterno || (user?.apellidos ? user.apellidos.split(' ')[0] : ''),
        apellido_materno: user?.apellido_materno || (user?.apellidos ? user.apellidos.split(' ').slice(1).join(' ') : ''),
        correo: user?.correo || '',
        tipo_sangre: '',
        alergias: '',
        contactos: [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }] // Mínimo 2 contactos
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [medicalError, setMedicalError] = useState('');
    const [medicalSuccess, setMedicalSuccess] = useState('');
    const [personalError, setPersonalError] = useState('');
    const [personalSuccess, setPersonalSuccess] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [tieneFicha, setTieneFicha] = useState(false);

    useEffect(() => {
        const fetchPerfil = async () => {
            try {
                const response = await api.get('/auth/perfil');
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
                    tipo_sangre: data.ficha_medica?.tipo_sangre || '',
                    alergias: data.ficha_medica?.alergias || '',
                    contactos: data.ficha_medica?.contactos?.length > 0 
                        ? data.ficha_medica.contactos.map(c => ({ nombre: c.nombre || '', telefono: c.telefono || '' }))
                        : [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }]
                };
                setFormData(JSON.parse(JSON.stringify(loadedData)));
                setOriginalData(JSON.parse(JSON.stringify(loadedData))); // Guardamos la "foto" original profunda
            } catch (err) {
                console.error("Error al cargar perfil:", err);
                // Si falla, aseguramos que al menos se vean los datos de la sesión
                const fallbackData = {
                    nombres: user?.nombres || '',
                    apellido_paterno: user?.apellido_paterno || (user?.apellidos ? user.apellidos.split(' ')[0] : ''),
                    apellido_materno: user?.apellido_materno || (user?.apellidos ? user.apellidos.split(' ').slice(1).join(' ') : ''),
                    correo: user?.correo || '',
                    tipo_sangre: '',
                    alergias: '',
                    contactos: [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }]
                };
                setFormData(JSON.parse(JSON.stringify(fallbackData)));
                setOriginalData(JSON.parse(JSON.stringify(fallbackData))); // Guardamos la "foto" original profunda
            } finally {
                setLoading(false);
            }
        };
        fetchPerfil();
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleContactChange = (index, field, value) => {
        const val = field === 'telefono' ? value.replace(/\D/g, '').slice(0, 15) : value;
        setFormData(prev => ({
            ...prev,
            contactos: prev.contactos.map((contacto, i) => {
                if (i === index) {
                    return { ...contacto, [field]: val };
                }
                return { ...contacto };
            })
        }));
    };

    const addContact = () => {
        setFormData(prev => ({
            ...prev,
            contactos: [...prev.contactos.map(c => ({ ...c })), { nombre: '', telefono: '' }]
        }));
    };

    const removeContact = (index) => {
        // No permitir eliminar si solo quedan 2
        if (formData.contactos.length <= 2) return;
        setFormData(prev => ({
            ...prev,
            contactos: prev.contactos.filter((_, i) => i !== index).map(c => ({ ...c }))
        }));
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
        
        if (type === 'personal') {
            setPersonalError('');
            setPersonalSuccess('');
        } else {
            setMedicalError('');
            setMedicalSuccess('');
        }

        if (type === 'personal') {
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
            const response = await api.put('/auth/perfil', payload);
            
            if (type === 'personal') {
                setPersonalSuccess(response.data.message);
            } else {
                setMedicalSuccess(response.data.message);
            }
            setTieneFicha(true); // Al guardar exitosamente, ya cuenta con ficha
            setOriginalData(JSON.parse(JSON.stringify(formData)));
        } catch (err) {
            console.error("Error al actualizar perfil:", err);
            const errorMsg = err.response?.data?.message || 'Error al actualizar el perfil.';
            if (type === 'personal') {
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

    // Comprueba si hay cambios en los datos personales
    const personalFields = ['nombres', 'apellido_paterno', 'apellido_materno'];
    const hasPersonalChanges = Boolean(originalData && personalFields.some(field => (formData[field] || '') !== (originalData[field] || '')));

    // Comprueba si hay cambios en los datos médicos o en los contactos de emergencia
    const medicalFields = ['tipo_sangre', 'alergias'];
    const hasMedicalFieldsChanged = Boolean(originalData && medicalFields.some(field => (formData[field] || '') !== (originalData[field] || '')));
    const hasContactsChanged = Boolean(originalData && JSON.stringify(formData.contactos) !== JSON.stringify(originalData.contactos));
    const hasMedicalChanges = hasMedicalFieldsChanged || hasContactsChanged;

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
                            <li onClick={() => navigate('/cambiar-password')}>🔑 Cambiar Contraseña</li>
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
                            <p className="crear-club-subtitle">Actualiza tu información personal y datos médicos.</p>

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

                                    {/* Columna Derecha: Seguridad y Contraseña */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            border: '1px solid #e1e5eb',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            backgroundColor: '#f8fafc',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            height: '100%',
                                            boxSizing: 'border-box'
                                        }}>
                                            <div>
                                                <h3 style={{ marginBottom: '10px', color: '#003366', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    🔒 Seguridad de la Cuenta
                                                </h3>
                                                <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '15px', lineHeight: '1.5' }}>
                                                    Gestiona tu contraseña de acceso de forma segura en un módulo dedicado.
                                                </p>
                                                <div style={{
                                                    backgroundColor: '#e8f0fe',
                                                    borderLeft: '4px solid #1a73e8',
                                                    padding: '12px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    color: '#1a73e8',
                                                    marginBottom: '20px'
                                                }}>
                                                    ℹ️ Para proteger tu cuenta institucional, se recomienda utilizar una contraseña robusta de al menos 8 caracteres y no compartirla.
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/cambiar-password')}
                                                    className="btn-crear-club"
                                                    style={{ width: '100%', marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                >
                                                    🔑 Cambiar mi Contraseña →
                                                </button>
                                            </div>
                                        </div>
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
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <button type="submit" className="btn-crear-club" disabled={saving} style={{ marginTop: '0', maxWidth: '350px' }}>
                                                {saving ? 'Guardando...' : (hasContactsChanged && !hasMedicalFieldsChanged ? '💾 Guardar Contactos de Emergencia' : '💾 Guardar Datos Médicos y Contactos')}
                                            </button>
                                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                                {hasContactsChanged ? '⚠️ Tienes modificaciones pendientes en tus contactos de emergencia.' : '⚠️ Tienes modificaciones pendientes en tus datos médicos.'}
                                            </span>
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