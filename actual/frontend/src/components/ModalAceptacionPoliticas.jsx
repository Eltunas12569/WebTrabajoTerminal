import React, { useState, useEffect } from 'react';
import './ModalAceptacionPoliticas.css';

/**
 * Modal Bloqueante de Aceptación Obligatoria de Políticas Legales.
 * 
 * Cumplimiento con LGPDPPSO y gestión de consentimiento informado.
 * Provee enlaces directos a las páginas completas de Aviso de Privacidad y Términos de Uso.
 */
const ModalAceptacionPoliticas = ({ politica, onAceptar, onLogout }) => {
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

                {/* Banner de alerta */}
                <div className="modal-politicas-banner-aviso">
                    ⚠️ <strong>Acción requerida:</strong> Se han actualizado las disposiciones del Aviso de Privacidad y Términos de Uso. Para continuar utilizando los módulos del sistema, debes revisar y aceptar las nuevas condiciones.
                </div>

                {/* Cuerpo del modal */}
                <div className="modal-politicas-body">
                    {/* Resumen ejecutivo de los cambios */}
                    <div className="modal-politicas-resumen-box">
                        <h4>📋 Resumen Ejecutivo de Cambios (Versión {versionMostrar}):</h4>
                        <p>
                            {politica?.resumen_cambios || 'Se actualizaron las medidas de seguridad, retención de datos personales y mecanismos para el ejercicio de derechos ARCO de la comunidad politécnica.'}
                        </p>
                    </div>

                    {/* Enlaces directos a las páginas completas */}
                    <div className="modal-politicas-links-banner">
                        <span className="modal-politicas-links-title">
                            📄 Consulta la documentación completa en las páginas oficiales:
                        </span>
                        <div className="modal-politicas-links-grid">
                            <a 
                                href="/aviso-privacidad" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="modal-doc-link-btn"
                            >
                                <span className="modal-doc-icon">🔒</span>
                                <div className="modal-doc-text">
                                    <strong>Aviso de Privacidad Integral</strong>
                                    <small>Abrir página completa en nueva pestaña ↗</small>
                                </div>
                            </a>
                            <a 
                                href="/terminos-condiciones" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="modal-doc-link-btn"
                            >
                                <span className="modal-doc-icon">📜</span>
                                <div className="modal-doc-text">
                                    <strong>Términos y Condiciones de Uso</strong>
                                    <small>Abrir página completa en nueva pestaña ↗</small>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Casillas de verificación obligatorias con enlaces directos */}
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
                                He leído y <strong>acepto la versión {versionMostrar} del{' '}
                                <a 
                                    href="/aviso-privacidad" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="modal-inline-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Aviso de Privacidad ↗
                                </a></strong> para el tratamiento y resguardo de mis datos personales.
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
                                He leído y <strong>acepto los{' '}
                                <a 
                                    href="/terminos-condiciones" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="modal-inline-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Términos y Condiciones de Uso ↗
                                </a></strong> del Sistema de Gestión de Clubes ESCOM IPN.
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
                        🔒 Registro de consentimiento auditado institucionalmente
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
