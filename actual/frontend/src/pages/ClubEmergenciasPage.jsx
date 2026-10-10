import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';
import './css/ClubEmergencias.css';

const ClubEmergenciasPage = () => {
    const { id: clubId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [club, setClub] = useState(null);
    const [miembros, setMiembros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorAcceso, setErrorAcceso] = useState('');
    const [telefonoCopiado, setTelefonoCopiado] = useState('');

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroSangre, setFiltroSangre] = useState('todos');
    const [filtroAlergias, setFiltroAlergias] = useState('todos');
    const [filtroContactos, setFiltroContactos] = useState('todos');
    const [filtroRol, setFiltroRol] = useState('todos');
    const [modalKpiTipo, setModalKpiTipo] = useState(null); // 'alergias' | 'sin_contactos' | null

    const esAdmin = Number(user?.role_id) === 1 || Number(user?.rol) === 1;

    useEffect(() => {
        const fetchEmergencias = async () => {
            if (!user?.id || !clubId) return;
            setLoading(true);
            setErrorAcceso('');

            try {
                const res = await api.get(`/clubes/${clubId}/emergencias`);
                setClub(res.data.club);
                setMiembros(res.data.miembros || []);
            } catch (err) {
                console.error("Error al cargar emergencias:", err);
                if (err.response?.status === 403) {
                    setErrorAcceso("Acceso denegado. Esta información es confidencial y solo está disponible para los encargados de este club y el administrador.");
                } else if (err.response?.status === 404) {
                    setErrorAcceso("El club especificado no fue encontrado.");
                } else {
                    setErrorAcceso("Ocurrió un error al cargar la información médica y de emergencia.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchEmergencias();
    }, [user, clubId]);

    const handleCopiar = (tel) => {
        if (!tel) return;
        navigator.clipboard.writeText(tel);
        setTelefonoCopiado(tel);
        setTimeout(() => setTelefonoCopiado(''), 2000);
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroSangre('todos');
        setFiltroAlergias('todos');
        setFiltroContactos('todos');
        setFiltroRol('todos');
    };

    // Listas específicas para modales de KPIs
    const miembrosConAlergias = useMemo(() => {
        return miembros.filter(m => m.alergias && m.alergias.trim() && m.alergias.trim().toLowerCase() !== 'ninguna');
    }, [miembros]);

    const miembrosSinContactos = useMemo(() => {
        return miembros.filter(m => !m.contactos || m.contactos.length === 0);
    }, [miembros]);

    // Métricas para los KPIs
    const kpiData = useMemo(() => {
        const total = miembros.length;
        const conAlergias = miembrosConAlergias.length;
        const sinContactos = miembrosSinContactos.length;
        return { total, conAlergias, sinContactos };
    }, [miembros.length, miembrosConAlergias.length, miembrosSinContactos.length]);

    // Filtrado interactivo
    const miembrosFiltrados = useMemo(() => {
        return miembros.filter(m => {
            // Filtro por texto de búsqueda
            if (busqueda.trim()) {
                const query = busqueda.toLowerCase().trim();
                const coincideNombre = (m.nombre_completo || '').toLowerCase().includes(query);
                const coincideBoleta = (m.boleta || '').toLowerCase().includes(query);
                const coincideEmpleado = (m.num_empleado || '').toLowerCase().includes(query);
                const coincideTelefono = (m.telefono || '').toLowerCase().includes(query);
                const coincideAlergias = (m.alergias || '').toLowerCase().includes(query);
                const coincideContacto = m.contactos?.some(c => 
                    (c.nombre || '').toLowerCase().includes(query) || 
                    (c.telefono || '').toLowerCase().includes(query) ||
                    (c.parentesco || '').toLowerCase().includes(query)
                );

                if (!coincideNombre && !coincideBoleta && !coincideEmpleado && !coincideTelefono && !coincideAlergias && !coincideContacto) {
                    return false;
                }
            }

            // Filtro por tipo de sangre
            if (filtroSangre !== 'todos') {
                if (filtroSangre === 'sin_especificar') {
                    if (m.tipo_sangre && m.tipo_sangre.trim()) return false;
                } else {
                    if ((m.tipo_sangre || '').trim().toUpperCase() !== filtroSangre.toUpperCase()) return false;
                }
            }

            // Filtro por alergias / condiciones
            if (filtroAlergias === 'con_alergias') {
                if (!m.alergias || !m.alergias.trim() || m.alergias.trim().toLowerCase() === 'ninguna') return false;
            } else if (filtroAlergias === 'sin_alergias') {
                if (m.alergias && m.alergias.trim() && m.alergias.trim().toLowerCase() !== 'ninguna') return false;
            }

            // Filtro por contactos de emergencia
            if (filtroContactos === 'con_contactos') {
                if (!m.contactos || m.contactos.length === 0) return false;
            } else if (filtroContactos === 'sin_contactos') {
                if (m.contactos && m.contactos.length > 0) return false;
            }

            // Filtro por rol en club
            if (filtroRol !== 'todos') {
                if (m.rol_en_club !== filtroRol) return false;
            }

            return true;
        });
    }, [miembros, busqueda, filtroSangre, filtroAlergias, filtroContactos, filtroRol]);

    const getRolBadge = (rol) => {
        switch (rol) {
            case 'encargado_profesor':
                return <span className="badge-rol badge-profesor">🎓 Profesor Titular</span>;
            case 'encargado_alumno':
                return <span className="badge-rol badge-encargado">⭐ Alumno Representante</span>;
            default:
                return <span className="badge-rol badge-miembro">👤 Miembro</span>;
        }
    };

    if (loading) {
        return (
            <div className="emergencias-container">
                <div style={{ textAlign: 'center', padding: '100px 20px', color: '#003366' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>⏳</div>
                    <h2>Cargando Directorio de Emergencias Médicas...</h2>
                    <p style={{ color: '#666' }}>Recuperando datos médicos y contactos de seguridad de los integrantes.</p>
                </div>
            </div>
        );
    }

    if (errorAcceso) {
        return (
            <div className="emergencias-container">
                <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                    <div className="nav-left">
                        <span className="nav-title">🚨 Emergencias del Club</span>
                    </div>
                    <div className="nav-right">
                        <button
                            type="button"
                            onClick={() => navigate(esAdmin ? '/admin' : `/club/${clubId}/panel`)}
                            className="btn-volver-nav"
                        >
                            <span className="btn-volver-icon">←</span>
                            <span>Volver</span>
                        </button>
                    </div>
                </header>
                <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <span style={{ fontSize: '3.5rem' }}>🚫</span>
                    <h2 style={{ color: '#c53030', marginTop: '15px' }}>Acceso Restringido</h2>
                    <p style={{ color: '#555', lineHeight: '1.6', margin: '15px 0' }}>{errorAcceso}</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                        <button
                            onClick={() => navigate(`/chat/${clubId}`)}
                            className="btn-crear-club"
                            style={{ backgroundColor: '#003366' }}
                        >
                            💬 Ir al Chat del Club
                        </button>
                        <button
                            onClick={() => navigate(esAdmin ? '/admin' : `/club/${clubId}`)}
                            className="btn-crear-club"
                            style={{ backgroundColor: '#64748b' }}
                        >
                            📋 Panel y Detalles
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="emergencias-container">
            {/* Barra de Navegación Superior Fija */}
            <header className="admin-navbar-fixed" style={{ backgroundColor: '#003366', color: '#fff' }}>
                <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🚨</span>
                    <div>
                        <span className="nav-title" style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'block', lineHeight: '1.2' }}>
                            Directorio de Emergencias Médicas
                        </span>
                        <small style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>{club?.nombre || 'Club'}</small>
                    </div>
                </div>
                <div className="nav-right no-print" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate(`/chat/${clubId}`)}
                        style={{
                            background: '#00509e',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.86rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        💬 Chat del Club
                    </button>

                    <button
                        onClick={() => navigate(esAdmin ? `/admin/club/${clubId}` : `/club/${clubId}?tab=miembros`)}
                        style={{
                            background: '#28a745',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.86rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📋 Panel y Detalles
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn-volver-nav"
                    >
                        <span className="btn-volver-icon">←</span>
                        <span>Volver</span>
                    </button>
                </div>
            </header>

            <main className="emergencias-content">

                {/* Tarjetas KPI de Resumen */}
                <div className="emergencias-kpis">
                    <div className="kpi-card">
                        <div className="kpi-icon">👥</div>
                        <div className="kpi-info">
                            <h4>Total Integrantes</h4>
                            <div className="kpi-number">{kpiData.total}</div>
                        </div>
                    </div>

                    <div
                        className="kpi-card kpi-warning"
                        onClick={() => {
                            if (kpiData.conAlergias > 0) setModalKpiTipo('alergias');
                        }}
                        style={{
                            cursor: kpiData.conAlergias > 0 ? 'pointer' : 'default',
                            position: 'relative'
                        }}
                        title={kpiData.conAlergias > 0 ? 'Haz clic para ver integrantes con alergias o condiciones' : 'Ningún integrante con alergias o condiciones'}
                    >
                        <div className="kpi-icon">⚠️</div>
                        <div className="kpi-info" style={{ flex: 1 }}>
                            <h4>Con Alergias / Condiciones</h4>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                                <div className="kpi-number">{kpiData.conAlergias}</div>
                                {kpiData.conAlergias > 0 && (
                                    <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#d97706' }}>
                                        Ver listado →
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`kpi-card ${kpiData.sinContactos > 0 ? 'kpi-danger' : 'kpi-success'}`}
                        onClick={() => {
                            if (kpiData.sinContactos > 0) setModalKpiTipo('sin_contactos');
                        }}
                        style={{
                            cursor: kpiData.sinContactos > 0 ? 'pointer' : 'default',
                            position: 'relative'
                        }}
                        title={kpiData.sinContactos > 0 ? 'Haz clic para ver integrantes sin contacto de emergencia' : 'Todos los integrantes cuentan con contacto de emergencia'}
                    >
                        <div className="kpi-icon">{kpiData.sinContactos > 0 ? '🚨' : '✅'}</div>
                        <div className="kpi-info" style={{ flex: 1 }}>
                            <h4>Sin Contacto de Emergencia</h4>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                                <div className="kpi-number" style={{ color: kpiData.sinContactos > 0 ? '#dc3545' : '#10b981' }}>
                                    {kpiData.sinContactos}
                                </div>
                                {kpiData.sinContactos > 0 && (
                                    <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#dc3545' }}>
                                        Ver faltantes →
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel de Control y Filtros de Accesibilidad Rápida (Sticky) */}
                <div className="emergencias-filtros-card no-print">
                    <div className="filtros-toolbar-top">
                        {/* Buscador instantáneo amplio */}
                        <div className="busqueda-rapida-wrapper">
                            <span className="busqueda-rapida-icon">🔍</span>
                            <input
                                id="busqueda"
                                type="text"
                                className="busqueda-rapida-input"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar al instante por nombre, boleta, teléfono, familiar o alergia..."
                            />
                            {busqueda && (
                                <button
                                    type="button"
                                    className="busqueda-clear-btn"
                                    onClick={() => setBusqueda('')}
                                    title="Limpiar búsqueda"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Accesos rápidos a 1 clic */}
                        <div className="quick-pills-group">
                            <button
                                type="button"
                                onClick={limpiarFiltros}
                                className={`quick-pill ${filtroAlergias === 'todos' && filtroContactos === 'todos' && filtroSangre === 'todos' && filtroRol === 'todos' && !busqueda ? 'active-default' : ''}`}
                            >
                                👥 Todos ({miembros.length})
                            </button>

                            <button
                                type="button"
                                onClick={() => setFiltroAlergias(filtroAlergias === 'con_alergias' ? 'todos' : 'con_alergias')}
                                className={`quick-pill ${filtroAlergias === 'con_alergias' ? 'active-warning' : ''}`}
                            >
                                ⚠️ Con Alergias ({kpiData.conAlergias})
                            </button>

                            <button
                                type="button"
                                onClick={() => setFiltroContactos(filtroContactos === 'sin_contactos' ? 'todos' : 'sin_contactos')}
                                className={`quick-pill ${filtroContactos === 'sin_contactos' ? 'active-danger' : ''}`}
                            >
                                🚨 Sin Contacto ({kpiData.sinContactos})
                            </button>
                        </div>
                    </div>

                    <div className="filtros-toolbar-bottom">
                        {/* Chips de acceso rápido por Tipo de Sangre */}
                        <div className="sangre-chips-bar">
                            <span className="sangre-chips-label">🩸 Sangre:</span>
                            {['todos', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'sin_especificar'].map((grupo) => {
                                const etiqueta = grupo === 'todos' ? 'Todos' : (grupo === 'sin_especificar' ? 'Sin reg.' : grupo);
                                return (
                                    <button
                                        key={grupo}
                                        type="button"
                                        onClick={() => setFiltroSangre(filtroSangre === grupo ? 'todos' : grupo)}
                                        className={`sangre-chip ${filtroSangre === grupo ? 'active' : ''}`}
                                    >
                                        {etiqueta}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selector de Rol, Contador y Botón de Restablecer */}
                        <div className="filtros-selects-inline">
                            <select
                                id="filtroRol"
                                className="select-compacto"
                                value={filtroRol}
                                onChange={(e) => setFiltroRol(e.target.value)}
                                title="Filtrar por rol en el club"
                            >
                                <option value="todos">👥 Todos los roles</option>
                                <option value="encargado_profesor">🎓 Profesor Titular</option>
                                <option value="encargado_alumno">⭐ Alumno Representante</option>
                                <option value="miembro">👤 Miembro</option>
                            </select>

                            <span style={{ fontSize: '0.83rem', color: '#475569', fontWeight: '700' }}>
                                Mostrando {miembrosFiltrados.length} de {miembros.length}
                            </span>

                            {(busqueda || filtroSangre !== 'todos' || filtroAlergias !== 'todos' || filtroContactos !== 'todos' || filtroRol !== 'todos') && (
                                <button type="button" onClick={limpiarFiltros} className="btn-reset-filtros">
                                    🔄 Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Directorio / Tarjetas de Integrantes en Cuadrícula de Escritorio */}
                {miembrosFiltrados.length === 0 ? (
                    <div style={{ background: '#fff', padding: '40px 20px', borderRadius: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '3rem' }}>🔍</span>
                        <h3 style={{ color: '#003366', marginTop: '10px' }}>No se encontraron coincidencias</h3>
                        <p style={{ color: '#666', maxWidth: '500px', margin: '8px auto 16px auto' }}>
                            No hay ningún integrante que coincida con los criterios de búsqueda y filtros seleccionados.
                        </p>
                        <button onClick={limpiarFiltros} className="btn-crear-club" style={{ backgroundColor: '#00509e' }}>
                            Limpiar todos los filtros
                        </button>
                    </div>
                ) : (
                    <div className="integrantes-lista">
                        {miembrosFiltrados.map((m) => {
                            const inicial = (m.nombre_completo || 'U').charAt(0).toUpperCase();
                            const identificador = m.boleta ? `Boleta: ${m.boleta}` : (m.num_empleado ? `No. Emp: ${m.num_empleado}` : 'Sin identificador');
                            const tieneAlergias = m.alergias && m.alergias.trim() && m.alergias.trim().toLowerCase() !== 'ninguna';

                            return (
                                <div key={m.usuario_id} className={`integrante-card ${tieneAlergias ? 'card-alerta-medica' : ''}`}>
                                    {/* Cabecera del Integrante */}
                                    <div className="integrante-card-header">
                                        <div className="integrante-identidad">
                                            <div className="integrante-avatar">{inicial}</div>
                                            <div className="integrante-nombre">
                                                <h3>{m.nombre_completo}</h3>
                                                <span>{identificador}</span>
                                            </div>
                                        </div>
                                        <div className="integrante-badges">
                                            {getRolBadge(m.rol_en_club)}
                                            {m.tipo_sangre ? (
                                                <span className="badge-sangre">🩸 {m.tipo_sangre}</span>
                                            ) : (
                                                <span className="badge-sin-sangre">Sangre: No reg.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cuerpo con 2 columnas: Datos Médicos / Personales y Contactos de Emergencia */}
                                    <div className="integrante-card-body">
                                        {/* Columna Izquierda: Información Médica y Personal */}
                                        <div className="ficha-seccion">
                                            <h4>🩺 Datos Médicos y Personales</h4>

                                            <div className="datos-vitales-grid">
                                                <div className="dato-vital-box">
                                                    <span className="dato-vital-label">Tipo de Sangre</span>
                                                    <span className="dato-vital-valor" style={{ color: m.tipo_sangre ? '#b91c1c' : '#94a3b8' }}>
                                                        {m.tipo_sangre ? `🩸 ${m.tipo_sangre}` : 'Sin registrar'}
                                                    </span>
                                                </div>
                                                <div className="dato-vital-box">
                                                    <span className="dato-vital-label">NSS (Seguro)</span>
                                                    <span className="dato-vital-valor" style={{ color: m.nss ? '#0f172a' : '#94a3b8' }}>
                                                        {m.nss || 'No registrado'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="info-fila">
                                                <span className="info-label">Tel. Personal:</span>
                                                <span className="info-valor">
                                                    {m.telefono ? (
                                                        <>
                                                            <a href={`tel:${m.telefono}`} style={{ color: '#00509e', textDecoration: 'none', fontWeight: '700' }}>
                                                                📞 {m.telefono}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopiar(m.telefono)}
                                                                className={`btn-copiar no-print ${telefonoCopiado === m.telefono ? 'copiado' : ''}`}
                                                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                                                                title="Copiar teléfono personal"
                                                            >
                                                                {telefonoCopiado === m.telefono ? '✓ Copiado' : '📋 Copiar'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <em style={{ color: '#94a3b8', fontWeight: '500' }}>Sin registrar</em>
                                                    )}
                                                </span>
                                            </div>

                                            <div className="info-fila">
                                                <span className="info-label">Correo:</span>
                                                <span className="info-valor" style={{ wordBreak: 'break-all', fontSize: '0.82rem' }}>
                                                    {m.correo || '—'}
                                                </span>
                                            </div>

                                            <div style={{ marginTop: '4px' }}>
                                                {tieneAlergias ? (
                                                    <div className="alergias-box">
                                                        <strong>⚠️ ALERTA MÉDICA:</strong> {m.alergias}
                                                    </div>
                                                ) : (
                                                    <div className="alergias-limpio">
                                                        ✅ Sin alergias o condiciones reportadas.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Columna Derecha: Contactos de Emergencia */}
                                        <div className="ficha-seccion">
                                            <h4>📞 Contactos de Emergencia</h4>
                                            
                                            {(!m.contactos || m.contactos.length === 0) ? (
                                                <div className="sin-contactos-alerta">
                                                    <span style={{ fontSize: '1.2rem' }}>🚨</span>
                                                    <div>
                                                        <strong>Sin contactos registrados</strong>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem' }}>
                                                            No cuenta con teléfonos de emergencia en su perfil.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="contactos-lista">
                                                    {m.contactos.map((contacto) => (
                                                        <div key={contacto.id} className="contacto-mini-card">
                                                            <div className="contacto-info">
                                                                <span className="contacto-parentesco">
                                                                    {contacto.parentesco || 'Familiar'}
                                                                </span>
                                                                <div className="contacto-nombre">
                                                                    {contacto.nombre}
                                                                </div>
                                                                <div className="contacto-telefono">
                                                                    <a href={`tel:${contacto.telefono}`} style={{ color: '#003366', textDecoration: 'none' }}>
                                                                        📞 {contacto.telefono}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                            <div className="no-print" style={{ display: 'flex', alignItems: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopiar(contacto.telefono)}
                                                                    className={`btn-copiar ${telefonoCopiado === contacto.telefono ? 'copiado' : ''}`}
                                                                    title="Copiar número de emergencia"
                                                                >
                                                                    {telefonoCopiado === contacto.telefono ? '✓ Copiado' : '📋 Copiar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modal de Detalle para Alergias / Condiciones o Sin Contactos de Emergencia */}
                {modalKpiTipo && (
                    <div
                        className="no-print"
                        onClick={() => setModalKpiTipo(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.55)',
                            backdropFilter: 'blur(3px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100,
                            padding: '20px'
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#ffffff',
                                borderRadius: '14px',
                                width: '100%',
                                maxWidth: '680px',
                                maxHeight: '82vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Encabezado del Modal */}
                            <div
                                style={{
                                    padding: '18px 24px',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    background: modalKpiTipo === 'alergias' ? '#fffbeb' : '#fef2f2'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.6rem' }}>
                                        {modalKpiTipo === 'alergias' ? '⚠️' : '🚨'}
                                    </span>
                                    <div>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '1.1rem',
                                            fontWeight: '700',
                                            color: modalKpiTipo === 'alergias' ? '#92400e' : '#991b1b'
                                        }}>
                                            {modalKpiTipo === 'alergias'
                                                ? 'Integrantes con Alergias o Condiciones Médicas'
                                                : 'Integrantes sin Contacto de Emergencia'}
                                        </h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                            {modalKpiTipo === 'alergias'
                                                ? `${miembrosConAlergias.length} persona(s) con datos médicos reportados`
                                                : `${miembrosSinContactos.length} persona(s) pendientes de registrar contacto de emergencia`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalKpiTipo(null)}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        color: '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Cerrar ventana"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Cuerpo del Modal */}
                            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {modalKpiTipo === 'alergias' ? (
                                    miembrosConAlergias.map((m) => {
                                        const inicial = (m.nombre_completo || 'U').charAt(0).toUpperCase();
                                        const identificador = m.boleta ? `Boleta: ${m.boleta}` : (m.num_empleado ? `No. Emp: ${m.num_empleado}` : 'Sin identificador');
                                        return (
                                            <div
                                                key={m.usuario_id}
                                                style={{
                                                    border: '1px solid #fde68a',
                                                    borderRadius: '10px',
                                                    padding: '14px 16px',
                                                    background: '#ffffff',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="integrante-avatar" style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}>
                                                            {inicial}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.96rem' }}>
                                                                {m.nombre_completo}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                {identificador}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {getRolBadge(m.rol_en_club)}
                                                        {m.tipo_sangre && (
                                                            <span className="badge-sangre">🩸 {m.tipo_sangre}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="alergias-box" style={{ marginTop: '10px' }}>
                                                    <strong>⚠️ Condición / Alergia:</strong> {m.alergias}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    miembrosSinContactos.map((m) => {
                                        const inicial = (m.nombre_completo || 'U').charAt(0).toUpperCase();
                                        const identificador = m.boleta ? `Boleta: ${m.boleta}` : (m.num_empleado ? `No. Emp: ${m.num_empleado}` : 'Sin identificador');
                                        return (
                                            <div
                                                key={m.usuario_id}
                                                style={{
                                                    border: '1px solid #fecaca',
                                                    borderRadius: '10px',
                                                    padding: '14px 16px',
                                                    background: '#ffffff',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: '10px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="integrante-avatar" style={{ width: '36px', height: '36px', fontSize: '0.95rem', background: '#dc2626' }}>
                                                        {inicial}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.96rem' }}>
                                                            {m.nombre_completo}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                            {identificador} {m.telefono ? `• 📞 ${m.telefono}` : ''} {m.correo ? `• ✉️ ${m.correo}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {getRolBadge(m.rol_en_club)}
                                                    <span style={{
                                                        backgroundColor: '#fef2f2',
                                                        color: '#b91c1c',
                                                        border: '1px solid #fecaca',
                                                        padding: '4px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700'
                                                    }}>
                                                        Sin contactos
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pie del Modal */}
                            <div
                                style={{
                                    padding: '14px 24px',
                                    borderTop: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setModalKpiTipo(null)}
                                    style={{
                                        backgroundColor: '#0f172a',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 18px',
                                        fontSize: '0.88rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClubEmergenciasPage;

