import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/CrearClubPage.css';
import './css/Dashboards.css';
import Sidebar from '../components/Sidebar';

// Icono vectorial de búsqueda
const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
);

// Validación estricta para garantizar que solo se listen y seleccionen alumnos (nunca profesores ni personal docente)
const esAlumnoValido = (u) => {
    if (!u) return false;
    const rol = Number(u.role_id || u.rol || 0);

    // 1. Excluir explícitamente rol de profesor (3) y administrador (1)
    if (rol === 3 || rol === 1) return false;

    // 2. Excluir si tiene número de empleado registrado (incluso si rol fuese 4 o 2 en DB)
    if (u.num_empleado && String(u.num_empleado).trim() !== '' && String(u.num_empleado).trim().toLowerCase() !== 'null') {
        return false;
    }

    // 3. Excluir si el nombre o apellido contiene la palabra "Profesor", "Profesora", "Docente" o "Prof."
    const nombreCompleto = `${u.nombres || ''} ${u.apellidos || ''}`.toLowerCase();
    if (nombreCompleto.includes('profesor') || nombreCompleto.includes('docente') || /\bprof\b/i.test(nombreCompleto)) {
        return false;
    }

    // 4. Obligatorio: debe contar con una boleta de estudiante válida
    const boleta = String(u.boleta || '').trim();
    if (!boleta || boleta.toLowerCase() === 'null' || boleta.toLowerCase() === 'undefined' || boleta === '0') {
        return false;
    }

    return true;
};

// Componente interno para selector con búsqueda (Autocomplete para Alumno Encargado)
const SearchableSelect = ({ options, value, onChange, placeholder, onRemoteSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (onRemoteSearch && searchTerm.trim().length >= 2) {
            onRemoteSearch(searchTerm.trim());
        }
    }, [searchTerm, onRemoteSearch]);

    useEffect(() => {
        const selected = options.find(o => o.id == value);
        if (selected) {
            setSearchTerm(`${selected.nombres} ${selected.apellidos} (Boleta: ${selected.boleta})`);
        } else if (!isOpen) {
            setSearchTerm('');
        }
    }, [value, options, isOpen]);

    const filteredOptions = options
        .filter(esAlumnoValido)
        .filter(op =>
            `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="searchable-select-wrapper">
            <div className="searchable-input-box">
                <span className="searchable-input-icon">
                    <SearchIcon />
                </span>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    autoComplete="off"
                />
            </div>
            {isOpen && (
                <ul className="searchable-dropdown">
                    {filteredOptions.map(op => (
                        <li
                            key={op.id}
                            className="searchable-option-item"
                            onMouseDown={() => {
                                onChange(op.id);
                                setIsOpen(false);
                            }}
                        >
                            <span className="option-student-name">
                                {op.nombres} {op.apellidos}
                            </span>
                            <span className="option-boleta-badge">
                                Boleta: {op.boleta}
                            </span>
                        </li>
                    ))}
                    {filteredOptions.length === 0 && (
                        <li className="searchable-empty">No se encontraron alumnos con ese criterio</li>
                    )}
                </ul>
            )}
        </div>
    );
};

const MIN_ESTUDIANTES = 20;

const MESES_DEL_ANO = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
];

// Componente interno para selector múltiple (Autocomplete para plantilla de miembros)
const MultiSearchableSelect = ({ options, selectedIds, leaderId, onChange, placeholder, onRemoteSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (onRemoteSearch && searchTerm.trim().length >= 2) {
            onRemoteSearch(searchTerm.trim());
        }
    }, [searchTerm, onRemoteSearch]);

    const handleSelect = (id) => {
        if (!selectedIds.includes(id) && Number(id) !== Number(leaderId)) {
            onChange([...selectedIds, id]);
        }
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleRemove = (id) => {
        onChange(selectedIds.filter(selectedId => selectedId !== id));
    };

    const availableOptions = options
        .filter(esAlumnoValido)
        .filter(op =>
            !selectedIds.includes(op.id) &&
            Number(op.id) !== Number(leaderId) &&
            `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const leaderObj = options.find(o => Number(o.id) === Number(leaderId));

    return (
        <div className="searchable-select-wrapper">
            <div className="searchable-input-box">
                <span className="searchable-input-icon">
                    <SearchIcon />
                </span>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    autoComplete="off"
                />
            </div>

            {isOpen && (
                <ul className="searchable-dropdown">
                    {availableOptions.map(op => (
                        <li
                            key={op.id}
                            className="searchable-option-item"
                            onMouseDown={() => handleSelect(op.id)}
                        >
                            <span className="option-student-name">
                                {op.nombres} {op.apellidos}
                            </span>
                            <span className="option-boleta-badge">
                                Boleta: {op.boleta}
                            </span>
                        </li>
                    ))}
                    {availableOptions.length === 0 && (
                        <li className="searchable-empty">No se encontraron resultados disponibles</li>
                    )}
                </ul>
            )}

            {(leaderObj || selectedIds.length > 0) && (
                <div className="selected-students-container">
                    {leaderObj && (
                        <span className="student-chip leader-chip" title="Alumno Encargado del Club">
                            ⭐ {leaderObj.nombres} {leaderObj.apellidos} (Encargado)
                        </span>
                    )}
                    {selectedIds.map(id => {
                        const op = options.find(o => o.id === id);
                        if (!op) return null;
                        return (
                            <span key={id} className="student-chip">
                                {op.nombres} {op.apellidos}
                                <button
                                    type="button"
                                    className="student-chip-remove"
                                    onClick={() => handleRemove(id)}
                                    title="Quitar alumno de la lista"
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const CrearClubPage = () => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [objetivo, setObjetivo] = useState('');
    const [cronograma, setCronograma] = useState([{ mes: '', actividad: '' }]);
    const [detalleActividades, setDetalleActividades] = useState('');
    const [espaciosTiempos, setEspaciosTiempos] = useState('');
    const [impacto, setImpacto] = useState('');
    const [profesorEncargadoId, setProfesorEncargadoId] = useState('');
    const [alumnoEncargadoId, setAlumnoEncargadoId] = useState('');
    const [miembrosIds, setMiembrosIds] = useState([]);
    const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
    const [alumnosBuscados, setAlumnosBuscados] = useState([]);
    const [loadingAlumnos, setLoadingAlumnos] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [createdClubSuccess, setCreatedClubSuccess] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigate = useNavigate();

    // Preseleccionar al profesor actual automáticamente si es quien está creando el club
    useEffect(() => {
        if (user?.role_id === 3 || user?.rol === 3) {
            setProfesorEncargadoId(user.id || user.usuario_id);
        }
    }, [user]);

    // Cargar la lista de alumnos encargados y alumnos al montar el componente
    useEffect(() => {
        const fetchAlumnos = async () => {
            try {
                setLoadingAlumnos(true);
                const response = await api.get('/users/students-in-charge');
                const soloAlumnos = (response.data || []).filter(esAlumnoValido);
                setAlumnosDisponibles(soloAlumnos);
            } catch (err) {
                console.error("Error al cargar alumnos encargados:", err);
                setError('No se pudieron cargar los alumnos disponibles.');
            } finally {
                setLoadingAlumnos(false);
            }
        };
        fetchAlumnos();
    }, []);

    const handleBuscarAlumnos = async (termino) => {
        if (!termino || termino.trim().length < 2) return;
        try {
            const response = await api.get('/users', { params: { busqueda: termino } });
            const alumnos = (response.data || [])
                .filter(esAlumnoValido)
                .map((u) => ({
                    id: u.id,
                    nombres: u.nombres,
                    apellidos: u.apellidos,
                    boleta: u.boleta,
                    role_id: u.role_id,
                    num_empleado: u.num_empleado
                }));
            setAlumnosBuscados(prev => {
                const map = new Map();
                prev.filter(esAlumnoValido).forEach(p => map.set(p.id, p));
                alumnos.forEach(a => map.set(a.id, a));
                return Array.from(map.values());
            });
        } catch (err) {
            console.error('Error al buscar alumnos:', err);
        }
    };

    const opcionesAlumnos = React.useMemo(() => {
        const mapa = new Map();
        [...alumnosDisponibles, ...alumnosBuscados]
            .filter(esAlumnoValido)
            .forEach((alumno) => mapa.set(alumno.id, alumno));
        return Array.from(mapa.values());
    }, [alumnosDisponibles, alumnosBuscados]);

    const handleAddCronogramaItem = () => {
        setCronograma([...cronograma, { mes: '', actividad: '' }]);
    };

    const handleCronogramaChange = (index, field, value) => {
        const newCronograma = [...cronograma];
        newCronograma[index][field] = value;
        setCronograma(newCronograma);
    };

    const handleRemoveCronogramaItem = (index) => {
        const newCronograma = cronograma.filter((_, i) => i !== index);
        setCronograma(newCronograma);
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

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(user?.role_id === 1 ? '/admin' : '/gestion');
        }
    };

    // Total de alumnos únicos seleccionados (incluyendo al encargado)
    const totalSeleccionados = Array.from(
        new Set([Number(alumnoEncargadoId), ...miembrosIds.map(Number)])
    ).filter(id => id > 0).length;

    const porcentajeProgreso = Math.min(100, Math.round((totalSeleccionados / MIN_ESTUDIANTES) * 100));
    const metaCumplida = totalSeleccionados >= MIN_ESTUDIANTES;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const finalProfesorId = profesorEncargadoId || user?.id || user?.usuario_id;

        if (!finalProfesorId || !alumnoEncargadoId) {
            setError('Error: No se pudo identificar al Profesor o falta seleccionar al Alumno Encargado.');
            setLoading(false);
            return;
        }

        const alumnoEncargadoObj = opcionesAlumnos.find(o => Number(o.id) === Number(alumnoEncargadoId));
        if (alumnoEncargadoObj && !esAlumnoValido(alumnoEncargadoObj)) {
            setError('Error: El encargado del club debe ser un alumno registrado con boleta válida.');
            setLoading(false);
            return;
        }

        const alumnosArray = Array.from(new Set([Number(alumnoEncargadoId), ...miembrosIds.map(Number)]))
            .filter(id => id > 0)
            .filter(id => {
                const u = opcionesAlumnos.find(o => Number(o.id) === Number(id));
                return !u || esAlumnoValido(u);
            });

        if (alumnosArray.length < MIN_ESTUDIANTES) {
            setError(`Debes registrar al menos ${MIN_ESTUDIANTES} alumnos en total (incluyendo al encargado). Actualmente tienes ${alumnosArray.length}.`);
            setLoading(false);
            return;
        }

        if (cronograma.some(item => !item.mes.trim() || !item.actividad.trim())) {
            setError('Por favor, completa todos los campos del cronograma o elimina los que estén vacíos.');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/clubes', {
                nombre,
                descripcion,
                objetivo,
                cronograma: JSON.stringify(cronograma),
                detalle_actividades: detalleActividades,
                espacios_tiempos: espaciosTiempos,
                impacto,
                profesor_encargado_id: Number(finalProfesorId),
                profesor_id: Number(finalProfesorId), 
                alumno_encargado_id: Number(alumnoEncargadoId),
                alumno_id: Number(alumnoEncargadoId),
                miembros_ids: alumnosArray,
                lista_estudiantes: alumnosArray,
                estatus: 'esperando_firmas',
                archivo_lista_estudiantes: 'pendiente.pdf'
            });
            const newClubId = response.data?.clubId;
            setCreatedClubSuccess({
                id: newClubId,
                nombre: nombre,
                totalMiembros: alumnosArray.length
            });
            setSuccess('Club creado exitosamente: ' + response.data.message);
            setNombre('');
            setDescripcion('');
            setObjetivo('');
            setCronograma([{ mes: '', actividad: '' }]);
            setDetalleActividades('');
            setEspaciosTiempos('');
            setImpacto('');
            setAlumnoEncargadoId('');
            setMiembrosIds([]);
        } catch (err) {
            console.error("Error al crear el club:", err);
            setError(err.response?.data?.message || 'Error al crear el club. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const nombreProfesor = `${user?.nombres || ''} ${user?.apellidos || user?.apellido_paterno || ''}`.trim() || 'Profesor en sesión';

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
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main className="admin-main-scroll crear-club-main">
                    <div className="crear-club-wrapper">
                        {/* CABECERA DE LA PÁGINA */}
                        <div className="crear-club-header-card">
                            <div className="crear-club-header-left">
                                <div>
                                    <p className="crear-club-eyebrow">SISTEMA DE GESTIÓN DEPORTIVA Y CULTURAL · ESCOM IPN</p>
                                    <h1 className="crear-club-title">Registrar Nuevo Club</h1>
                                    <p className="crear-club-subtitle">
                                        Completa el expediente técnico, el plan de trabajo y la plantilla mínima de {MIN_ESTUDIANTES} estudiantes.
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={handleBack} className="btn-volver-modern">
                                <span className="btn-volver-icon">←</span>
                                <span>Volver</span>
                            </button>
                        </div>

                        {/* BANNERS DE ESTADO */}
                        {error && (
                            <div className="message-banner error">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="message-banner success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>✅</span>
                                    <span>{success}</span>
                                </div>
                                {createdClubSuccess && (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/gestion', { state: { openSignaturesClubId: createdClubSuccess.id } })}
                                        style={{
                                            padding: '6px 14px',
                                            backgroundColor: '#15803d',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        ✍️ Ver Firmas del Club
                                    </button>
                                )}
                            </div>
                        )}

                        {/* FORMULARIO EN GRID DE 2 COLUMNAS PARA ESCRITORIO */}
                        <form onSubmit={handleSubmit} className="crear-club-form">
                            <div className="crear-club-desktop-grid">
                                {/* COLUMNA IZQUIERDA: IDENTIDAD Y PLAN DE TRABAJO */}
                                <div className="crear-club-col">
                                    {/* SECCIÓN 1: IDENTIDAD Y PROPUESTA */}
                                    <section className="club-section-card">
                                        <div className="section-card-header">
                                            <div className="section-card-badge">1</div>
                                            <div className="section-card-title-group">
                                                <h2>Identidad y Propuesta del Club</h2>
                                                <p>Información general, propósito, horarios e impacto institucional</p>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="nombre">
                                                <span>Nombre Oficial del Club <span className="label-required">*</span></span>
                                            </label>
                                            <input
                                                type="text"
                                                id="nombre"
                                                value={nombre}
                                                onChange={(e) => setNombre(e.target.value)}
                                                placeholder="Ej. Club de Ajedrez o Robótica ESCOM"
                                                required
                                            />
                                        </div>

                                        <div className="form-row-2col">
                                            <div className="form-group">
                                                <label htmlFor="descripcion">
                                                    <span>Descripción General <span className="label-required">*</span></span>
                                                </label>
                                                <textarea
                                                    id="descripcion"
                                                    value={descripcion}
                                                    onChange={(e) => setDescripcion(e.target.value)}
                                                    placeholder="Describe de qué trata el club y su enfoque principal..."
                                                    rows="3"
                                                    required
                                                ></textarea>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="objetivo">
                                                    <span>Objetivo del Club <span className="label-required">*</span></span>
                                                </label>
                                                <textarea
                                                    id="objetivo"
                                                    value={objetivo}
                                                    onChange={(e) => setObjetivo(e.target.value)}
                                                    placeholder="¿Cuál es la meta formativa o competitiva del club?"
                                                    rows="3"
                                                    required
                                                ></textarea>
                                            </div>
                                        </div>

                                        <div className="form-row-2col">
                                            <div className="form-group">
                                                <label htmlFor="espaciosTiempos">
                                                    <span>Espacios y Horarios Propuestos <span className="label-required">*</span></span>
                                                </label>
                                                <textarea
                                                    id="espaciosTiempos"
                                                    value={espaciosTiempos}
                                                    onChange={(e) => setEspaciosTiempos(e.target.value)}
                                                    placeholder="Ej. Canchas o Salón 1104 · Martes y Jueves 14:00 - 16:00"
                                                    rows="2"
                                                    required
                                                ></textarea>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="impacto">
                                                    <span>Impacto Esperado <span className="label-required">*</span></span>
                                                </label>
                                                <textarea
                                                    id="impacto"
                                                    value={impacto}
                                                    onChange={(e) => setImpacto(e.target.value)}
                                                    placeholder="Beneficios para la formación integral de la comunidad..."
                                                    rows="2"
                                                    required
                                                ></textarea>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="detalleActividades">
                                                <span>Detalle de Actividades en Sesiones <span className="label-required">*</span></span>
                                            </label>
                                            <textarea
                                                id="detalleActividades"
                                                value={detalleActividades}
                                                onChange={(e) => setDetalleActividades(e.target.value)}
                                                placeholder="Describe qué dinámicas, entrenamientos o prácticas se llevarán a cabo..."
                                                rows="2"
                                                required
                                            ></textarea>
                                        </div>
                                    </section>

                                    {/* SECCIÓN 2: CRONOGRAMA */}
                                    <section className="club-section-card">
                                        <div className="section-card-header">
                                            <div className="section-card-badge">2</div>
                                            <div className="section-card-title-group">
                                                <h2>Cronograma de Trabajo</h2>
                                                <p>Planeación mensual de actividades, torneos o sesiones</p>
                                            </div>
                                        </div>

                                        <div className="cronograma-header-row">
                                            <span>#</span>
                                            <span>Mes</span>
                                            <span>Actividad u Objetivo Programado</span>
                                            <span></span>
                                        </div>

                                        <div className="cronograma-list">
                                            {cronograma.map((item, index) => (
                                                <div key={index} className="cronograma-row">
                                                    <div className="cronograma-num-badge" title={`Actividad #${index + 1}`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="cronograma-field-mes">
                                                        <select
                                                            className="cronograma-select-mes"
                                                            value={item.mes}
                                                            onChange={(e) => handleCronogramaChange(index, 'mes', e.target.value)}
                                                            required
                                                        >
                                                            <option value="" disabled>Selecciona mes...</option>
                                                            {MESES_DEL_ANO.map((mes) => (
                                                                <option key={mes} value={mes}>
                                                                    {mes}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="cronograma-field-actividad">
                                                        <input
                                                            type="text"
                                                            className="cronograma-input-actividad"
                                                            placeholder="Ej. Convocatoria y reclutamiento, taller, torneo..."
                                                            value={item.actividad}
                                                            onChange={(e) => handleCronogramaChange(index, 'actividad', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="cronograma-field-action">
                                                        {cronograma.length > 1 ? (
                                                            <button
                                                                type="button"
                                                                className="btn-remove-cronograma"
                                                                onClick={() => handleRemoveCronogramaItem(index)}
                                                                title="Eliminar fila del cronograma"
                                                                aria-label="Eliminar fila"
                                                            >
                                                                ✕
                                                            </button>
                                                        ) : (
                                                            <div className="cronograma-action-placeholder" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-add-cronograma"
                                            onClick={handleAddCronogramaItem}
                                        >
                                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>➕</span>
                                            <span>Agregar otra actividad al cronograma</span>
                                        </button>
                                    </section>
                                </div>

                                {/* COLUMNA DERECHA: RESPONSABLES Y PLANTILLA DE ALUMNOS */}
                                <div className="crear-club-col">
                                    {/* SECCIÓN 3: RESPONSABLES */}
                                    <section className="club-section-card">
                                        <div className="section-card-header">
                                            <div className="section-card-badge guinda">3</div>
                                            <div className="section-card-title-group">
                                                <h2>Cuerpo Directivo del Club</h2>
                                                <p>Docente titular responsable y estudiante representante</p>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Profesor Encargado (Titular)</label>
                                            <div className="profesor-readonly-box">
                                                <div className="profesor-readonly-info">
                                                    <span>🎓</span>
                                                    <span>{nombreProfesor}</span>
                                                </div>
                                                <span className="profesor-badge-tag">✓ Titular Asignado</span>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="alumnoEncargadoId">
                                                <span>Alumno Encargado (Representante) <span className="label-required">*</span></span>
                                            </label>
                                            <SearchableSelect
                                                options={opcionesAlumnos}
                                                value={alumnoEncargadoId}
                                                onChange={(id) => setAlumnoEncargadoId(id)}
                                                onRemoteSearch={handleBuscarAlumnos}
                                                placeholder={loadingAlumnos ? "Cargando padrón de alumnos..." : "Buscar por nombre, apellido o boleta..."}
                                            />
                                        </div>
                                    </section>

                                    {/* SECCIÓN 4: PLANTILLA DE MIEMBROS */}
                                    <section className="club-section-card">
                                        <div className="section-card-header">
                                            <div className="section-card-badge guinda">4</div>
                                            <div className="section-card-title-group">
                                                <h2>Plantilla de Estudiantes Integrantes</h2>
                                                <p>Se requiere un mínimo de {MIN_ESTUDIANTES} alumnos (incluyendo al encargado)</p>
                                            </div>
                                        </div>

                                        {/* Barra de progreso interactiva */}
                                        <div className="members-progress-card">
                                            <div className="members-progress-top">
                                                <span className="members-count-label">
                                                    Progreso de registro de integrantes
                                                </span>
                                                <span className={`members-count-badge ${metaCumplida ? 'complete' : 'pending'}`}>
                                                    {totalSeleccionados} / {MIN_ESTUDIANTES} alumnos {metaCumplida ? '✓' : ''}
                                                </span>
                                            </div>
                                            <div className="members-progress-bar-bg">
                                                <div
                                                    className={`members-progress-bar-fill ${metaCumplida ? 'complete' : ''}`}
                                                    style={{ width: `${porcentajeProgreso}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="miembrosIds">
                                                <span>Agregar Miembros al Club <span className="label-required">*</span></span>
                                            </label>
                                            <MultiSearchableSelect
                                                options={opcionesAlumnos}
                                                selectedIds={miembrosIds}
                                                leaderId={alumnoEncargadoId}
                                                onChange={(ids) => setMiembrosIds(ids)}
                                                onRemoteSearch={handleBuscarAlumnos}
                                                placeholder={loadingAlumnos ? "Cargando..." : "Escribe nombre o boleta para agregar alumnos..."}
                                            />
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* BARRA INFERIOR DE ACCIONES */}
                            <div className="crear-club-footer-actions">
                                <p className="footer-hint-text">
                                    📋 Al registrar el club, el estatus pasará a <strong>Esperando Firmas</strong> para que los estudiantes confirmen su participación.
                                </p>
                                <div className="footer-buttons-group">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="btn-cancelar-club"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-crear-club"
                                        disabled={loading}
                                    >
                                        {loading ? 'Registrando Club...' : '🚀 Registrar y Enviar Solicitud'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

            {/* Modal de Confirmación y Acceso a Firmas tras Registro */}
            {createdClubSuccess && (
                <div className="club-details-overlay" onClick={() => setCreatedClubSuccess(null)}>
                    <div 
                        className="club-details-modal" 
                        onClick={e => e.stopPropagation()} 
                        style={{ maxWidth: '560px', width: '92%', textAlign: 'center', padding: '36px 28px', borderRadius: '18px' }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                        <h2 style={{ color: '#003366', fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
                            ¡Club Registrado Exitosamente!
                        </h2>
                        <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: '1.5', marginBottom: '20px' }}>
                            El club <strong>"{createdClubSuccess.nombre}"</strong> ha sido creado y su estado actual es <strong>Esperando Firmas</strong> con <strong>{createdClubSuccess.totalMiembros}</strong> estudiantes integrantes registrados.
                        </p>
                        
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '0.9rem', color: '#166534', lineHeight: '1.45' }}>
                            <div style={{ fontWeight: '700', marginBottom: '4px' }}>📋 Próximo paso:</div>
                            Los {createdClubSuccess.totalMiembros} estudiantes deben ingresar al sistema con su cuenta para firmar su conformidad. En cuanto se cuente con al menos <strong>20 firmas</strong>, el expediente se podrá enviar a revisión institucional.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/gestion', { state: { openSignaturesClubId: createdClubSuccess.id } })}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#800020',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '0.98rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(128, 0, 32, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                ✍️ Ver Control de Firmas de Este Club
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/gestion')}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    fontSize: '0.92rem',
                                    cursor: 'pointer'
                                }}
                            >
                                📋 Ir a Mi Panel de Gestión
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreatedClubSuccess(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    padding: '6px'
                                }}
                            >
                                ➕ Registrar otro club
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrearClubPage;