import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AccionesAlumno = ({ onUpdate, mostrar = 'ambos' }) => {
    const { user } = useAuth();
    const [invitaciones, setInvitaciones] = useState([]);
    const [codigo, setCodigo] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [loading, setLoading] = useState(false);
    
    const API_URL = import.meta.env.VITE_API_URL;

    // Solo cargar datos si el usuario autenticado es un alumno (role_id === 2)
    useEffect(() => {
        if (user?.role_id === 2) {
            fetchInvitaciones();
        }
    }, [user, API_URL]);

    const fetchInvitaciones = async () => {
        try {
            const res = await axios.get(`${API_URL}/clubes/invitaciones/pendientes`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setInvitaciones(res.data);
        } catch (error) {
            console.error("Error al cargar invitaciones:", error);
        }
    };

    const handleUnirse = async (e) => {
        e.preventDefault();
        if (!codigo.trim()) return;
        
        setLoading(true);
        setMensaje({ texto: '', tipo: '' });
        
        try {
            const res = await axios.post(`${API_URL}/clubes/unirse`, { codigo }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMensaje({ texto: res.data.message, tipo: 'success' });
            setCodigo('');
            
            // Refrescar la lista general de clubes del usuario
            if (onUpdate) onUpdate();
        } catch (error) {
            setMensaje({ 
                texto: error.response?.data?.message || 'Código inválido o error al unirse al club', 
                tipo: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const responderInvitacion = async (clubId, accion) => {
        try {
            const res = await axios.put(`${API_URL}/clubes/invitaciones/${clubId}/responder`, { accion }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMensaje({ texto: res.data.message, tipo: 'success' });
            fetchInvitaciones(); // Actualizamos la lista automáticamente tras responder
            if (onUpdate && accion === 'aceptar') onUpdate(); // Si aceptó, refresca la lista de clubes del dashboard
        } catch (error) {
            setMensaje({ 
                texto: error.response?.data?.message || 'Error al procesar la invitación', 
                tipo: 'error' 
            });
        }
    };

    // Si no es un alumno, este componente se oculta (no devuelve nada)
    if (user?.role_id !== 2) return null;

    return (
        <>
            {/* Panel de Invitaciones Pendientes (Renderizado como aviso urgente) */}
            {(mostrar === 'ambos' || mostrar === 'invitaciones') && invitaciones.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                    {invitaciones.map(inv => (
                        <div key={inv.club_id} className="aviso-item" style={{ borderLeft: '5px solid #dc3545', backgroundColor: '#fff8f8', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0', color: '#dc3545', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🚨</span> INVITACIÓN URGENTE: {inv.nombre}
                                </h4>
                                <p style={{ margin: '0 0 8px 0', color: '#555', fontSize: '0.95rem' }}>
                                    Has sido seleccionado para formar parte de la plantilla de este club.
                                </p>
                                <span style={{ fontSize: '0.85rem', backgroundColor: '#dc3545', padding: '4px 8px', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}>
                                    Rol Propuesto: {inv.rol_invitado === 'encargado_alumno' ? 'Alumno Encargado (Líder)' : 'Miembro Regular'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => responderInvitacion(inv.club_id, 'aceptar')} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={(e)=>e.target.style.backgroundColor='#218838'} onMouseOut={(e)=>e.target.style.backgroundColor='#28a745'}>✓ Aceptar</button>
                                <button onClick={() => responderInvitacion(inv.club_id, 'rechazar')} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={(e)=>e.target.style.backgroundColor='#5a6268'} onMouseOut={(e)=>e.target.style.backgroundColor='#6c757d'}>✖ Rechazar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Panel de Unirse por Código */}
            {(mostrar === 'ambos' || mostrar === 'codigo') && (
                <div className="crear-club-card" style={{ padding: '25px', width: '100%', margin: '0 0 20px 0', boxSizing: 'border-box' }}>
                    <h3 style={{ color: '#003366', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                        <span>🔑</span> Unirse a un Club con Código
                    </h3>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '15px' }}>Si un profesor o líder de club te ha dado un código de acceso, ingrésalo aquí para unirte automáticamente.</p>
                    <form onSubmit={handleUnirse} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input type="text" placeholder="Ej. J5SEXI" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} required style={{ flex: 1, minWidth: '200px', padding: '12px 15px', borderRadius: '8px', border: '1px solid #ccc', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', outline: 'none' }} />
                        <button type="submit" className="btn-crear-club" disabled={loading} style={{ margin: 0, width: 'auto', padding: '12px 25px' }}>{loading ? 'Verificando...' : 'Unirme'}</button>
                    </form>
                    {mensaje.texto && <div className={`message-banner ${mensaje.tipo}`} style={{ marginTop: '15px' }}>{mensaje.texto}</div>}
                </div>
            )}
        </>
    );
};

export default AccionesAlumno;