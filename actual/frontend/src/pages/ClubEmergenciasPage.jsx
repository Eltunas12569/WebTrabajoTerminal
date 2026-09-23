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

    // Métricas para los KPIs
    const kpiData = useMemo(() => {
        const total = miembros.length;
        const conSangre = miembros.filter(m => m.tipo_sangre && m.tipo_sangre.trim()).length;
        const conAlergias = miembros.filter(m => m.alergias && m.alergias.trim() && m.alergias.trim().toLowerCase() !== 'ninguna').length;
        const sinContactos = miembros.filter(m => !m.contactos || m.contactos.length === 0).length;
        return { total, conSangre, conAlergias, sinContactos };
    }, [miembros]);

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
                            onClick={() => navigate(esAdmin ? '/admin' : `/club/${clubId}/panel`)}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}
                        >
                            🔙 Volver
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
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.86rem'
                        }}
                    >
                        🔙 Volver
                    </button>
                </div>
            </header>

            <main className="emergencias-content">
                {/* Hero Banner */}
                <div className="emergencias-hero">
                    <div className="emergencias-hero-text">
                        <h1>
                            <span>🚨</span> Información Médica y de Emergencia
                        </h1>
                        <p>
                            Fichas de salud, tipo de sangre, alergias, NSS y contactos de auxilio para los integrantes de <strong>{club?.nombre}</strong>.
                        </p>
                    </div>
                    <div>
                        <span className="emergencias-hero-badge">
                            🔒 Exclusivo para Encargados
                        </span>
                    </div>
                </div>

                {/* Tarjetas KPI de Resumen */}
                <div className="emergencias-kpis">
                    <div className="kpi-card">
                        <div className="kpi-icon">👥</div>
                        <div className="kpi-info">
                            <h4>Total Integrantes</h4>
                            <div className="kpi-number">{kpiData.total}</div>
                        </div>
                    </div>

                    <div className="kpi-card kpi-success">
                        <div className="kpi-icon">🩸</div>
                        <div className="kpi-info">
                            <h4>Con Tipo de Sangre</h4>
                            <div className="kpi-number">{kpiData.conSangre} <small style={{ fontSize: '0.85rem', color: '#64748b' }}>/ {kpiData.total}</small></div>
                        </div>
                    </div>

                    <div className="kpi-card kpi-warning">
                        <div className="kpi-icon">⚠️</div>
                        <div className="kpi-info">
                            <h4>Con Alergias / Condiciones</h4>
                            <div className="kpi-number">{kpiData.conAlergias}</div>
                        </div>
                    </div>

                    <div className={`kpi-card ${kpiData.sinContactos > 0 ? 'kpi-danger' : 'kpi-success'}`}>
                        <div className="kpi-icon">{kpiData.sinContactos > 0 ? '🚨' : '✅'}</div>
                        <div className="kpi-info">
                            <h4>Sin Contacto de Emergencia</h4>
                            <div className="kpi-number" style={{ color: kpiData.sinContactos > 0 ? '#dc3545' : '#10b981' }}>
                                {kpiData.sinContactos}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel de Filtros Interactivos */}
                <div className="emergencias-filtros-card no-print">
                    <div className="filtros-header">
                        <h3>
                            <span>🔍</span> Filtros y Búsqueda de Integrantes
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                                Mostrando {miembrosFiltrados.length} de {miembros.length}
                            </span>
                            {(busqueda || filtroSangre !== 'todos' || filtroAlergias !== 'todos' || filtroContactos !== 'todos' || filtroRol !== 'todos') && (
                                <button onClick={limpiarFiltros} className="btn-reset-filtros">
                                    🔄 Restablecer Filtros
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="filtros-grid">
                        <div className="filtro-item" style={{ gridColumn: 'span 2' }}>
                            <label htmlFor="busqueda">Búsqueda rápida</label>
                            <input
                                id="busqueda"
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre, boleta, teléfono, familiar o alergia..."
                            />
                        </div>

                        <div className="filtro-item">
                            <label htmlFor="filtroSangre">🩸 Tipo de Sangre</label>
                            <select
                                id="filtroSangre"
                                value={filtroSangre}
                                onChange={(e) => setFiltroSangre(e.target.value)}
                            >
                                <option value="todos">Todos los grupos</option>
                                <option value="O+">O Positivo (O+)</option>
                                <option value="O-">O Negativo (O-)</option>
                                <option value="A+">A Positivo (A+)</option>
                                <option value="A-">A Negativo (A-)</option>
                                <option value="B+">B Positivo (B+)</option>
                                <option value="B-">B Negativo (B-)</option>
                                <option value="AB+">AB Positivo (AB+)</option>
                                <option value="AB-">AB Negativo (AB-)</option>
                                <option value="sin_especificar">⚠️ Sin especificar</option>
                            </select>
                        </div>

                        <div className="filtro-item">
                            <label htmlFor="filtroAlergias">⚠️ Alergias / Condiciones</label>
                            <select
                                id="filtroAlergias"
                                value={filtroAlergias}
                                onChange={(e) => setFiltroAlergias(e.target.value)}
                            >
                                <option value="todos">Todas las condiciones</option>
                                <option value="con_alergias">⚠️ Con alergias reportadas</option>
                                <option value="sin_alergias">✅ Sin alergias / limpio</option>
                            </select>
                        </div>

                        <div className="filtro-item">
                            <label htmlFor="filtroContactos">📞 Contacto de Emergencia</label>
                            <select
                                id="filtroContactos"
                                value={filtroContactos}
                                onChange={(e) => setFiltroContactos(e.target.value)}
                            >
                                <option value="todos">Todos los registros</option>
                                <option value="con_contactos">✅ Con contactos registrados</option>
                                <option value="sin_contactos">🚨 Sin contactos registrados</option>
                            </select>
                        </div>

                        <div className="filtro-item">
                            <label htmlFor="filtroRol">👥 Rol en el Club</label>
                            <select
                                id="filtroRol"
                                value={filtroRol}
                                onChange={(e) => setFiltroRol(e.target.value)}
                            >
                                <option value="todos">Todos los roles</option>
                                <option value="encargado_profesor">🎓 Profesor Titular</option>
                                <option value="encargado_alumno">⭐ Alumno Representante</option>
                                <option value="miembro">👤 Miembro</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Directorio / Tarjetas de Integrantes */}
                {miembrosFiltrados.length === 0 ? (
                    <div style={{ background: '#fff', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
                                <div key={m.usuario_id} className="integrante-card">
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
                                            <h4>🩺 Información Médica y Personal</h4>
                                            
                                            <div className="info-fila">
                                                <span className="info-label">Tipo de Sangre:</span>
                                                <span className="info-valor">
                                                    {m.tipo_sangre ? (
                                                        <strong style={{ color: '#b91c1c' }}>{m.tipo_sangre}</strong>
                                                    ) : (
                                                        <em style={{ color: '#94a3b8' }}>Sin registrar</em>
                                                    )}
                                                </span>
                                            </div>

                                            <div className="info-fila">
                                                <span className="info-label">NSS (Seguro Médico):</span>
                                                <span className="info-valor">
                                                    {m.nss ? m.nss : <em style={{ color: '#94a3b8' }}>No registrado</em>}
                                                </span>
                                            </div>

                                            <div className="info-fila">
                                                <span className="info-label">Teléfono Personal:</span>
                                                <span className="info-valor">
                                                    {m.telefono ? (
                                                        <>
                                                            <a href={`tel:${m.telefono}`} style={{ color: '#00509e', textDecoration: 'none' }}>
                                                                📞 {m.telefono}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopiar(m.telefono)}
                                                                className="btn-copiar no-print"
                                                                title="Copiar teléfono"
                                                            >
                                                                {telefonoCopiado === m.telefono ? '✓ Copiado' : 'Copiar'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <em style={{ color: '#94a3b8' }}>Sin teléfono registrado</em>
                                                    )}
                                                </span>
                                            </div>

                                            <div className="info-fila">
                                                <span className="info-label">Correo:</span>
                                                <span className="info-valor" style={{ wordBreak: 'break-all' }}>
                                                    {m.correo || '—'}
                                                </span>
                                            </div>

                                            <div style={{ marginTop: '10px' }}>
                                                <strong style={{ fontSize: '0.82rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                                    Alergias / Condiciones Preexistentes:
                                                </strong>
                                                {tieneAlergias ? (
                                                    <div className="alergias-box">
                                                        <strong>⚠️ ALERTA MÉDICA:</strong> {m.alergias}
                                                    </div>
                                                ) : (
                                                    <div className="alergias-limpio">
                                                        ✅ Ninguna condición médica o alergia reportada.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Columna Derecha: Contactos de Emergencia */}
                                        <div className="ficha-seccion">
                                            <h4>📞 Contactos de Emergencia y Auxilio</h4>
                                            
                                            {(!m.contactos || m.contactos.length === 0) ? (
                                                <div className="sin-contactos-alerta">
                                                    <span>⚠️</span>
                                                    <div>
                                                        <strong>Sin contactos registrados</strong>
                                                        <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem' }}>
                                                            El integrante no ha ingresado números de familiares o tutores en su perfil.
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
                                                                    <span>📞</span> {contacto.telefono}
                                                                </div>
                                                            </div>
                                                            <div className="no-print" style={{ display: 'flex', alignItems: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopiar(contacto.telefono)}
                                                                    className={`btn-copiar ${telefonoCopiado === contacto.telefono ? 'copiado' : ''}`}
                                                                    title="Copiar número de emergencia"
                                                                >
                                                                    {telefonoCopiado === contacto.telefono ? '✓ ¡Número Copiado!' : '📋 Copiar Teléfono'}
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
            </main>
        </div>
    );
};

export default ClubEmergenciasPage;

