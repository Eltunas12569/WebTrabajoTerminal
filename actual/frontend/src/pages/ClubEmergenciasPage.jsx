import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';
import './css/ClubEmergencias.css';

// Cache en memoria a nivel de módulo para navegación instantánea (0ms)
const emergenciasCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minuto de cache fresco

// Función ultra segura para convertir cualquier valor o Buffer a string plano
const toSafeString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val.type === 'Buffer' && Array.isArray(val.data)) {
        try {
            return String.fromCharCode(...val.data).trim();
        } catch (e) {
            return '';
        }
    }
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (e) {
            return '';
        }
    }
    return String(val);
};

// Generador de badge de rol memoizado
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

// Sub-componente memoizado para renderizar la lista de contactos de un miembro
const ContactosMiembroList = React.memo(({ contactos, handleCopiar, telefonoCopiado }) => {
    if (!contactos || contactos.length === 0) {
        return (
            <div className="sin-contactos-alerta">
                <span style={{ fontSize: '1.2rem' }}>🚨</span>
                <div>
                    <strong>Sin contactos registrados</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem' }}>
                        No cuenta con teléfonos de emergencia en su perfil.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`contactos-lista ${contactos.length > 2 ? 'con-scroll' : ''}`}>
            {contactos.map((contacto, idx) => {
                const parentesco = toSafeString(contacto.parentesco) || 'Familiar';
                const nombre = toSafeString(contacto.nombre);
                const telefono = toSafeString(contacto.telefono);

                return (
                    <div key={contacto.id || idx} className="contacto-mini-card">
                        <div className="contacto-info">
                            <span className="contacto-parentesco">
                                {parentesco} {idx >= 2 ? `(#${idx + 1})` : ''}
                            </span>
                            <div className="contacto-nombre">
                                {nombre}
                            </div>
                            <div className="contacto-telefono">
                                <a href={`tel:${telefono}`} style={{ color: '#003366', textDecoration: 'none' }}>
                                    📞 {telefono}
                                </a>
                            </div>
                        </div>
                        <div className="no-print" style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => handleCopiar(telefono)}
                                className={`btn-copiar ${telefonoCopiado === telefono ? 'copiado' : ''}`}
                                title="Copiar número de emergencia"
                            >
                                {telefonoCopiado === telefono ? '✓ Copiado' : '📋 Copiar'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// Sub-componente memoizado para cada tarjeta de miembro
const MiembroCard = React.memo(({ m, handleCopiar, telefonoCopiado }) => {
    const nombreCompleto = toSafeString(m.nombre_completo) || 'Usuario';
    const inicial = nombreCompleto.charAt(0).toUpperCase();
    const boleta = toSafeString(m.boleta);
    const numEmpleado = toSafeString(m.num_empleado);
    const identificador = boleta ? `Boleta: ${boleta}` : (numEmpleado ? `No. Emp: ${numEmpleado}` : 'Sin identificador');
    const alergias = toSafeString(m.alergias);
    const tieneAlergias = alergias && alergias.toLowerCase() !== 'ninguna' && alergias.toLowerCase() !== 'sin registrar' && alergias.toLowerCase() !== 'n/a';
    const tipoSangre = toSafeString(m.tipo_sangre);
    const nss = toSafeString(m.nss);
    const telefono = toSafeString(m.telefono);
    const correo = toSafeString(m.correo);

    return (
        <div className={`integrante-card ${tieneAlergias ? 'card-alerta-medica' : ''}`}>
            {/* Cabecera del Integrante */}
            <div className="integrante-card-header">
                <div className="integrante-identidad">
                    <div className="integrante-avatar">{inicial}</div>
                    <div className="integrante-nombre">
                        <h3>{nombreCompleto}</h3>
                        <span>{identificador}</span>
                    </div>
                </div>
                <div className="integrante-badges">
                    {getRolBadge(m.rol_en_club)}
                    {tipoSangre ? (
                        <span className="badge-sangre">🩸 {tipoSangre}</span>
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
                            <span className="dato-vital-valor" style={{ color: tipoSangre ? '#b91c1c' : '#94a3b8' }}>
                                {tipoSangre ? `🩸 ${tipoSangre}` : 'Sin registrar'}
                            </span>
                        </div>
                        <div className="dato-vital-box">
                            <span className="dato-vital-label">NSS (Seguro)</span>
                            <span className="dato-vital-valor" style={{ color: nss ? '#0f172a' : '#94a3b8' }}>
                                {nss || 'No registrado'}
                            </span>
                        </div>
                    </div>

                    <div className="info-fila">
                        <span className="info-label">Tel. Personal:</span>
                        <span className="info-valor">
                            {telefono ? (
                                <>
                                    <a href={`tel:${telefono}`} style={{ color: '#00509e', textDecoration: 'none', fontWeight: '700' }}>
                                        📞 {telefono}
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleCopiar(telefono)}
                                        className={`btn-copiar no-print ${telefonoCopiado === telefono ? 'copiado' : ''}`}
                                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                                        title="Copiar teléfono personal"
                                    >
                                        {telefonoCopiado === telefono ? '✓ Copiado' : '📋 Copiar'}
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
                            {correo || '—'}
                        </span>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                        {tieneAlergias ? (
                            <div className="alergias-box">
                                <strong>⚠️ ALERTA MÉDICA:</strong> {alergias}
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
                    <div className="ficha-seccion-header-row">
                        <h4>📞 Contactos de Emergencia</h4>
                        {m.contactos?.length > 2 && (
                            <span className="badge-scroll-indicador" title={`${m.contactos.length} contactos registrados. Desplaza para ver todos.`}>
                                ↕ {m.contactos.length} contactos (desplaza)
                            </span>
                        )}
                    </div>
                    <ContactosMiembroList
                        contactos={m.contactos}
                        handleCopiar={handleCopiar}
                        telefonoCopiado={telefonoCopiado}
                    />
                </div>
            </div>
        </div>
    );
});

const ClubEmergenciasPage = () => {
    const { id: clubId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [club, setClub] = useState(() => emergenciasCache.get(String(clubId))?.club || null);
    const [miembros, setMiembros] = useState(() => emergenciasCache.get(String(clubId))?.miembros || []);
    const [loading, setLoading] = useState(() => !emergenciasCache.has(String(clubId)));
    const [errorAcceso, setErrorAcceso] = useState('');
    const [telefonoCopiado, setTelefonoCopiado] = useState('');

    // Filtros interactivos
    const [busqueda, setBusqueda] = useState('');
    const deferredBusqueda = useDeferredValue(busqueda); // Suaviza la escritura al buscar
    const [filtroSangre, setFiltroSangre] = useState('todos');
    const [filtroAlergias, setFiltroAlergias] = useState('todos'); // 'todos' | 'con_alergias'
    const [filtroRol, setFiltroRol] = useState('todos');
    const [modalAlergiasAbierto, setModalAlergiasAbierto] = useState(false);

    const esAdmin = Number(user?.role_id) === 1 || Number(user?.rol) === 1;

    useEffect(() => {
        let isMounted = true;

        const fetchEmergencias = async () => {
            if (!user?.id || !clubId) return;

            const cached = emergenciasCache.get(String(clubId));
            const esCacheValido = cached && (Date.now() - cached.timestamp < CACHE_TTL_MS);

            // Si hay cache válido, no mostramos spinner inicial
            if (!esCacheValido && miembros.length === 0) {
                setLoading(true);
            }
            setErrorAcceso('');

            try {
                // 1. Ejecutar peticiones iniciales en paralelo sin la sobrecarga de /clubes
                const [emergenciasRes, studentsRes, allUsersRes] = await Promise.all([
                    api.get(`/clubes/${clubId}/emergencias`),
                    api.get('/users/students-in-charge').catch(() => ({ data: [] })),
                    esAdmin ? api.get('/users/all-for-admin').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
                ]);

                if (!isMounted) return;

                const clubInfo = emergenciasRes.data?.club || { id: clubId, nombre: 'Club' };
                setClub(clubInfo);

                // Mapa rápido de usuarios desencriptados en memoria O(1)
                const userDirectoryMap = new Map();

                if (Array.isArray(allUsersRes?.data)) {
                    allUsersRes.data.forEach(u => {
                        const uId = Number(u.id);
                        userDirectoryMap.set(uId, {
                            nombres: toSafeString(u.nombres),
                            apellidos: `${toSafeString(u.apellido_paterno)} ${toSafeString(u.apellido_materno)}`.trim(),
                            boleta: toSafeString(u.boleta),
                            num_empleado: toSafeString(u.num_empleado),
                            correo: toSafeString(u.correo),
                            nss: toSafeString(u.nss)
                        });
                    });
                }

                if (Array.isArray(studentsRes?.data)) {
                    studentsRes.data.forEach(s => {
                        const sId = Number(s.id);
                        if (!userDirectoryMap.has(sId)) {
                            userDirectoryMap.set(sId, {
                                nombres: toSafeString(s.nombres),
                                apellidos: toSafeString(s.apellidos),
                                boleta: toSafeString(s.boleta),
                                num_empleado: '',
                                correo: ''
                            });
                        }
                    });
                }

                const rawMiembros = emergenciasRes.data?.miembros || [];

                // 2. Renderizado Progresivo Instantáneo:
                // Los contactos y tipo de sangre ya vienen listos desde el backend.
                // Construimos la lista base inmediatamente para que la pantalla aparezca en < 200ms.
                const miembrosIniciales = rawMiembros.map(m => {
                    const mId = Number(m.usuario_id || m.id);
                    const uInfo = userDirectoryMap.get(mId);

                    let nombres = uInfo?.nombres || '';
                    let apellidos = uInfo?.apellidos || '';
                    let boleta = uInfo?.boleta || '';
                    let num_empleado = uInfo?.num_empleado || '';

                    if (!nombres) {
                        const rawNom = toSafeString(m.nombre_completo || m.nombres);
                        if (!rawNom || rawNom.length > 50 || /[^\x20-\x7EáéíóúÁÉÍÓÚñÑ]/.test(rawNom)) {
                            nombres = `Usuario ${mId}`;
                        } else {
                            nombres = rawNom;
                        }
                    }

                    let nombreCompleto = `${nombres} ${apellidos}`.trim();
                    if (!nombreCompleto || /[^\x20-\x7EáéíóúÁÉÍÓÚñÑ]/.test(nombreCompleto)) {
                        nombreCompleto = `Usuario ${mId}`;
                    }

                    const rawContactos = Array.isArray(m.contactos) ? m.contactos : [];
                    const contactosTratados = rawContactos.map((c, idx) => ({
                        id: c.id || idx,
                        nombre: toSafeString(c.nombre),
                        telefono: toSafeString(c.telefono),
                        parentesco: toSafeString(c.parentesco) || 'Familiar'
                    }));

                    return {
                        id: mId,
                        usuario_id: mId,
                        nombre_completo: nombreCompleto,
                        nombres: nombres,
                        apellidos: apellidos,
                        boleta: boleta || toSafeString(m.boleta),
                        num_empleado: num_empleado || toSafeString(m.num_empleado),
                        correo: toSafeString(m.correo || uInfo?.correo || '—'),
                        rol_en_club: toSafeString(m.rol_en_club || 'miembro'),
                        estatus_inscripcion: toSafeString(m.estatus_inscripcion || 'activo'),
                        tipo_sangre: toSafeString(m.tipo_sangre),
                        alergias: '',
                        nss: toSafeString(m.nss || uInfo?.nss),
                        telefono: toSafeString(m.telefono),
                        contactos: contactosTratados
                    };
                });

                setMiembros(miembrosIniciales);
                setLoading(false);

                // 3. Hidratación en segundo plano de alergias y fichas médicas
                // Se procesan en bloques de 6 conexiones paralelas para no saturar el navegador
                const CHUNK_SIZE = 6;
                const chunks = [];
                for (let i = 0; i < rawMiembros.length; i += CHUNK_SIZE) {
                    chunks.push(rawMiembros.slice(i, i + CHUNK_SIZE));
                }

                const emergenciasMap = new Map();

                for (const chunk of chunks) {
                    if (!isMounted) return;
                    const results = await Promise.allSettled(
                        chunk.map(m => api.get(`/clubes/${clubId}/miembros/${m.usuario_id || m.id}/emergencia`).catch(() => null))
                    );

                    results.forEach(res => {
                        if (res.status === 'fulfilled' && res.value?.data) {
                            const d = res.value.data;
                            emergenciasMap.set(Number(d.usuario_id), d);
                        }
                    });
                }

                if (!isMounted) return;

                // 4. Actualización final con datos médicos desencriptados y guardado en cache
                setMiembros(prev => {
                    const final = prev.map(m => {
                        const em = emergenciasMap.get(m.usuario_id);
                        if (!em) return m;

                        const nombreCompleto = toSafeString(em.nombre_completo) || m.nombre_completo;
                        const boleta = toSafeString(em.boleta) || m.boleta;
                        const numEmpleado = toSafeString(em.num_empleado) || m.num_empleado;
                        const alergias = toSafeString(em.alergias);
                        const tipoSangre = toSafeString(em.tipo_sangre) || m.tipo_sangre;
                        const nss = toSafeString(em.nss) || m.nss;
                        const correo = toSafeString(em.correo) || m.correo;

                        let contactos = m.contactos;
                        if (Array.isArray(em.contactos) && em.contactos.length > 0) {
                            contactos = em.contactos.map((c, idx) => ({
                                id: c.id || idx,
                                nombre: toSafeString(c.nombre),
                                telefono: toSafeString(c.telefono),
                                parentesco: toSafeString(c.parentesco) || 'Familiar'
                            }));
                        }

                        return {
                            ...m,
                            nombre_completo: nombreCompleto,
                            boleta: boleta,
                            num_empleado: numEmpleado,
                            alergias: alergias,
                            tipo_sangre: tipoSangre,
                            nss: nss,
                            correo: correo,
                            contactos: contactos
                        };
                    });

                    emergenciasCache.set(String(clubId), {
                        club: clubInfo,
                        miembros: final,
                        timestamp: Date.now()
                    });

                    return final;
                });

            } catch (err) {
                if (!isMounted) return;
                console.error("Error al cargar emergencias:", err);
                if (err.response?.status === 403) {
                    setErrorAcceso("Acceso denegado. Esta información es confidencial y solo está disponible para los encargados de este club y el administrador.");
                } else if (err.response?.status === 404) {
                    setErrorAcceso("El club especificado no fue encontrado.");
                } else {
                    setErrorAcceso("Ocurrió un error al cargar la información médica y de emergencia.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchEmergencias();

        return () => {
            isMounted = false;
        };
    }, [user?.id, clubId, esAdmin]);

    // Copiado seguro al portapapeles memoizado
    const handleCopiar = useCallback((tel) => {
        if (!tel) return;
        navigator.clipboard.writeText(tel);
        setTelefonoCopiado(tel);
        setTimeout(() => setTelefonoCopiado(''), 2000);
    }, []);

    const limpiarFiltros = useCallback(() => {
        setBusqueda('');
        setFiltroSangre('todos');
        setFiltroAlergias('todos');
        setFiltroRol('todos');
    }, []);

    // Lista de integrantes con alergias memoizada
    const miembrosConAlergias = useMemo(() => {
        return miembros.filter(m => {
            const al = toSafeString(m.alergias).trim();
            return al.length > 0 && al.toLowerCase() !== 'ninguna' && al.toLowerCase() !== 'sin registrar' && al.toLowerCase() !== 'n/a';
        });
    }, [miembros]);

    // Métricas para los KPIs optimizadas (solo 2 KPIs)
    const kpiData = useMemo(() => {
        return {
            total: miembros.length,
            conAlergias: miembrosConAlergias.length
        };
    }, [miembros.length, miembrosConAlergias.length]);

    // Filtrado interactivo ultrarrápido con tokens pre-normalizados fuera del bucle
    const miembrosFiltrados = useMemo(() => {
        const query = deferredBusqueda.trim().toLowerCase();
        const tieneQuery = query.length > 0;
        const sangreFilter = filtroSangre !== 'todos' ? filtroSangre.toUpperCase() : null;
        const rolFilter = filtroRol !== 'todos' ? filtroRol : null;
        const soloConAlergias = filtroAlergias === 'con_alergias';

        return miembros.filter(m => {
            // 1. Filtro por búsqueda de texto
            if (tieneQuery) {
                const nomStr = toSafeString(m.nombre_completo).toLowerCase();
                const bolStr = toSafeString(m.boleta).toLowerCase();
                const empStr = toSafeString(m.num_empleado).toLowerCase();
                const telStr = toSafeString(m.telefono).toLowerCase();
                const alStr = toSafeString(m.alergias).toLowerCase();

                const coincideTexto = nomStr.includes(query) ||
                    bolStr.includes(query) ||
                    empStr.includes(query) ||
                    telStr.includes(query) ||
                    alStr.includes(query);

                if (!coincideTexto) {
                    const coincideContacto = Array.isArray(m.contactos) && m.contactos.some(c =>
                        toSafeString(c.nombre).toLowerCase().includes(query) ||
                        toSafeString(c.telefono).toLowerCase().includes(query) ||
                        toSafeString(c.parentesco).toLowerCase().includes(query)
                    );
                    if (!coincideContacto) return false;
                }
            }

            // 2. Filtro por tipo de sangre
            if (sangreFilter) {
                const s = toSafeString(m.tipo_sangre).trim().toUpperCase();
                if (s !== sangreFilter) return false;
            }

            // 3. Filtro por alergias
            if (soloConAlergias) {
                const al = toSafeString(m.alergias).trim().toLowerCase();
                if (!al || al === 'ninguna' || al === 'sin registrar' || al === 'n/a') return false;
            }

            // 4. Filtro por rol en el club
            if (rolFilter) {
                if (m.rol_en_club !== rolFilter) return false;
            }

            return true;
        });
    }, [miembros, deferredBusqueda, filtroSangre, filtroAlergias, filtroRol]);

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

                {/* Tarjetas KPI de Resumen (Optimizadas a 2 métricas claras) */}
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
                            if (kpiData.conAlergias > 0) setModalAlergiasAbierto(true);
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
                </div>

                {/* Panel de Control y Filtros de Accesibilidad Rápida (Sticky) */}
                <div className="emergencias-filtros-card no-print">
                    <div className="filtros-toolbar-top">
                        {/* Buscador instantáneo suave */}
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
                                className={`quick-pill ${filtroAlergias === 'todos' && filtroSangre === 'todos' && filtroRol === 'todos' && !busqueda ? 'active-default' : ''}`}
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
                        </div>
                    </div>

                    <div className="filtros-toolbar-bottom">
                        {/* Chips de acceso rápido por Tipo de Sangre */}
                        <div className="sangre-chips-bar">
                            <span className="sangre-chips-label">🩸 Sangre:</span>
                            {['todos', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((grupo) => {
                                const etiqueta = grupo === 'todos' ? 'Todos' : grupo;
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

                            {(busqueda || filtroSangre !== 'todos' || filtroAlergias !== 'todos' || filtroRol !== 'todos') && (
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
                        {miembrosFiltrados.map((m) => (
                            <MiembroCard
                                key={m.usuario_id}
                                m={m}
                                handleCopiar={handleCopiar}
                                telefonoCopiado={telefonoCopiado}
                            />
                        ))}
                    </div>
                )}

                {/* Modal de Detalle para Alergias / Condiciones Médicas */}
                {modalAlergiasAbierto && (
                    <div
                        className="no-print"
                        onClick={() => setModalAlergiasAbierto(false)}
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
                                    background: '#fffbeb'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                                    <div>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '1.1rem',
                                            fontWeight: '700',
                                            color: '#92400e'
                                        }}>
                                            Integrantes con Alergias o Condiciones Médicas
                                        </h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                            {miembrosConAlergias.length} persona(s) con datos médicos reportados
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalAlergiasAbierto(false)}
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
                                {miembrosConAlergias.map((m) => {
                                    const nombreCompleto = toSafeString(m.nombre_completo) || 'Usuario';
                                    const inicial = nombreCompleto.charAt(0).toUpperCase();
                                    const boleta = toSafeString(m.boleta);
                                    const numEmpleado = toSafeString(m.num_empleado);
                                    const identificador = boleta ? `Boleta: ${boleta}` : (numEmpleado ? `No. Emp: ${numEmpleado}` : 'Sin identificador');
                                    const tipoSangre = toSafeString(m.tipo_sangre);
                                    const alergias = toSafeString(m.alergias);

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
                                                            {nombreCompleto}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                            {identificador}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {getRolBadge(m.rol_en_club)}
                                                    {tipoSangre && (
                                                        <span className="badge-sangre">🩸 {tipoSangre}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="alergias-box" style={{ marginTop: '10px' }}>
                                                <strong>⚠️ Condición / Alergia:</strong> {alergias}
                                            </div>
                                        </div>
                                    );
                                })}
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
                                    onClick={() => setModalAlergiasAbierto(false)}
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
