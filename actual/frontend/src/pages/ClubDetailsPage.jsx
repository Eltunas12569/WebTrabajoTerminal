import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Dashboards.css';

const ClubDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // Intentamos recuperar los datos del estado de navegación para que la carga sea instantánea
    const [club, setClub] = useState(location.state?.club || null);
    const [isMember, setIsMember] = useState(location.state?.isMember || false);
    const [loading, setLoading] = useState(!location.state?.club);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [joining, setJoining] = useState(false);
    const [joinMessage, setJoinMessage] = useState({ text: '', type: '' });

    // Siempre refrescamos los datos para garantizar el código de acceso y estatus más reciente
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/clubes');
                const clubEncontrado = response.data.find(c => String(c.id) === String(id));
                if (!clubEncontrado) throw new Error('Club no encontrado');
                setClub(clubEncontrado);

                if (user?.id) {
                    const userClubsRes = await api.get(`/clubes/user/${user.id}`);
                    setIsMember(userClubsRes.data.some(uc => String(uc.id) === String(id) && uc.inscripcion_estatus === 'activo'));
                }
            } catch (err) {
                if (!club) setError('Error al cargar la información del club.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user]);

    const handleCopyCode = () => {
        if (club?.codigo_union) {
            navigator.clipboard.writeText(club.codigo_union);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleUnirseDirecto = async () => {
        if (!club?.codigo_union) return;
        setJoining(true);
        setJoinMessage({ text: '', type: '' });
        try {
            const res = await api.post('/clubes/unirse', { codigo: club.codigo_union });
            setJoinMessage({ text: res.data.message || '¡Te has unido exitosamente al club!', type: 'success' });
            setIsMember(true);
        } catch (err) {
            setJoinMessage({
                text: err.response?.data?.message || 'Error al unirte al club con este código.',
                type: 'error'
            });
        } finally {
            setJoining(false);
        }
    };

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
                        
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                            {isMember ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1rem', background: '#d4edda', color: '#155724', padding: '8px 18px', borderRadius: '20px', fontWeight: 'bold' }}>
                                        ✓ Ya eres miembro activo de este club
                                    </span>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => navigate(`/club/${id}/panel`)}
                                            style={{ padding: '10px 22px', background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            📋 Ir al panel del club
                                        </button>
                                        <button
                                            onClick={() => navigate(`/chat/${id}`)}
                                            style={{ padding: '10px 22px', background: '#1877f2', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            💬 Chat del club
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <p style={{ color: '#555', fontSize: '1rem', margin: 0 }}>
                                        ¿Deseas unirte a este club? Consulta el <strong>Código de Acceso</strong> al final de esta página.
                                    </p>
                                    <a
                                        href="#seccion-codigo-acceso"
                                        style={{
                                            color: '#003366',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            textDecoration: 'none',
                                            background: '#e7f3ff',
                                            padding: '6px 14px',
                                            borderRadius: '15px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        👇 Ir al Código de Acceso
                                    </a>
                                </div>
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

                        {/* Tarjeta de Código de Acceso al Club (al final de la página) */}
                        <div
                            id="seccion-codigo-acceso"
                            style={{
                                background: '#fff',
                                padding: '30px',
                                borderRadius: '10px',
                                boxShadow: '0 2px 8px rgba(0, 51, 102, 0.08)',
                                border: '2px dashed #003366',
                                textAlign: 'center'
                            }}
                        >
                            <h3 style={{ margin: '0 0 10px 0', color: '#003366', fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                🔑 Código de Acceso al Club
                            </h3>
                            <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#555', lineHeight: '1.5' }}>
                                {isMember
                                    ? 'Este es el código de acceso oficial de tu club. Puedes compartirlo con otros alumnos para que se unan:'
                                    : 'Utiliza este código para unirte a las actividades, eventos y avisos oficiales de este club:'}
                            </p>

                            {club.codigo_union ? (
                                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        marginBottom: '18px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <span style={{
                                            fontSize: '2.2rem',
                                            fontWeight: '900',
                                            letterSpacing: '5px',
                                            color: '#003366',
                                            fontFamily: 'monospace',
                                            background: '#f8fafc',
                                            padding: '10px 28px',
                                            borderRadius: '10px',
                                            border: '2px solid #003366',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                                        }}>
                                            {club.codigo_union}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyCode}
                                            style={{
                                                padding: '12px 20px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: copied ? '#28a745' : '#003366',
                                                color: '#fff',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '0.95rem',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {copied ? '✓ ¡Copiado!' : '📋 Copiar Código'}
                                        </button>
                                    </div>

                                    {!isMember ? (
                                        <button
                                            type="button"
                                            onClick={handleUnirseDirecto}
                                            disabled={joining}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: '#28a745',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '1.05rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 4px 12px rgba(40,167,69,0.3)',
                                                transition: 'background 0.2s'
                                            }}
                                        >
                                            {joining ? '⏳ Uniéndote al club...' : '🚀 Unirme a este Club Ahora'}
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.95rem', background: '#d4edda', color: '#155724', padding: '8px 18px', borderRadius: '20px', fontWeight: 'bold', display: 'inline-block' }}>
                                            ✓ Ya eres miembro activo de este club
                                        </span>
                                    )}

                                    {joinMessage.text && (
                                        <div style={{
                                            marginTop: '15px',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '0.95rem',
                                            fontWeight: 'bold',
                                            background: joinMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                                            color: joinMessage.type === 'success' ? '#155724' : '#721c24'
                                        }}>
                                            {joinMessage.text}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: '14px', background: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '0.95rem', maxWidth: '450px', margin: '0 auto' }}>
                                    ⚠️ Este club no cuenta con un código de unión activo en este momento.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClubDetailsPage;