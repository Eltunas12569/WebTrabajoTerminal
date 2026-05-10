import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './css/Dashboards.css';

const ClubDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL;

    // Intentamos recuperar los datos del estado de navegación para que la carga sea instantánea
    const [club, setClub] = useState(location.state?.club || null);
    const [isMember, setIsMember] = useState(location.state?.isMember || false);
    const [loading, setLoading] = useState(!location.state?.club);
    const [error, setError] = useState('');

    // Si el usuario recargó la página directamente (F5), los buscamos en la API
    useEffect(() => {
        if (!club) {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${API_URL}/clubes`);
                    const clubEncontrado = response.data.find(c => String(c.id) === String(id));
                    if (!clubEncontrado) throw new Error('Club no encontrado');
                    setClub(clubEncontrado);

                    if (user?.id) {
                        const userClubsRes = await axios.get(`${API_URL}/clubes/user/${user.id}`, {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                        setIsMember(userClubsRes.data.some(uc => String(uc.id) === String(id)));
                    }
                } catch (err) {
                    setError('Error al cargar la información del club.');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, club, user, API_URL]);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Cargando información del club...</div>;
    if (error || !club) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error || 'Club no encontrado'}</div>;

    return (
        <div style={{ minHeight: '100vh', width: '100vw', position: 'absolute', top: 0, left: 0, backgroundColor: '#f0f2f5', fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: 'hidden' }}>
            <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', boxSizing: 'border-box', borderBottom: '1px solid #e4e6eb', backgroundColor: '#003366', color: '#fff', position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
                    <h1 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '600' }}>🛡️ Perfil del Club</h1>
                    <button onClick={() => navigate('/gestion')} style={{ background: '#e4e6eb', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#1c1e21', transition: 'background 0.2s' }}>
                        🔙 Volver
                    </button>
                </div>

                <div style={{ backgroundColor: '#f0f2f5', flex: 1, display: 'flex', flexDirection: 'column', marginTop: '60px' }}>
                    <div style={{ position: 'relative', width: '100%', height: '250px', background: 'linear-gradient(135deg, #003366 0%, #00509e 100%)', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', bottom: '-60px', width: '120px', height: '120px', backgroundColor: '#fff', borderRadius: '50%', border: '4px solid #fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '4rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2 }}>
                            🏆
                        </div>
                    </div>

                    <div style={{ padding: '75px 5% 25px 5%', backgroundColor: '#fff', textAlign: 'center', borderBottom: '1px solid #e4e6eb' }}>
                        <h2 style={{ margin: '0 0 10px 0', fontSize: '2.2rem', color: '#1c1e21', fontWeight: '800' }}>{club.nombre}</h2>
                        <span className={`club-tag tag-${club.estatus?.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '5px 12px', display: 'inline-block', marginBottom: '20px' }}>
                            {club.estatus.replace('_', ' ')}
                        </span>
                        
                        <div style={{ marginTop: '10px' }}>
                            {isMember ? (
                                <span style={{ fontSize: '1rem', background: '#d4edda', color: '#155724', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>✓ Ya eres miembro de este club</span>
                            ) : (
                                <p style={{ color: '#666', fontSize: '1rem', margin: 0 }}>Para unirte, solicita el <b>Código de Unión</b> al Profesor o Alumno Líder e ingrésalo en la sección "Unirse a un Club".</p>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '40px 5%', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Detalles del Club</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div><h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1rem' }}>Descripción</h4><p style={{ margin: 0, fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}>{club.descripcion}</p></div>
                                <div><h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1rem' }}>Objetivo</h4><p style={{ margin: 0, fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}>{club.objetivo || 'No especificado'}</p></div>
                                <div><h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1rem' }}>Detalle de Actividades</h4><p style={{ margin: 0, fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}>{club.detalle_actividades || 'No especificado'}</p></div>
                                <div><h4 style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '1rem' }}>Horarios y Lugar</h4><p style={{ margin: 0, fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}>{club.espacios_tiempos || 'No especificados'}</p></div>
                            </div>
                        </div>

                        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Cronograma de Actividades</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e4e6eb' }}>
                                    <thead><tr style={{ backgroundColor: '#003366', color: '#fff' }}><th style={{ padding: '10px', textAlign: 'left', width: '25%' }}>Mes</th><th style={{ padding: '10px', textAlign: 'left' }}>Actividad</th></tr></thead>
                                    <tbody>
                                        {(() => {
                                            let cronogramaItems = [];
                                            try { cronogramaItems = typeof club.cronograma === 'string' ? JSON.parse(club.cronograma) : (club.cronograma || []); } catch (e) { cronogramaItems = []; }
                                            if (!Array.isArray(cronogramaItems) || cronogramaItems.length === 0) return <tr><td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#666' }}>No hay cronograma disponible.</td></tr>;
                                            return cronogramaItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                    <td style={{ padding: '10px', fontWeight: '600', color: '#333' }}>{item.mes}</td>
                                                    <td style={{ padding: '10px', color: '#555' }}>{item.actividad}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#1c1e21', borderBottom: '1px solid #e4e6eb', paddingBottom: '10px', fontWeight: '700' }}>Personas a Cargo</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid #e4e6eb', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                    <img src={`https://ui-avatars.com/api/?name=${club.profesor_nombres}+${club.profesor_apellidos}&background=003366&color=fff&size=100`} alt="Profesor" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <h4 style={{ margin: '0 0 3px 0', color: '#050505', fontSize: '1.1rem', fontWeight: '700' }}>{club.profesor_nombres} {club.profesor_apellidos}</h4>
                                        <p style={{ margin: '0 0 5px 0', color: '#003366', fontSize: '0.9rem', fontWeight: '600' }}>👨‍🏫 Profesor Encargado</p>
                                        <p style={{ margin: 0, color: '#555', fontSize: '0.85rem' }}>✉️ {club.profesor_correo || 'No registrado'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid #e4e6eb', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                    <img src={`https://ui-avatars.com/api/?name=${club.alumno_nombres}+${club.alumno_apellidos}&background=1E8449&color=fff&size=100`} alt="Alumno" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <h4 style={{ margin: '0 0 3px 0', color: '#050505', fontSize: '1.1rem', fontWeight: '700' }}>{club.alumno_nombres} {club.alumno_apellidos}</h4>
                                        <p style={{ margin: '0 0 5px 0', color: '#1E8449', fontSize: '0.9rem', fontWeight: '600' }}>🎓 Alumno Encargado</p>
                                        <p style={{ margin: 0, color: '#555', fontSize: '0.85rem' }}>✉️ {club.alumno_correo || 'No registrado'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClubDetailsPage;