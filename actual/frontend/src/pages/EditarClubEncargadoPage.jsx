import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './css/Dashboards.css';

const parseCronogramaSeguro = (raw) => {
    if (!raw) return [{ mes: '', actividad: '' }];
    try {
        let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(item => ({
                mes: item?.mes || '',
                actividad: item?.actividad || ''
            }));
        }
    } catch (e) {
        // Ignorar error de parseo y devolver fila inicial vacía
    }
    return [{ mes: '', actividad: '' }];
};

const EditarClubEncargadoPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // 1. Estados de verificación inmediata de rol al entrar a la ventana
    const [verificandoRol, setVerificandoRol] = useState(true);
    const [rolAutorizado, setRolAutorizado] = useState(false);
    const [rolEnClub, setRolEnClub] = useState(null);
    const [errorAcceso, setErrorAcceso] = useState('');

    // 2. Estados de información del club (sin nombre editable ni encargados)
    const [club, setClub] = useState(null);
    const [formData, setFormData] = useState({
        descripcion: '',
        objetivo: '',
        espacios_tiempos: '',
        impacto: '',
        detalle_actividades: ''
    });
    const [cronograma, setCronograma] = useState([{ mes: '', actividad: '' }]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Lo primero que ejecuta la ventana al entrar es verificar el rol del usuario en este club
    useEffect(() => {
        let cancelado = false;

        const verificarRolYCargarDatos = async () => {
            setVerificandoRol(true);
            setRolAutorizado(false);
            setErrorAcceso('');

            if (!user?.id) {
                if (!cancelado) {
                    setErrorAcceso('No se encontró una sesión activa para verificar tu rol.');
                    setVerificandoRol(false);
                }
                return;
            }

            const rolGlobal = Number(user.role_id || user.rol);
            if (![2, 3, 4].includes(rolGlobal)) {
                if (!cancelado) {
                    setErrorAcceso('Acceso denegado. Esta ventana es exclusiva para los encargados del club.');
                    setVerificandoRol(false);
                }
                return;
            }

            try {
                // Paso 1: Verificar en el servidor que el usuario sea encargado activo de este club
                const userClubsRes = await api.get(`/clubes/user/${user.id}`);
                const miRegistro = (userClubsRes.data || []).find(c => String(c.id) === String(id));
                const rolInterno = miRegistro?.mi_rol_interno || miRegistro?.rol_en_club;
                const esEncargadoActivo = Boolean(
                    miRegistro &&
                    ['encargado_profesor', 'encargado_alumno'].includes(rolInterno) &&
                    miRegistro.inscripcion_estatus === 'activo'
                );

                if (!esEncargadoActivo) {
                    if (!cancelado) {
                        setRolAutorizado(false);
                        setErrorAcceso('Acceso restringido. Solo el Profesor Encargado o el Alumno Encargado activos de este club tienen permiso para modificar su información.');
                        setVerificandoRol(false);
                    }
                    return;
                }

                // Paso 2: Una vez confirmado el rol de encargado, inicializar los datos del formulario
                if (!cancelado) {
                    setRolEnClub(rolInterno);
                    setRolAutorizado(true);
                    setClub(miRegistro);
                    setFormData({
                        descripcion: miRegistro.descripcion || '',
                        objetivo: miRegistro.objetivo || '',
                        espacios_tiempos: miRegistro.espacios_tiempos || '',
                        impacto: miRegistro.impacto || '',
                        detalle_actividades: miRegistro.detalle_actividades || ''
                    });
                    setCronograma(parseCronogramaSeguro(miRegistro.cronograma));
                }
            } catch (err) {
                console.error('Error al verificar rol de encargado:', err);
                if (!cancelado) {
                    setErrorAcceso('No fue posible verificar tus permisos de encargado en este momento.');
                }
            } finally {
                if (!cancelado) {
                    setVerificandoRol(false);
                }
            }
        };

        verificarRolYCargarDatos();

        return () => {
            cancelado = true;
        };
    }, [id, user]);

    const handleCronogramaChange = (index, field, value) => {
        const actualizado = [...cronograma];
        actualizado[index][field] = value;
        setCronograma(actualizado);
    };

    const handleAddCronogramaRow = () => {
        setCronograma([...cronograma, { mes: '', actividad: '' }]);
    };

    const handleRemoveCronogramaRow = (index) => {
        if (cronograma.length <= 1) return;
        setCronograma(cronograma.filter((_, idx) => idx !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rolAutorizado || !club) return;

        setError('');
        setSuccess('');

        const filasCronogramaValidas = cronograma.filter(
            item => item.mes.trim() !== '' || item.actividad.trim() !== ''
        );

        if (filasCronogramaValidas.some(item => !item.mes.trim() || !item.actividad.trim())) {
            setError('Completa tanto el mes como la actividad en cada fila del cronograma, o elimina las filas incompletas.');
            return;
        }

        setSaving(true);
        try {
            await api.put(`/clubes/${id}`, {
                nombre: club.nombre,
                descripcion: formData.descripcion.trim(),
                objetivo: formData.objetivo.trim(),
                espacios_tiempos: formData.espacios_tiempos.trim(),
                impacto: formData.impacto.trim(),
                detalle_actividades: formData.detalle_actividades.trim(),
                cronograma: JSON.stringify(filasCronogramaValidas),
                nuevo_profesor_id: club.profesor_encargado_id,
                nuevo_alumno_id: club.alumno_encargado_id
            });

            setSuccess('La información del club se actualizó correctamente.');
            setTimeout(() => {
                navigate(`/club/${id}`);
            }, 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar los cambios del club.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '11px 14px',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        fontSize: '0.94rem',
        color: '#0f172a',
        fontFamily: 'inherit',
        lineHeight: '1.5',
        boxSizing: 'border-box',
        outline: 'none'
    };

    const labelStyle = {
        display: 'block',
        fontWeight: '700',
        fontSize: '0.88rem',
        color: '#1e293b',
        marginBottom: '6px'
    };

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed">
                <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="menu-toggle" onClick={toggleSidebar} title="Abrir Menú Lateral">☰</button>
                    <span className="nav-title">Sistema de Clubs</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">Hola, <strong>{user?.nombres}</strong></span>
                        <div
                            className="profile-bubble"
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
                            {user?.nombres?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    esEncargado={rolAutorizado}
                />

                <main className="admin-main-scroll" style={{ backgroundColor: '#f0f2f5', padding: '28px 32px' }}>
                    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
                        {/* ESTADO 1: VERIFICANDO ROL INMEDIATAMENTE AL ENTRAR */}
                        {verificandoRol ? (
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '56px 32px',
                                textAlign: 'center',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)'
                            }}>
                                <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🛡️</div>
                                <h2 style={{ margin: '0 0 8px 0', color: '#003366', fontSize: '1.35rem', fontWeight: '800' }}>
                                    Verificando rol de encargado...
                                </h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                                    Comprobando tus permisos de acceso en este club antes de cargar el formulario.
                                </p>
                            </div>
                        ) : !rolAutorizado ? (
                            /* ESTADO 2: ROL NO AUTORIZADO */
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #fecaca',
                                borderTop: '5px solid #dc2626',
                                padding: '44px 32px',
                                textAlign: 'center',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
                                <h2 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '1.35rem', fontWeight: '800' }}>
                                    Permisos Insuficientes
                                </h2>
                                <p style={{ margin: '0 auto 24px auto', maxWidth: '560px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                    {errorAcceso}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/club/${id}`)}
                                    style={{
                                        padding: '10px 22px',
                                        backgroundColor: '#003366',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        fontSize: '0.92rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ← Volver al Club
                                </button>
                            </div>
                        ) : (
                            /* ESTADO 3: ROL VERIFICADO -> FORMULARIO DE EDICIÓN */
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ height: '6px', background: 'linear-gradient(90deg, #003366 0%, #800020 50%, #00509e 100%)' }} />

                                <form onSubmit={handleSubmit} style={{ padding: '30px 36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Cabecera con nombre fijo del club y rol verificado */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                        borderBottom: '1px solid #eef2f6',
                                        paddingBottom: '16px'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <h1 style={{ margin: 0, fontSize: '1.45rem', color: '#003366', fontWeight: '800' }}>
                                                    {club?.nombre}
                                                </h1>
                                                <span style={{
                                                    fontSize: '0.78rem',
                                                    backgroundColor: '#dcfce7',
                                                    color: '#166534',
                                                    padding: '4px 10px',
                                                    borderRadius: '999px',
                                                    fontWeight: '700'
                                                }}>
                                                    ✓ {rolEnClub === 'encargado_profesor' ? 'Profesor Encargado' : 'Alumno Encargado'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => navigate(`/club/${id}`)}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: '#f1f5f9',
                                                color: '#334155',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontWeight: '700',
                                                fontSize: '0.88rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ← Volver
                                        </button>
                                    </div>

                                    {error && (
                                        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                            ✅ {success}
                                        </div>
                                    )}

                                    {/* Fila 1: Descripción y Objetivo */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                                        <div>
                                            <label style={labelStyle}>Descripción</label>
                                            <textarea
                                                rows="3"
                                                value={formData.descripcion}
                                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                                style={{ ...inputStyle, resize: 'vertical' }}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Objetivo</label>
                                            <textarea
                                                rows="3"
                                                value={formData.objetivo}
                                                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                                                style={{ ...inputStyle, resize: 'vertical' }}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Fila 2: Espacios/Horarios e Impacto */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                                        <div>
                                            <label style={labelStyle}>Espacios y Horarios</label>
                                            <textarea
                                                rows="2"
                                                value={formData.espacios_tiempos}
                                                onChange={(e) => setFormData({ ...formData, espacios_tiempos: e.target.value })}
                                                style={{ ...inputStyle, resize: 'vertical' }}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Impacto</label>
                                            <textarea
                                                rows="2"
                                                value={formData.impacto}
                                                onChange={(e) => setFormData({ ...formData, impacto: e.target.value })}
                                                style={{ ...inputStyle, resize: 'vertical' }}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Fila 3: Detalle de Actividades */}
                                    <div>
                                        <label style={labelStyle}>Detalle de Actividades</label>
                                        <textarea
                                            rows="3"
                                            value={formData.detalle_actividades}
                                            onChange={(e) => setFormData({ ...formData, detalle_actividades: e.target.value })}
                                            style={{ ...inputStyle, resize: 'vertical' }}
                                            required
                                        />
                                    </div>

                                    {/* Fila 4: Cronograma de Actividades */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <label style={{ ...labelStyle, marginBottom: 0 }}>Cronograma de Actividades</label>
                                            <button
                                                type="button"
                                                onClick={handleAddCronogramaRow}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#eff6ff',
                                                    color: '#003366',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ➕ Agregar actividad
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {cronograma.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: cronograma.length > 1 ? '220px 1fr 38px' : '220px 1fr',
                                                        gap: '10px',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        placeholder="Mes / Período"
                                                        value={item.mes}
                                                        onChange={(e) => handleCronogramaChange(idx, 'mes', e.target.value)}
                                                        style={inputStyle}
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Actividad programada"
                                                        value={item.actividad}
                                                        onChange={(e) => handleCronogramaChange(idx, 'actividad', e.target.value)}
                                                        style={inputStyle}
                                                        required
                                                    />
                                                    {cronograma.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCronogramaRow(idx)}
                                                            style={{
                                                                height: '40px',
                                                                backgroundColor: '#fef2f2',
                                                                color: '#dc2626',
                                                                border: '1px solid #fecaca',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                fontWeight: '700'
                                                            }}
                                                            title="Eliminar fila"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Barra inferior de acciones */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: '12px',
                                        paddingTop: '18px',
                                        borderTop: '1px solid #eef2f6',
                                        marginTop: '4px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/club/${id}`)}
                                            style={{
                                                padding: '11px 22px',
                                                backgroundColor: '#f1f5f9',
                                                color: '#334155',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontWeight: '700',
                                                fontSize: '0.92rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            style={{
                                                padding: '11px 26px',
                                                backgroundColor: '#003366',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: '700',
                                                fontSize: '0.92rem',
                                                cursor: saving ? 'wait' : 'pointer',
                                                boxShadow: '0 4px 12px rgba(0, 51, 102, 0.2)'
                                            }}
                                        >
                                            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
        </div>
    );
};

export default EditarClubEncargadoPage;

