import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './css/Dashboards.css';
import './css/AdminPoliticas.css';

const AdminPoliticasPage = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [estadisticas, setEstadisticas] = useState(null);
    const [versiones, setVersiones] = useState([]);
    const [versionVigente, setVersionVigente] = useState('1.0');

    // Estado del formulario de nueva versión
    const [nuevaVersion, setNuevaVersion] = useState('');
    const [nuevoTitulo, setNuevoTitulo] = useState('');
    const [nuevoResumen, setNuevoResumen] = useState('');
    const [publicando, setPublicando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [errorForm, setErrorForm] = useState('');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/politicas/admin/estadisticas');
            setEstadisticas(res.data.estadisticas);
            setVersiones(res.data.versiones || []);
            setVersionVigente(res.data.version_vigente || '1.0');
        } catch (error) {
            console.error('Error al cargar datos de políticas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handlePublicarNuevaVersion = async (e) => {
        e.preventDefault();

        if (!nuevaVersion.trim() || !nuevoTitulo.trim() || !nuevoResumen.trim()) {
            setErrorForm('Por favor completa todos los campos para publicar la nueva versión.');
            return;
        }

        const confirmacion = window.confirm(
            `⚠️ ATENCIÓN: ¿Estás seguro de publicar la versión ${nuevaVersion}?\n\n` +
            `Esta acción emitirá una notificación de actualización a todos los usuarios de la plataforma.`
        );

        if (!confirmacion) return;

        setPublicando(true);
        setErrorForm('');
        setMensajeExito('');

        try {
            const res = await api.post('/politicas/actualizar-version', {
                version: nuevaVersion.trim(),
                titulo: nuevoTitulo.trim(),
                resumen_cambios: nuevoResumen.trim()
            });

            setMensajeExito(res.data.message || 'Nueva versión publicada y alerta enviada exitosamente.');
            setNuevaVersion('');
            setNuevoTitulo('');
            setNuevoResumen('');

            // Recargar datos y estadísticas
            await cargarDatos();
        } catch (err) {
            console.error('Error al publicar nueva versión:', err);
            setErrorForm(err.response?.data?.message || err.message || 'Error al publicar la nueva versión.');
        } finally {
            setPublicando(false);
        }
    };

    return (
        <div className="web-dashboard">
            {/* Barra superior de navegación */}
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left">
                    <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                    <span className="nav-title">Sistema de Clubs</span>
                </div>
                <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            backgroundColor: '#800020', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                        }}>
                            {user?.nombres?.[0] || 'A'}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                            {user?.nombres} ({user?.role_id === 1 ? 'Administrador' : 'Usuario'})
                        </span>
                    </div>
                    <button onClick={logout} className="logout-button-nav">Cerrar Sesión</button>
                </div>
            </header>

            {/* Menú lateral */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Contenido principal */}
            <main className="dashboard-content" style={{ marginTop: '70px', padding: '24px' }}>
                <div className="admin-politicas-container">
                    <header className="admin-politicas-header">
                        <h1>Gestión de Aviso de Privacidad y Términos</h1>
                        <p>
                            Administración centralizada de versiones legales y emisión de notificaciones de actualización para los usuarios de la plataforma.
                        </p>
                    </header>

                    {/* Métricas clave (3 tarjetas en escritorio) */}
                    <div className="politicas-metrics-grid">
                        <div className="politica-metric-card">
                            <span className="metric-label">Versión Vigente</span>
                            <span className="metric-value" style={{ color: '#003366' }}>v{versionVigente}</span>
                            <span className="metric-subtext">Actualmente requerida a todos los usuarios</span>
                        </div>

                        <div className="politica-metric-card">
                            <span className="metric-label">Aceptaciones Totales</span>
                            <span className="metric-value" style={{ color: '#16a34a' }}>
                                {estadisticas ? estadisticas.usuarios_al_dia : '...'}
                            </span>
                            <span className="metric-subtext">
                                de {estadisticas ? estadisticas.total_usuarios : '...'} usuarios registrados
                            </span>
                            <div className="progress-bar-container">
                                <div 
                                    className="progress-bar-fill" 
                                    style={{ width: `${estadisticas?.porcentaje_cumplimiento || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="politica-metric-card">
                            <span className="metric-label">Usuarios Pendientes</span>
                            <span className="metric-value" style={{ color: '#d97706' }}>
                                {estadisticas ? estadisticas.usuarios_pendientes : '...'}
                            </span>
                            <span className="metric-subtext">Bloqueados hasta aceptar la nueva versión</span>
                        </div>
                    </div>

                    {/* Formulario de publicación de nueva versión */}
                    <div className="politica-card">
                        <h3 className="politica-card-title">
                            📢 Publicar Nueva Versión Legal
                        </h3>

                        <div className="aviso-alerta-box">
                            <strong>⚠️ Impacto en la plataforma:</strong> Al guardar, el servidor emitirá una notificación inmediata a los usuarios solicitando la ratificación del aviso de privacidad antes de continuar utilizando el sistema.
                        </div>

                        {mensajeExito && (
                            <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600', fontSize: '13.5px' }}>
                                ✓ {mensajeExito}
                            </div>
                        )}

                        {errorForm && (
                            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600', fontSize: '13.5px' }}>
                                ⚠️ {errorForm}
                            </div>
                        )}

                        <form onSubmit={handlePublicarNuevaVersion}>
                            <div className="form-group-politica">
                                <label htmlFor="input-version">Identificador de Versión (ej. 1.2 o 2.0):</label>
                                <input 
                                    id="input-version"
                                    type="text" 
                                    placeholder="Ej. 1.2"
                                    value={nuevaVersion}
                                    onChange={(e) => setNuevaVersion(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group-politica">
                                <label htmlFor="input-titulo">Título Descriptivo de la Actualización:</label>
                                <input 
                                    id="input-titulo"
                                    type="text" 
                                    placeholder="Ej. Actualización de Medidas de Seguridad y Derechos ARCO 2026"
                                    value={nuevoTitulo}
                                    onChange={(e) => setNuevoTitulo(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group-politica">
                                <label htmlFor="input-resumen">Resumen Explicativo de Cambios (se mostrará a los alumnos):</label>
                                <textarea 
                                    id="input-resumen"
                                    placeholder="Describe brevemente las cláusulas modificadas, nuevos procedimientos o motivos de la actualización..."
                                    value={nuevoResumen}
                                    onChange={(e) => setNuevoResumen(e.target.value)}
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="btn-publicar-version"
                                disabled={publicando}
                            >
                                {publicando ? 'Publicando y Notificando...' : '📢 Publicar y Notificar a Todos los Usuarios'}
                            </button>
                        </form>
                    </div>

                    {/* Tabla de versiones históricas */}
                    <div className="tabla-politicas-container">
                        <h3 className="politica-card-title">
                            📜 Historial de Versiones Publicadas
                        </h3>
                        {versiones.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '14px' }}>No hay versiones registradas aún.</p>
                        ) : (
                            <table className="tabla-politicas">
                                <thead>
                                    <tr>
                                        <th>Versión</th>
                                        <th>Título</th>
                                        <th>Resumen de Cambios</th>
                                        <th>Fecha de Publicación</th>
                                        <th>Estatus</th>
                                        <th>Publicado Por</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {versiones.map((v) => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: '700', color: '#003366' }}>v{v.version}</td>
                                            <td style={{ fontWeight: '600' }}>{v.titulo}</td>
                                            <td style={{ maxWidth: '300px', fontSize: '13px', color: '#475569' }}>
                                                {v.resumen_cambios}
                                            </td>
                                            <td>
                                                {new Date(v.fecha_publicacion).toLocaleString('es-MX', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                })}
                                            </td>
                                            <td>
                                                {v.activo === 1 ? (
                                                    <span className="badge-version-activa">Vigente (Activa)</span>
                                                ) : (
                                                    <span className="badge-version-historica">Histórica</span>
                                                )}
                                            </td>
                                            <td>{v.autor || 'Sistema'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPoliticasPage;
