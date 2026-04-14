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
                            {op.nombres} {op.apellidos} (Boleta: {op.boleta})
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
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Cargar datos de clubes, profesores y alumnos al mismo tiempo
                const [clubesRes, profRes, alumRes] = await Promise.all([
                    api.get('/clubes'),
                    api.get('/users/professors'),
                    api.get('/users/students-in-charge')
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
                    <div style={{ backgroundColor: '#f0f2f5', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        
                        {/* Portada y Foto de Perfil (Estilo Facebook) */}
                        <div style={{ position: 'relative', width: '100%', height: '300px', background: 'linear-gradient(135deg, #003366 0%, #00509e 100%)', display: 'flex', justifyContent: 'center' }}>
                            {/* Foto de Perfil */}
                            <div style={{ 
                                position: 'absolute', bottom: '-65px', width: '150px', height: '150px', 
                                backgroundColor: '#fff', borderRadius: '50%', border: '5px solid #fff', 
                                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '5rem', 
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2
                            }}>
                                🏆
                            </div>
                        </div>

                        {/* Cabecera: Nombre y Botones */}
                        <div style={{ padding: '80px 5% 25px 5%', backgroundColor: '#fff', textAlign: 'center', borderBottom: '1px solid #e4e6eb' }}>
                            <h2 style={{ margin: '0 0 10px 0', fontSize: '2.4rem', color: '#1c1e21', fontWeight: '800' }}>{club.nombre}</h2>
                            <span className={`club-tag tag-${club.estatus?.toLowerCase()}`} style={{ fontSize: '1rem', padding: '6px 15px', display: 'inline-block', marginBottom: '25px' }}>
                                {club.estatus}
                            </span>
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                {club.estatus === 'en_revision' && (
                                    <button onClick={handleApproveClub} disabled={approving} style={{ padding: '10px 20px', background: '#1877f2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s' }}>
                                        {approving ? 'Aprobando...' : '✅ Aprobar Club'}
                                    </button>
                                )}
                                <button onClick={() => setIsEditing(true)} style={{ padding: '10px 20px', background: '#e4e6eb', color: '#1c1e21', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s' }}>
                                    ✏️ Editar Encargados
                                </button>
                                <button onClick={handleDeleteClub} style={{ padding: '10px 20px', background: '#fce8e6', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s' }}>
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>

                        {/* Contenido: Acerca de y Equipo */}
                        <div style={{ padding: '40px 5%', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                            
                            {/* Tarjeta Acerca de */}
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Detalles del Club</h3>
                                <p style={{ margin: 0, fontSize: '1.05rem', color: '#050505', lineHeight: '1.6' }}>{club.descripcion}</p>
                                <div style={{ marginTop: '20px', fontSize: '0.95rem', color: '#65676b' }}>
                                    <strong>📅 Fecha de creación:</strong> {new Date(club.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClubDetailsAdminPage;