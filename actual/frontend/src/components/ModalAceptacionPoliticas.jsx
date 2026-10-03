import React, { useState, useEffect } from 'react';
import './ModalAceptacionPoliticas.css';

/**
 * Modal Bloqueante de Aceptación Obligatoria de Políticas Legales.
 * 
 * Garantiza cumplimiento estricto con:
 * - LGPDPPSO Arts. 28, 31, 43, 63 y 250.
 * - Bloqueo total de la interfaz hasta el otorgamiento del consentimiento expreso.
 */
const ModalAceptacionPoliticas = ({ politica, onAceptar, onLogout }) => {
    const [tabActiva, setTabActiva] = useState('resumen');
    const [aceptaAviso, setAceptaAviso] = useState(false);
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    // Prevenir el cierre mediante la tecla Escape
    useEffect(() => {
        const bloquearEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener('keydown', bloquearEscape);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', bloquearEscape);
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    const handleConfirmar = async () => {
        if (!aceptaAviso || !aceptaTerminos) {
            setError('Debes marcar ambas casillas para confirmar que has leído y aceptas las actualizaciones.');
            return;
        }

        setEnviando(true);
        setError('');

        try {
            await onAceptar(politica?.version || '1.0');
        } catch (err) {
            console.error('Error al aceptar políticas:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar la aceptación. Intenta nuevamente.');
        } finally {
            setEnviando(false);
        }
    };

    const versionMostrar = politica?.version || '1.1';
    const tituloMostrar = politica?.titulo || 'Actualización de Políticas de Privacidad y Términos';
    const fechaMostrar = politica?.fecha_publicacion 
        ? new Date(politica.fecha_publicacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Septiembre 2026';

    return (
        <div 
            className="modal-politicas-backdrop" 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="modal-politicas-titulo"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="modal-politicas-container">
                {/* Cabecera institucional */}
                <div className="modal-politicas-header">
                    <div className="modal-politicas-icon-badge">
                        ⚖️
                    </div>
                    <div className="modal-politicas-title-area">
                        <p className="modal-politicas-subtitle">Instituto Politécnico Nacional · ESCOM</p>
                        <h2 id="modal-politicas-titulo" className="modal-politicas-title">
                            {tituloMostrar}
                        </h2>
                        <div className="modal-politicas-meta">
                            <span className="modal-politicas-version-tag">Versión {versionMostrar}</span>
                            <span>Publicado el {fechaMostrar}</span>
                        </div>
                    </div>
                </div>

                {/* Banner de alerta normativa */}
                <div className="modal-politicas-banner-aviso">
                    ⚠️ <strong>Acción requerida:</strong> Se han actualizado las disposiciones del Aviso de Privacidad y Términos de Uso en cumplimiento de la <em>Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO)</em>. Para continuar utilizando los módulos del sistema, debes aceptar las nuevas condiciones.
                </div>

                {/* Navegación por pestañas */}
                <div className="modal-politicas-tabs">
                    <button 
                        type="button"
                        className={`modal-politicas-tab ${tabActiva === 'resumen' ? 'active' : ''}`}
                        onClick={() => setTabActiva('resumen')}
                    >
                        📋 Resumen de Cambios
                    </button>
                    <button 
                        type="button"
                        className={`modal-politicas-tab ${tabActiva === 'privacidad' ? 'active' : ''}`}
                        onClick={() => setTabActiva('privacidad')}
                    >
                        🔒 Aviso de Privacidad
                    </button>
                    <button 
                        type="button"
                        className={`modal-politicas-tab ${tabActiva === 'terminos' ? 'active' : ''}`}
                        onClick={() => setTabActiva('terminos')}
                    >
                        📜 Términos y Condiciones
                    </button>
                </div>

                {/* Cuerpo del modal según la pestaña activa */}
                <div className="modal-politicas-body">
                    {tabActiva === 'resumen' && (
                        <div className="modal-politicas-tab-content">
                            <div className="modal-politicas-resumen-box">
                                <h4>Resumen Ejecutivo de la Actualización (Versión {versionMostrar}):</h4>
                                <p>{politica?.resumen_cambios || 'Se actualizaron las medidas de seguridad, retención de datos personales y mecanismos para el ejercicio de derechos ARCO de la comunidad politécnica.'}</p>
                            </div>
                            <p>
                                De acuerdo con los artículos 28 y 43 de la LGPDPPSO, el Instituto Politécnico Nacional notifica formalmente cualquier modificación al tratamiento de tus datos personales a través de la presente plataforma antes de que surtan efectos.
                            </p>
                        </div>
                    )}

                    {tabActiva === 'privacidad' && (
                        <div className="modal-politicas-tab-content">
                            <div className="modal-politicas-doc-box">
                                <h4>Aviso de Privacidad Integral - Puntos Clave:</h4>
                                <ul>
                                    <li><strong>Responsable:</strong> Escuela Superior de Cómputo (ESCOM) del Instituto Politécnico Nacional.</li>
                                    <li><strong>Finalidades:</strong> Registro y administración de clubes deportivos y culturales, seguimiento de asistencias y contacto en caso de emergencia médica.</li>
                                    <li><strong>Minimización de Datos:</strong> Se recaban estrictamente boleta, nombre institucional, NSS y datos de contacto de emergencia, evitando datos sensibles innecesarios.</li>
                                    <li><strong>Seguridad:</strong> Hashing criptográfico robusto (bcrypt 10 rondas), certificados SSL/TLS y control de acceso basado en roles (RBAC).</li>
                                    <li><strong>Derechos ARCO:</strong> Puedes solicitar Acceso, Rectificación, Cancelación u Oposición a través de tu perfil o ante la Unidad de Transparencia del IPN.</li>
                                </ul>
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>
                                Puedes consultar el texto completo en cualquier momento en el apartado de <em>Aviso de Privacidad</em>.
                            </p>
                        </div>
                    )}

                    {tabActiva === 'terminos' && (
                        <div className="modal-politicas-tab-content">
                            <div className="modal-politicas-doc-box">
                                <h4>Términos y Condiciones de Uso - Puntos Clave:</h4>
                                <ul>
                                    <li><strong>Uso Institucional:</strong> La cuenta es intransferible y de uso exclusivo para las actividades de los clubes autorizados de la ESCOM.</li>
                                    <li><strong>Conducta y Convivencia:</strong> Se prohíbe el uso de los canales de chat o avisos para conductas hostiles, spam o actividades contrarias a la disciplina del IPN.</li>
                                    <li><strong>Vigencia y Membresía:</strong> La participación en clubes está sujeta a los estatutos académicos y las directrices de los profesores y coordinadores encargados.</li>
                                </ul>
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>
                                El incumplimiento de estos términos podrá derivar en la suspensión temporal o definitiva de la cuenta en el sistema.
                            </p>
                        </div>
                    )}

                    {/* Casillas de verificación obligatorias */}
                    <div className="modal-politicas-check-group">
                        <label className="modal-politicas-checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={aceptaAviso}
                                onChange={(e) => {
                                    setAceptaAviso(e.target.checked);
                                    if (error) setError('');
                                }}
                            />
                            <span>
                                He leído y <strong>acepto la versión {versionMostrar} del Aviso de Privacidad</strong> para el tratamiento y resguardo de mis datos personales.
                            </span>
                        </label>

                        <label className="modal-politicas-checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={aceptaTerminos}
                                onChange={(e) => {
                                    setAceptaTerminos(e.target.checked);
                                    if (error) setError('');
                                }}
                            />
                            <span>
                                He leído y <strong>acepto los Términos y Condiciones de Uso</strong> del Sistema de Gestión de Clubes ESCOM IPN.
                            </span>
                        </label>
                    </div>

                    {error && (
                        <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px', fontWeight: 'bold' }}>
                            ⚠️ {error}
                        </p>
                    )}
                </div>

                {/* Pie con acciones */}
                <div className="modal-politicas-footer">
                    <span className="modal-politicas-footer-info">
                        🔒 Registro auditado con sello de tiempo institucional
                    </span>
                    <div className="modal-politicas-footer-actions">
                        <button 
                            type="button" 
                            className="btn-politicas-logout"
                            onClick={onLogout}
                            disabled={enviando}
                        >
                            Cerrar Sesión
                        </button>
                        <button 
                            type="button" 
                            className="btn-politicas-accept"
                            onClick={handleConfirmar}
                            disabled={!aceptaAviso || !aceptaTerminos || enviando}
                        >
                            {enviando ? 'Guardando...' : '✓ Aceptar y Continuar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalAceptacionPoliticas;
