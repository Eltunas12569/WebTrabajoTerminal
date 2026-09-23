import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/Dashboards.css';

// Reutilizamos tu componente de búsqueda
const SearchableSelect = ({ options, value, onChange, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const selected = options.find(o => o.id == value);
        if (selected) setSearchTerm(`${selected.nombres} ${selected.apellidos} (Boleta: ${selected.boleta})`);
        else if (!isOpen) setSearchTerm('');
    }, [value, options, isOpen]);

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                className="login-input"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                autoComplete="off"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            {isOpen && (
                <ul style={{
                    position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white',
                    border: '1px solid #ccc', borderRadius: '0 0 8px 8px', zIndex: 1000, listStyle: 'none', padding: 0, margin: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {options.filter(op => `${op.nombres} ${op.apellidos} ${op.boleta}`.toLowerCase().includes(searchTerm.toLowerCase())).map(op => (
                        <li key={op.id} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onMouseDown={() => { onChange(op.id); setIsOpen(false); }} onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f2f5'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                            {op.nombres} {op.apellidos}{op.boleta ? ` (Boleta: ${op.boleta})` : ''}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const ClubDetailsAdminPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ nombre: '', descripcion: '', profesor_encargado_id: '', alumno_encargado_id: '' });
    
    const [profesores, setProfesores] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [rejectMotivo, setRejectMotivo] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [actionError, setActionError] = useState('');
    const [historialEncargados, setHistorialEncargados] = useState([]);
    const [miembros, setMiembros] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Cargar datos de clubes, profesores, alumnos, historial y miembros al mismo tiempo
                const [clubesRes, profRes, alumRes, histRes, miembrosRes] = await Promise.all([
                    api.get('/clubes'),
                    api.get('/users/professors'),
                    api.get('/users/students-in-charge'),
                    api.get(`/clubes/${id}/historial-encargados`).catch(() => ({ data: [] })),
                    api.get(`/clubes/${id}/miembros`).catch(() => ({ data: [] }))
                ]);

                const clubEncontrado = clubesRes.data.find((clubItem) => String(clubItem.id) === String(id));
                if (!clubEncontrado) {
                    throw new Error('Club no encontrado');
                }

                setClub(clubEncontrado);
                setEditData({
                    nombre: clubEncontrado.nombre || '',
                    descripcion: clubEncontrado.descripcion || '',
                    profesor_encargado_id: clubEncontrado.profesor_encargado_id || '',
                    alumno_encargado_id: clubEncontrado.alumno_encargado_id || ''
                });
                setProfesores(profRes.data);
                setAlumnos(alumRes.data);
                setHistorialEncargados(histRes.data || []);
                setMiembros(miembrosRes.data || []);
            } catch (error) {
                console.error('Error al cargar datos:', error);
                setActionError(error.response?.data?.message || error.message || 'No se pudo conectar con el servidor. ¿Reiniciaste el backend?');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSaveChanges = async () => {
        setSaving(true);
        setActionError('');
        try {
            await api.put(`/clubes/${id}`, {
                nombre: editData.nombre,
                descripcion: editData.descripcion,
                objetivo: club.objetivo,
                cronograma: club.cronograma,
                detalle_actividades: club.detalle_actividades,
                espacios_tiempos: club.espacios_tiempos,
                impacto: club.impacto,
                nuevo_profesor_id: editData.profesor_encargado_id,
                nuevo_alumno_id: editData.alumno_encargado_id
            });
            
            alert('Club y encargados actualizados correctamente.');
            window.location.reload();
        } catch (error) {
            setActionError(error.response?.data?.message || 'Error al actualizar.');
        } finally {
            setSaving(false);
        }
    };

    const handleApproveClub = async () => {
        setApproving(true);
        try {
            await api.put(`/clubes/${id}/aprobar`, {});
            navigate('/admin');
        } catch (error) {
            setActionError('Error al aprobar el club.');
        } finally {
            setApproving(false);
        }
    };

    const handleDeleteClub = async () => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este club? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/clubes/${id}`);
            navigate('/admin');
        } catch (error) {
            alert('No se pudo eliminar el club.');
        }
    };

    const handleRejectClub = async () => {
        if (!rejectMotivo.trim()) {
            setActionError('Debes indicar el motivo del rechazo.');
            return;
        }
        setActionLoading('rechazar');
        setActionError('');
        try {
            await api.put(`/clubes/${id}/rechazar`, { motivo: rejectMotivo.trim() });
            setShowRejectModal(false);
            navigate('/admin');
        } catch (error) {
            setActionError(error.response?.data?.message || 'Error al rechazar el club.');
        } finally {
            setActionLoading('');
        }
    };

    const handlePauseClub = async () => {
        if (!window.confirm('¿Pausar este club? Los miembros no podrán usar sus funciones activas.')) return;
        setActionLoading('pausar');
        setActionError('');
        try {
            await api.put(`/clubes/${id}/pausar`, {});
            setClub({ ...club, estatus: 'inactivo' });
        } catch (error) {
            setActionError(error.response?.data?.message || 'Error al pausar el club.');
        } finally {
            setActionLoading('');
        }
    };

    const handleReactivateClub = async () => {
        setActionLoading('reactivar');
        setActionError('');
        try {
            await api.put(`/clubes/${id}/reactivar`, {});
            setClub({ ...club, estatus: 'activo' });
        } catch (error) {
            setActionError(error.response?.data?.message || 'Error al reactivar el club.');
        } finally {
            setActionLoading('');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Cargando información del club...</div>;
    if (!club) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{actionError}</div>;

    return (
        <div style={{ minHeight: '100vh', width: '100vw', position: 'absolute', top: 0, left: 0, backgroundColor: '#f0f2f5', fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: 'hidden' }}>
            
            {/* Contenedor Principal (Abarca todo el ancho) */}
            <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
                
                {/* Barra de Navegación Interna Fija */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', boxSizing: 'border-box', borderBottom: '1px solid #e4e6eb', backgroundColor: '#003366', color: '#fff', position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
                    <h1 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '600' }}>
                        {isEditing ? '✏️ Editar Configuración del Club' : '🛡️ Perfil del Club'}
                    </h1>
                    <button onClick={() => navigate('/admin')} style={{ background: '#e4e6eb', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#1c1e21', transition: 'background 0.2s' }}>
                        🔙 Volver
                    </button>
                </div>

                {actionError && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', margin: '20px 5% 0', borderRadius: '8px' }}>{actionError}</div>}

                {isEditing ? (
                    <div style={{ padding: '40px 5%', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                        <div><label style={{ fontWeight: 'bold' }}>Nombre</label>
                            <input type="text" value={editData.nombre} onChange={(e) => setEditData({...editData, nombre: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
                        <div><label style={{ fontWeight: 'bold' }}>Descripción</label>
                            <textarea rows="4" value={editData.descripcion} onChange={(e) => setEditData({...editData, descripcion: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
                        <div><label style={{ fontWeight: 'bold' }}>Profesor Encargado</label>
                            <SearchableSelect options={profesores} value={editData.profesor_encargado_id} onChange={(id) => setEditData({...editData, profesor_encargado_id: id})} placeholder="Buscar..." /></div>
                        <div><label style={{ fontWeight: 'bold' }}>Alumno Encargado</label>
                            <SearchableSelect options={alumnos} value={editData.alumno_encargado_id} onChange={(id) => setEditData({...editData, alumno_encargado_id: id})} placeholder="Buscar..." /></div>
                        
                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                            <button onClick={handleSaveChanges} disabled={saving} style={{ flex: 1, padding: '12px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button>
                            <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ backgroundColor: '#f0f2f5', flex: 1, display: 'flex', flexDirection: 'column', marginTop: '65px', padding: '24px 30px' }}>
                        
                        {/* Cabecera Web Horizontal de Escritorio */}
                        <div style={{
                            maxWidth: '1200px',
                            margin: '0 auto 20px auto',
                            width: '100%',
                            background: '#ffffff',
                            borderRadius: '12px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                            border: '1px solid #e1e5eb',
                            overflow: 'hidden'
                        }}>
                            <div style={{ height: '6px', background: 'linear-gradient(90deg, #003366 0%, #800020 50%, #00509e 100%)' }} />
                            <div style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '300px' }}>
                                    <div style={{
                                        width: '74px',
                                        height: '74px',
                                        borderRadius: '14px',
                                        background: 'linear-gradient(135deg, #003366 0%, #00509e 100%)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2.5rem',
                                        boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
                                        flexShrink: 0
                                    }}>
                                        🏆
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#003366', fontWeight: '800' }}>{club.nombre}</h2>
                                            <span className={`club-tag tag-${club.estatus?.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                                                {club.estatus}
                                            </span>
                                        </div>
                                        <div style={{ color: '#666', fontSize: '0.9rem' }}>
                                            🛡️ Panel de Supervisión y Administración Institucional del Club
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {['en_revision', 'esperando_firmas'].includes(club.estatus) && (
                                        <>
                                            <button onClick={handleApproveClub} disabled={approving} style={{ padding: '10px 18px', background: '#1877f2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                                                {approving ? 'Aprobando...' : '✅ Aprobar Club'}
                                            </button>
                                            <button onClick={() => setShowRejectModal(true)} style={{ padding: '10px 18px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                ❌ Rechazar Club
                                            </button>
                                        </>
                                    )}
                                    {club.estatus === 'activo' && (
                                        <button onClick={handlePauseClub} disabled={actionLoading === 'pausar'} style={{ padding: '10px 18px', background: '#ffc107', color: '#1c1e21', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                            {actionLoading === 'pausar' ? 'Pausando...' : '⏸️ Pausar Club'}
                                        </button>
                                    )}
                                    {club.estatus === 'inactivo' && (
                                        <button onClick={handleReactivateClub} disabled={actionLoading === 'reactivar'} style={{ padding: '10px 18px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                            {actionLoading === 'reactivar' ? 'Reactivando...' : '▶️ Reactivar Club'}
                                        </button>
                                    )}
                                    <button onClick={() => setIsEditing(true)} style={{ padding: '10px 18px', background: '#e4e6eb', color: '#1c1e21', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                                        ✏️ Editar Encargados
                                    </button>
                                    <button onClick={handleDeleteClub} style={{ padding: '10px 18px', background: '#fce8e6', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Contenido: Acerca de y Equipo */}
                        <div style={{ padding: '40px 5%', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                            
                            {/* Motivo de Rechazo (Si aplica) */}
                            {club.estatus === 'rechazado' && club.motivo_rechazo && (
                                <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #dc3545' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#dc3545', fontWeight: '700' }}>⚠️ Motivo de Rechazo</h3>
                                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#333', lineHeight: '1.6' }}>{club.motivo_rechazo}</p>
                                </div>
                            )}

                            {/* Tarjeta de Información Detallada */}
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Detalles del Club</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1.05rem' }}>Descripción</h4>
                                        <p style={{ margin: 0, fontSize: '1rem', color: '#333', lineHeight: '1.5' }}>{club.descripcion}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1.05rem' }}>Objetivo</h4>
                                        <p style={{ margin: 0, fontSize: '1rem', color: '#333', lineHeight: '1.5' }}>{club.objetivo || 'No especificado'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1.05rem' }}>Detalle de Actividades</h4>
                                        <p style={{ margin: 0, fontSize: '1rem', color: '#333', lineHeight: '1.5' }}>{club.detalle_actividades || 'No especificado'}</p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1.05rem' }}>Espacios y Horarios Solicitados</h4>
                                            <p style={{ margin: 0, fontSize: '1rem', color: '#333', lineHeight: '1.5' }}>{club.espacios_tiempos || 'No especificados'}</p>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1.05rem' }}>Impacto Esperado</h4>
                                            <p style={{ margin: 0, fontSize: '1rem', color: '#333', lineHeight: '1.5' }}>{club.impacto || 'No especificado'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '25px', fontSize: '0.95rem', color: '#65676b', borderTop: '1px solid #e4e6eb', paddingTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                    <strong>📅 Fecha de creación:</strong> {new Date(club.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    {club.estatus === 'activo' && club.codigo_union && (
                                        <span><strong>🔑 Código de Unión:</strong> <span style={{ background: '#e1e5eb', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1c1e21' }}>{club.codigo_union}</span></span>
                                    )}
                                </div>
                            </div>

                            {/* Tarjeta Cronograma */}
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Cronograma de Actividades</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e4e6eb' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#003366', color: '#fff' }}>
                                                <th style={{ padding: '12px', textAlign: 'left', width: '25%' }}>Mes</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Actividad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                let cronogramaItems = [];
                                                try { cronogramaItems = typeof club.cronograma === 'string' ? JSON.parse(club.cronograma) : (club.cronograma || []); } catch (e) { cronogramaItems = []; }
                                                if (!Array.isArray(cronogramaItems) || cronogramaItems.length === 0) return <tr><td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#666' }}>No hay cronograma disponible.</td></tr>;
                                                return cronogramaItems.map((item, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                        <td style={{ padding: '12px', fontWeight: '600', color: '#333' }}>{item.mes}</td>
                                                        <td style={{ padding: '12px', color: '#555' }}>{item.actividad}</td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Tarjeta Equipo Encargado */}
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Personas a Cargo</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {/* Profesor */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', border: '1px solid #e4e6eb', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                        <img 
                                            src={`https://ui-avatars.com/api/?name=${club.profesor_nombres}+${club.profesor_apellidos}&background=003366&color=fff&size=120`} 
                                            alt="Profesor" 
                                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#050505', fontSize: '1.2rem', fontWeight: '700' }}>{club.profesor_nombres} {club.profesor_apellidos}</h4>
                                            <p style={{ margin: '0 0 8px 0', color: '#003366', fontSize: '0.95rem', fontWeight: '600' }}>👨‍🏫 Profesor Encargado</p>
                                            <p style={{ margin: '0 0 4px 0', color: '#444', fontSize: '0.9rem' }}>✉️ <strong>Correo:</strong> {club.profesor_correo || 'No registrado'}</p>
                                            <p style={{ margin: 0, color: '#444', fontSize: '0.9rem' }}>💼 <strong>Núm. Empleado:</strong> {club.profesor_num_empleado || 'No registrado'}</p>
                                        </div>
                                    </div>

                                    {/* Alumno */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', border: '1px solid #e4e6eb', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                        <img 
                                            src={`https://ui-avatars.com/api/?name=${club.alumno_nombres}+${club.alumno_apellidos}&background=1E8449&color=fff&size=120`} 
                                            alt="Alumno" 
                                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#050505', fontSize: '1.2rem', fontWeight: '700' }}>{club.alumno_nombres} {club.alumno_apellidos}</h4>
                                            <p style={{ margin: '0 0 8px 0', color: '#1E8449', fontSize: '0.95rem', fontWeight: '600' }}>🎓 Alumno Encargado</p>
                                            <p style={{ margin: '0 0 4px 0', color: '#444', fontSize: '0.9rem' }}>✉️ <strong>Correo:</strong> {club.alumno_correo || 'No registrado'}</p>
                                            <p style={{ margin: 0, color: '#444', fontSize: '0.9rem' }}>🆔 <strong>Boleta:</strong> {club.alumno_boleta || 'No registrada'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta Auditoría Historial de Encargados */}
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>
                                    📜 Historial de Encargados Anteriores (Auditoría)
                                </h3>
                                {historialEncargados.length === 0 ? (
                                    <p style={{ color: '#666', margin: 0 }}>No hay encargados registrados previamente en el historial de este club.</p>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e4e6eb' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#003366', color: '#fff' }}>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Nombre</th>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Cargo</th>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Contacto / ID</th>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Período</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historialEncargados.map((h, idx) => (
                                                    <tr key={h.id || idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                        <td style={{ padding: '10px', fontWeight: '600' }}>{h.nombre_completo}</td>
                                                        <td style={{ padding: '10px' }}>
                                                            <span style={{ fontSize: '0.85rem', padding: '3px 8px', borderRadius: '12px', background: h.rol_en_club === 'encargado_profesor' ? '#e7f3ff' : '#e6f4ea', color: h.rol_en_club === 'encargado_profesor' ? '#003366' : '#1e8449', fontWeight: 'bold' }}>
                                                                {h.rol_en_club === 'encargado_profesor' ? 'Profesor' : 'Alumno Líder'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px', fontSize: '0.9rem', color: '#555' }}>
                                                            {h.correo} {h.num_empleado ? `· EMP: ${h.num_empleado}` : h.boleta ? `· Boleta: ${h.boleta}` : ''}
                                                        </td>
                                                        <td style={{ padding: '10px', fontSize: '0.9rem', color: '#666' }}>
                                                            {h.fecha_inicio ? new Date(h.fecha_inicio).toLocaleDateString('es-MX') : '—'} hasta {h.fecha_fin ? new Date(h.fecha_fin).toLocaleDateString('es-MX') : 'Actual'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Tarjeta Auditoría Miembros del Club */}
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1c1e21', fontWeight: '700' }}>
                                        👥 Miembros Inscritos en el Club
                                    </h3>
                                    <span style={{ fontSize: '0.85rem', background: '#e7f3ff', color: '#003366', padding: '4px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
                                        Total: {miembros.length}
                                    </span>
                                </div>
                                {miembros.length === 0 ? (
                                    <p style={{ color: '#666', margin: 0 }}>No hay miembros inscritos actualmente en este club.</p>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e4e6eb' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#003366', color: '#fff' }}>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Nombre</th>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Boleta</th>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Rol en Club</th>
                                                    <th style={{ padding: '10px', textAlign: 'center' }}>Estatus</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {miembros.map((m, idx) => (
                                                    <tr key={m.id || idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                        <td style={{ padding: '10px', fontWeight: '600', color: '#333' }}>
                                                            {m.nombres} {m.apellidos}
                                                        </td>
                                                        <td style={{ padding: '10px', color: '#666', fontFamily: 'monospace' }}>
                                                            {m.boleta || '—'}
                                                        </td>
                                                        <td style={{ padding: '10px' }}>
                                                            <span style={{
                                                                fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold',
                                                                background: m.rol_en_club === 'encargado_profesor' ? '#e7f3ff' : m.rol_en_club === 'encargado_alumno' ? '#e6f4ea' : '#f0f2f5',
                                                                color: m.rol_en_club === 'encargado_profesor' ? '#003366' : m.rol_en_club === 'encargado_alumno' ? '#1e8449' : '#555'
                                                            }}>
                                                                {m.rol_en_club === 'encargado_profesor' ? 'Profesor Encargado' : m.rol_en_club === 'encargado_alumno' ? 'Alumno Encargado' : 'Miembro'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: '0.8rem', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold',
                                                                background: m.estatus === 'activo' ? '#d4edda' : '#fff3cd',
                                                                color: m.estatus === 'activo' ? '#155724' : '#856404'
                                                            }}>
                                                                {m.estatus === 'activo' ? '✓ Activo' : '⏳ Pendiente'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showRejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowRejectModal(false)}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', width: '90%', maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, color: '#dc3545' }}>Rechazar club</h3>
                        <p style={{ color: '#555' }}>Indica el motivo del rechazo. Será visible para los encargados.</p>
                        <textarea
                            rows="4"
                            value={rejectMotivo}
                            onChange={(e) => setRejectMotivo(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRejectModal(false)} style={{ padding: '10px 16px', border: 'none', borderRadius: '6px', background: '#e4e6eb', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                            <button onClick={handleRejectClub} disabled={actionLoading === 'rechazar'} style={{ padding: '10px 16px', border: 'none', borderRadius: '6px', background: '#dc3545', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                                {actionLoading === 'rechazar' ? 'Rechazando...' : 'Confirmar rechazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClubDetailsAdminPage;