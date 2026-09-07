import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/CrearClubPage.css'; // Importa el CSS para esta página
import './css/Dashboards.css'; // Importa el CSS del Dashboard principal

// Componente interno para selector con búsqueda (Autocomplete)
const SearchableSelect = ({ options, value, onChange, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Sincronizar el texto del input con el valor seleccionado (ID)
        const selected = options.find(o => o.id == value);
        if (selected) {
            setSearchTerm(`${selected.nombres} ${selected.apellidos} (Boleta: ${selected.boleta})`);
        } else if (!isOpen) {
            // Solo limpiar si no está abierto (el usuario no está escribiendo activamente)
            setSearchTerm('');
        }
    }, [value, options, isOpen]);

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Pequeño retraso para permitir capturar el click en la lista
                autoComplete="off"
            />
            {isOpen && (
                <ul style={{
                    position: 'absolute', top: '100%', left: 0, width: '100%',
                    maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white',
                    border: '1px solid #ccc', borderRadius: '0 0 8px 8px', zIndex: 1000,
                    listStyle: 'none', padding: 0, margin: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {options.filter(op => 
                        `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(op => (
                        <li key={op.id}
                            style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', color: '#333' }}
                            onMouseDown={() => { onChange(op.id); setIsOpen(false); }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f2f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                            {op.nombres} {op.apellidos} (Boleta: {op.boleta})
                        </li>
                    ))}
                    {options.filter(op => `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <li style={{ padding: '10px', color: '#999' }}>No se encontraron resultados</li>
                    )}
                </ul>
            )}
        </div>
    );
};

const MIN_ESTUDIANTES = 19;

// Componente interno para selector múltiple (Autocomplete para múltiples alumnos)
const MultiSearchableSelect = ({ options, selectedIds, onChange, placeholder, onRemoteSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (onRemoteSearch && searchTerm.trim().length >= 2) {
            onRemoteSearch(searchTerm.trim());
        }
    }, [searchTerm, onRemoteSearch]);

    const handleSelect = (id) => {
        if (!selectedIds.includes(id)) {
            onChange([...selectedIds, id]);
        }
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleRemove = (id) => {
        onChange(selectedIds.filter(selectedId => selectedId !== id));
    };

    const availableOptions = options.filter(op => !selectedIds.includes(op.id) && `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: selectedIds.length > 0 ? '10px' : '0' }}>
                {selectedIds.map(id => {
                    const op = options.find(o => o.id === id);
                    if (!op) return null;
                    return (
                        <span key={id} style={{ background: '#e1e5eb', color: '#1c1e21', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', border: '1px solid #d1d5db' }}>
                            {op.nombres} {op.apellidos}
                            <button type="button" onClick={() => handleRemove(id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 'bold', padding: '0 2px', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>×</button>
                        </span>
                    );
                })}
            </div>
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                autoComplete="off"
            />
            {isOpen && (
                <ul style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '0 0 8px 8px', zIndex: 1000, listStyle: 'none', padding: 0, margin: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {availableOptions.map(op => <li key={op.id} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', color: '#333' }} onMouseDown={() => handleSelect(op.id)} onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f2f5'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>{op.nombres} {op.apellidos} (Boleta: {op.boleta})</li>)}
                    {availableOptions.length === 0 && <li style={{ padding: '10px', color: '#999' }}>No se encontraron resultados</li>}
                </ul>
            )}
        </div>
    );
};

const CrearClubPage = () => {
    const { user, logout } = useAuth(); // Importamos el usuario actual y la función de salida
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [objetivo, setObjetivo] = useState('');
    const [cronograma, setCronograma] = useState([{ mes: '', actividad: '' }]);
    const [detalleActividades, setDetalleActividades] = useState('');
    const [espaciosTiempos, setEspaciosTiempos] = useState('');
    const [impacto, setImpacto] = useState('');
    const [profesorEncargadoId, setProfesorEncargadoId] = useState('');
    const [alumnoEncargadoId, setAlumnoEncargadoId] = useState(''); // Ahora almacenará el ID del alumno seleccionado
    const [miembrosIds, setMiembrosIds] = useState([]); // Nuevo estado para los miembros a agregar
    const [alumnosDisponibles, setAlumnosDisponibles] = useState([]); // Nuevo estado para los alumnos
    const [alumnosBuscados, setAlumnosBuscados] = useState([]);
    const [loadingAlumnos, setLoadingAlumnos] = useState(true); // Estado de carga para alumnos
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigate = useNavigate();
    // Preseleccionar al profesor actual automáticamente si es quien está creando el club
    useEffect(() => {
        // Cubrimos si viene como role_id o como rol desde el token
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
                setAlumnosDisponibles(response.data);
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
        try {
            const response = await api.get('/users', { params: { busqueda: termino } });
            const alumnos = response.data
                .filter((u) => [2, 4].includes(Number(u.role_id)))
                .map((u) => ({
                    id: u.id,
                    nombres: u.nombres,
                    apellidos: u.apellidos,
                    boleta: u.boleta
                }));
            setAlumnosBuscados(alumnos);
        } catch (err) {
            console.error('Error al buscar alumnos:', err);
        }
    };

    const opcionesAlumnos = React.useMemo(() => {
        const mapa = new Map();
        [...alumnosDisponibles, ...alumnosBuscados].forEach((alumno) => mapa.set(alumno.id, alumno));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Failsafe por si la página se recargó y el estado del profesor quedó vacío
        const finalProfesorId = profesorEncargadoId || user?.id || user?.usuario_id;

        if (!finalProfesorId || !alumnoEncargadoId) {
            setError('Error: No se pudo identificar al Profesor o falta seleccionar al Alumno Encargado.');
            setLoading(false);
            return;
        }

        // Obligar a que la lista total incluya al encargado y cumpla el mínimo del backend
        const alumnosArray = Array.from(new Set([Number(alumnoEncargadoId), ...miembrosIds.map(Number)])).filter(id => id > 0);
        if (alumnosArray.length < MIN_ESTUDIANTES) {
            setError(`Debes registrar al menos ${MIN_ESTUDIANTES} alumnos en total (incluyendo al encargado). Actualmente tienes ${alumnosArray.length}.`);
            setLoading(false);
            return;
        }

        // Validar que el cronograma no esté vacío
        if (cronograma.some(item => !item.mes.trim() || !item.actividad.trim())) {
            setError('Por favor, completa todos los campos del cronograma o elimina los que estén vacíos.');
            setLoading(false);
            return;
        }

        try {
            // Garantizar que todos los IDs sean estrictamente numéricos y sin duplicados
            const response = await api.post('/clubes', {
                nombre,
                descripcion,
                objetivo,
                cronograma: JSON.stringify(cronograma),
                detalle_actividades: detalleActividades,
                espacios_tiempos: espaciosTiempos,
                impacto,
                
                // Enviamos las diferentes variantes de nombre por si el backend busca otra
                profesor_encargado_id: Number(finalProfesorId),
                profesor_id: Number(finalProfesorId), 
                alumno_encargado_id: Number(alumnoEncargadoId),
                alumno_id: Number(alumnoEncargadoId),
                
                miembros_ids: alumnosArray, // ⬅️ CORRECCIÓN: El backend pide 'miembros_ids', no 'alumnos'
                lista_estudiantes: alumnosArray, // Añadimos esto para coincidir con el backend
                estatus: 'esperando_firmas', // Se cambia a 'esperando_firmas' para el flujo de recolección
                archivo_lista_estudiantes: 'pendiente.pdf' // Failsafe si la DB lo exige como NOT NULL
            });
            setSuccess('Club creado exitosamente: ' + response.data.message);
            // Opcional: Redirigir a otra página o limpiar el formulario
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
                    <div style={{ maxWidth: '900px', width: '100%', marginTop: '20px', display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '0 20px' }}>
                        <div className="crear-club-card" style={{ flex: 1, marginTop: '0', maxWidth: '100%' }}>
                <h1 className="crear-club-title">Crear Nuevo Club Deportivo</h1>
                <p className="crear-club-subtitle">Completa los datos para registrar un nuevo club.</p>

                <form onSubmit={handleSubmit} className="crear-club-form">
                    <div className="form-group">
                        <label htmlFor="nombre">Nombre del Club</label>
                        <input
                            type="text"
                            id="nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. Club de Ajedrez ESCOM"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="descripcion">Descripción</label>
                        <textarea
                            id="descripcion"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Breve descripción del club, sus actividades y objetivos."
                            rows="4"
                            required
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="objetivo">Objetivo del Club</label>
                        <textarea
                            id="objetivo"
                            value={objetivo}
                            onChange={(e) => setObjetivo(e.target.value)}
                            placeholder="¿Cuál es la meta principal de este club?"
                            rows="2"
                            required
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="cronograma">Cronograma (Plan de Trabajo)</label>
                        {cronograma.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Mes (ej. Agosto)"
                                    value={item.mes}
                                    onChange={(e) => handleCronogramaChange(index, 'mes', e.target.value)}
                                    required
                                    style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Actividad (ej. Reclutamiento)"
                                    value={item.actividad}
                                    onChange={(e) => handleCronogramaChange(index, 'actividad', e.target.value)}
                                    required
                                    style={{ flex: 2, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
                                />
                                {cronograma.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveCronogramaItem(index)}
                                        style={{ padding: '10px', background: '#fce8e6', color: '#e53935', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                        title="Eliminar actividad"
                                    >
                                        ✖
                                    </button>
                                )}
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={handleAddCronogramaItem}
                            style={{ display: 'inline-block', padding: '8px 12px', background: '#e1e5eb', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ➕ Agregar otra actividad
                        </button>
                    </div>
                    <div className="form-group">
                        <label htmlFor="detalleActividades">Detalle de Actividades</label>
                        <textarea
                            id="detalleActividades"
                            value={detalleActividades}
                            onChange={(e) => setDetalleActividades(e.target.value)}
                            placeholder="¿Qué actividades exactas se llevarán a cabo en las sesiones?"
                            rows="2"
                            required
                        ></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="espaciosTiempos">Espacios y Horarios propuestos</label>
                            <textarea id="espaciosTiempos" value={espaciosTiempos} onChange={(e) => setEspaciosTiempos(e.target.value)} placeholder="Lugar y días solicitados (Ej. Cancha Jueves 4pm)" rows="2" required></textarea>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="impacto">Impacto Esperado</label>
                            <textarea id="impacto" value={impacto} onChange={(e) => setImpacto(e.target.value)} placeholder="Beneficios para la comunidad escolar" rows="2" required></textarea>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="profesorEncargadoId">Profesor Encargado (Tú)</label>
                        <input 
                            type="text" 
                            value={`${user?.nombres || ''} ${user?.apellidos || user?.apellido_paterno || ''}`.trim()} 
                            disabled 
                            style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="alumnoEncargadoId">Alumno Encargado</label>
                        <SearchableSelect 
                            options={opcionesAlumnos}
                            value={alumnoEncargadoId}
                            onChange={(id) => setAlumnoEncargadoId(id)}
                            placeholder={loadingAlumnos ? "Cargando..." : "Buscar alumno por nombre o boleta..."}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="miembrosIds">Miembros del Club ({MIN_ESTUDIANTES} alumnos en total, incluyendo encargado)</label>
                        <MultiSearchableSelect 
                            options={opcionesAlumnos}
                            selectedIds={miembrosIds}
                            onChange={(ids) => setMiembrosIds(ids)}
                            onRemoteSearch={handleBuscarAlumnos}
                            placeholder={loadingAlumnos ? "Cargando..." : "Buscar y agregar alumnos (mín. 2 caracteres)..."}
                        />
                        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#666' }}>
                            Seleccionados: {Array.from(new Set([Number(alumnoEncargadoId), ...miembrosIds.map(Number)])).filter(id => id > 0).length} / {MIN_ESTUDIANTES}
                        </p>
                    </div>
                    <button type="submit" className="btn-crear-club" disabled={loading}>
                        {loading ? 'Creando...' : 'Registrar Club'}
                    </button>
                </form>

                {error && <div className="message-banner error">{error}</div>}
                {success && <div className="message-banner success">{success}</div>}
                <button onClick={() => navigate(user?.role_id === 1 ? '/admin' : '/gestion')} className="btn-back-to-gestion">🔙 Volver al Dashboard</button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CrearClubPage;