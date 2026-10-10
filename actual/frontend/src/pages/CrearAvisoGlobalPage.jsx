import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './css/Dashboards.css';

const CrearAvisoGlobalPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [titulo, setTitulo] = useState('');
    const [contenido, setContenido] = useState('');
    const [prioridad, setPrioridad] = useState('normal');
    const [fechaVencimiento, setFechaVencimiento] = useState('');

    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

    const getAvatarColor = (name) => {
        const colors = [
            '#800020', '#003366', '#1E8449', '#D4AC0D',
            '#7D3C98', '#A04000', '#2E4053', '#117864'
        ];
        const text = name || 'U';
        const index = text.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const getMinDateTimeLocal = () => {
        const now = new Date();
        return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    };

    const getPrioridadPreviewStyle = (prio) => {
        if (prio === 'alta') {
            return {
                borderLeft: '5px solid #dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.05)',
                badgeBg: '#dc3545',
                badgeLabel: 'Alta Prioridad'
            };
        }
        if (prio === 'baja') {
            return {
                borderLeft: '5px solid #28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.05)',
                badgeBg: '#28a745',
                badgeLabel: 'Prioridad Baja'
            };
        }
        return {
            borderLeft: '5px solid #007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
            badgeBg: '#007bff',
            badgeLabel: 'Prioridad Normal'
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMensajeExito('');

        if (!titulo.trim() || !contenido.trim() || !fechaVencimiento) {
            setError('El título, el contenido y la fecha de vencimiento son obligatorios.');
            return;
        }

        const fechaSeleccionada = new Date(fechaVencimiento);
        if (Number.isNaN(fechaSeleccionada.getTime()) || fechaSeleccionada <= new Date()) {
            setError('La fecha y hora de vencimiento debe ser posterior al momento actual.');
            return;
        }

        setEnviando(true);
        try {
            const response = await api.post('/avisos', {
                titulo: titulo.trim(),
                contenido: contenido.trim(),
                prioridad,
                fecha_vencimiento: fechaVencimiento
            });

            setMensajeExito(response.data?.message || 'Aviso global publicado exitosamente.');
            setTitulo('');
            setContenido('');
            setPrioridad('normal');
            setFechaVencimiento('');

            setTimeout(() => {
                navigate('/admin/avisos');
            }, 1400);
        } catch (err) {
            console.error('Error al publicar aviso global:', err);
            const msg =
                err.response?.data?.message ||
                err.response?.data?.mensaje ||
                err.message ||
                'No se pudo publicar el aviso global.';
            setError(msg);
        } finally {
            setEnviando(false);
        }
    };

    const previewStyle = getPrioridadPreviewStyle(prioridad);

    return (
        <div className="web-dashboard">
            {/* NAVBAR SUPERIOR */}
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">Sistema de Clubs</span>
                </div>
                <div className="nav-right">
                    <div className="profile-container">
                        <span className="profile-greeting">
                            Hola,{' '}
                            <span className="user-name-highlight">
                                {user?.nombres || 'Administrador'}
                            </span>
                        </span>
                        <div
                            className="profile-bubble"
                            style={{ backgroundColor: getAvatarColor(user?.nombres) }}
                            onClick={() => navigate('/perfil')}
                            title="Configurar Perfil"
                            role="button"
                        >
                            {(user?.nombres || 'A').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            {/* LAYOUT CON SIDEBAR Y CONTENIDO */}
            <div className="dashboard-layout">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                <main className="admin-main-scroll" style={{ backgroundColor: '#f4f6f8' }}>
                    <div
                        className="page-header"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            marginBottom: '24px'
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    margin: '0 0 4px 0',
                                    color: '#800020',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em'
                                }}
                            >
                                Comunicación Institucional
                            </p>
                            <h2 style={{ margin: 0, color: '#003366' }}>🌍 Crear Aviso Global</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#555' }}>
                                Publica un comunicado oficial visible para todos los usuarios y clubes de la plataforma.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/admin/avisos')}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid #003366',
                                background: '#ffffff',
                                color: '#003366',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            ← Volver a Gestión de Avisos
                        </button>
                    </div>

                    {error && <div className="message-banner error" style={{ marginBottom: '20px' }}>{error}</div>}
                    {mensajeExito && (
                        <div className="message-banner success" style={{ marginBottom: '20px' }}>
                            ✅ {mensajeExito} Redirigiendo al listado de avisos...
                        </div>
                    )}

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                            gap: '24px',
                            alignItems: 'start'
                        }}
                    >
                        {/* TARJETA DEL FORMULARIO */}
                        <form
                            onSubmit={handleSubmit}
                            style={{
                                background: '#ffffff',
                                borderRadius: '12px',
                                padding: '26px',
                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <h3 style={{ margin: '0 0 18px 0', color: '#003366', fontSize: '1.15rem', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px' }}>
                                Datos del Comunicado Global
                            </h3>

                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', marginBottom: '6px', color: '#1e293b' }}>
                                    Título del Aviso *
                                </label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Ej. Suspensión de actividades deportivas o Convocatoria General"
                                    maxLength={150}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #cbd5e1',
                                        boxSizing: 'border-box',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b' }}>
                                    Nivel de Prioridad *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPrioridad('alta')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: prioridad === 'alta' ? '2px solid #dc3545' : '1px solid #cbd5e1',
                                            background: prioridad === 'alta' ? '#fff5f5' : '#ffffff',
                                            color: prioridad === 'alta' ? '#dc3545' : '#475569',
                                            fontWeight: prioridad === 'alta' ? '700' : '600',
                                            cursor: 'pointer',
                                            fontSize: '0.88rem'
                                        }}
                                    >
                                        <span>🔴</span>
                                        <span>Alta</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPrioridad('normal')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: prioridad === 'normal' ? '2px solid #003366' : '1px solid #cbd5e1',
                                            background: prioridad === 'normal' ? '#f0f5fa' : '#ffffff',
                                            color: prioridad === 'normal' ? '#003366' : '#475569',
                                            fontWeight: prioridad === 'normal' ? '700' : '600',
                                            cursor: 'pointer',
                                            fontSize: '0.88rem'
                                        }}
                                    >
                                        <span>🔵</span>
                                        <span>Normal</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPrioridad('baja')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: prioridad === 'baja' ? '2px solid #28a745' : '1px solid #cbd5e1',
                                            background: prioridad === 'baja' ? '#f0fdf4' : '#ffffff',
                                            color: prioridad === 'baja' ? '#15803d' : '#475569',
                                            fontWeight: prioridad === 'baja' ? '700' : '600',
                                            cursor: 'pointer',
                                            fontSize: '0.88rem'
                                        }}
                                    >
                                        <span>🟢</span>
                                        <span>Baja</span>
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', marginBottom: '6px', color: '#1e293b' }}>
                                    Fecha y Hora de Vencimiento *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={fechaVencimiento}
                                    onChange={(e) => setFechaVencimiento(e.target.value)}
                                    min={getMinDateTimeLocal()}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #cbd5e1',
                                        boxSizing: 'border-box',
                                        fontSize: '0.95rem'
                                    }}
                                />
                                <small style={{ display: 'block', marginTop: '5px', color: '#64748b', fontSize: '0.8rem' }}>
                                    El aviso permanecerá activo y visible en el portal hasta la fecha y hora indicadas.
                                </small>
                            </div>

                            <div style={{ marginBottom: '22px' }}>
                                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', marginBottom: '6px', color: '#1e293b' }}>
                                    Contenido del Aviso *
                                </label>
                                <textarea
                                    rows={5}
                                    value={contenido}
                                    onChange={(e) => setContenido(e.target.value)}
                                    placeholder="Redacta aquí el mensaje completo del aviso global para la comunidad ESCOM..."
                                    maxLength={1000}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #cbd5e1',
                                        boxSizing: 'border-box',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                    {contenido.length} / 1000 caracteres
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/avisos')}
                                    disabled={enviando}
                                    style={{
                                        padding: '11px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={enviando}
                                    style={{
                                        padding: '11px 22px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#003366',
                                        color: '#ffffff',
                                        fontWeight: '700',
                                        cursor: enviando ? 'wait' : 'pointer',
                                        opacity: enviando ? 0.7 : 1,
                                        boxShadow: '0 4px 10px rgba(0, 51, 102, 0.2)'
                                    }}
                                >
                                    {enviando ? 'Publicando...' : '📢 Publicar Aviso Global'}
                                </button>
                            </div>
                        </form>

                        {/* TARJETA DE VISTA PREVIA */}
                        <div
                            style={{
                                background: '#ffffff',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <h3 style={{ margin: '0 0 14px 0', color: '#003366', fontSize: '1.05rem' }}>
                                👁️ Vista Previa del Aviso
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
                                Así se visualizará este comunicado en el listado administrativo y en el tablero de los usuarios:
                            </p>

                            <div
                                style={{
                                    borderRadius: '8px',
                                    padding: '20px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                    borderLeft: previewStyle.borderLeft,
                                    backgroundColor: previewStyle.backgroundColor
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, color: '#003366', fontSize: '1.1rem' }}>
                                        🌍 Aviso Global: {titulo.trim() || 'Título del aviso global'}
                                    </h4>
                                    <span
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '15px',
                                            fontSize: '0.75rem',
                                            color: '#fff',
                                            fontWeight: '700',
                                            background: previewStyle.badgeBg,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {previewStyle.badgeLabel}
                                    </span>
                                </div>

                                <p style={{ margin: '0 0 14px 0', color: '#333', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                    {contenido.trim() || 'El contenido detallado del comunicado aparecerá en este espacio...'}
                                </p>

                                <div
                                    style={{
                                        fontSize: '0.84rem',
                                        color: '#555',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '10px',
                                        borderTop: '1px solid rgba(0,0,0,0.08)',
                                        paddingTop: '10px'
                                    }}
                                >
                                    <span>
                                        <strong>Alcance:</strong> Toda la comunidad
                                    </span>
                                    <span>
                                        <strong>Vence:</strong>{' '}
                                        {fechaVencimiento
                                            ? new Date(fechaVencimiento).toLocaleString('es-MX', {
                                                  dateStyle: 'medium',
                                                  timeStyle: 'short'
                                              })
                                            : 'Pendiente de seleccionar'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CrearAvisoGlobalPage;

