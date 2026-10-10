import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitarRecuperacion, restablecerPassword } from '../services/authService';
import './css/RecuperarPassword.css';

// Componentes de Iconos SVG
const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
    </svg>
);

const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
);

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const EyeOffIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

const RecuperarPasswordPage = () => {
    const navigate = useNavigate();
    const [correo, setCorreo] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [showNuevaPassword, setShowNuevaPassword] = useState(false);
    const [showConfirmarPassword, setShowConfirmarPassword] = useState(false);
    const [codigoSolicitado, setCodigoSolicitado] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const mostrarError = (requestError) => {
        setError(typeof requestError === 'string' ? requestError : 'No se pudo completar la operación.');
        setMensaje('');
    };

    const solicitarCodigo = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMensaje('');

        try {
            const response = await solicitarRecuperacion(correo.trim().toLowerCase());
            setCodigoSolicitado(true);
            setMensaje(response.mensaje || 'Código enviado. Revisa tu correo institucional.');
        } catch (requestError) {
            mostrarError(requestError);
        } finally {
            setLoading(false);
        }
    };

    const cambiarPassword = async (event) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(codigo)) {
            setError('El código debe tener exactamente 6 dígitos.');
            setMensaje('');
            return;
        }
        if (nuevaPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            setMensaje('');
            return;
        }
        if (nuevaPassword !== confirmarPassword) {
            setError('Las contraseñas no coinciden.');
            setMensaje('');
            return;
        }

        setLoading(true);
        setError('');
        setMensaje('');

        try {
            const response = await restablecerPassword({
                correo: correo.trim().toLowerCase(),
                codigo,
                nuevaPassword,
                confirmarPassword
            });
            setMensaje(response.mensaje || 'Contraseña restablecida exitosamente.');
            setTimeout(() => navigate('/'), 1300);
        } catch (requestError) {
            mostrarError(requestError);
        } finally {
            setLoading(false);
        }
    };

    const isPasswordMatching = confirmarPassword.length > 0 && nuevaPassword === confirmarPassword;
    const isPasswordMismatch = confirmarPassword.length > 0 && nuevaPassword !== confirmarPassword;

    return (
        <div className="recovery-screen">
            {/* Marca de agua institucional sutil */}
            <div className="recovery-watermark" aria-hidden="true">
                <img src="/IMG_0999%20(1).png" alt="" />
            </div>

            <main className="recovery-card">
                {/* Cabecera / Identidad */}
                <header className="recovery-header">
                    <div className="recovery-logo">
                        <img src="/IMG_1003-Photoroom%20(1).png" alt="Logo ESCOM" />
                    </div>
                    <h1 className="recovery-title">Recuperar Contraseña</h1>
                    <p className="recovery-subtitle">
                        {codigoSolicitado
                            ? 'Ingresa el código recibido en tu correo y establece tu nueva clave.'
                            : 'Ingresa tu correo institucional registrado para recibir un código de acceso.'}
                    </p>
                </header>

                {/* Indicador de pasos */}
                <div className="recovery-steps-indicator" aria-label="Progreso de recuperación">
                    <span className={`step-pill ${!codigoSolicitado ? 'active' : 'completed'}`}>
                        {!codigoSolicitado ? '1. Correo Institucional' : '✓ Correo Verificado'}
                    </span>
                    <span className="step-separator">→</span>
                    <span className={`step-pill ${codigoSolicitado ? 'active' : ''}`}>
                        2. Nueva Contraseña
                    </span>
                </div>

                {/* Formulario según el paso */}
                {!codigoSolicitado ? (
                    <form className="recovery-form" onSubmit={solicitarCodigo}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="recovery-email">
                                <span>Correo Institucional</span>
                                <span className="hint">@ipn.mx / @alumno.ipn.mx</span>
                            </label>
                            <div className="input-box">
                                <span className="input-icon-left"><MailIcon /></span>
                                <input
                                    id="recovery-email"
                                    className="recovery-input"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="ejemplo@ipn.mx"
                                    value={correo}
                                    onChange={(event) => setCorreo(event.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button className="btn-submit-recovery" type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="recovery-spinner" aria-hidden="true" />
                                    <span>Enviando código...</span>
                                </>
                            ) : (
                                'Enviar Código de Recuperación'
                            )}
                        </button>
                    </form>
                ) : (
                    <form className="recovery-form" onSubmit={cambiarPassword}>
                        {/* Código de verificación */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="recovery-code">
                                <span>Código de Verificación</span>
                                <span className="hint">6 dígitos</span>
                            </label>
                            <input
                                id="recovery-code"
                                className="recovery-input code-input"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                placeholder="000000"
                                value={codigo}
                                onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Nueva Contraseña y Confirmación en 2 columnas para escritorio */}
                        <div className="form-row-2">
                            <div className="form-group">
                                <label className="form-label" htmlFor="new-password">
                                    <span>Nueva Contraseña</span>
                                    <span className="hint">Mín. 8 car.</span>
                                </label>
                                <div className="input-box">
                                    <span className="input-icon-left"><LockIcon /></span>
                                    <input
                                        id="new-password"
                                        className="recovery-input"
                                        type={showNuevaPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        value={nuevaPassword}
                                        onChange={(event) => setNuevaPassword(event.target.value)}
                                        required
                                        disabled={loading}
                                        style={{ paddingRight: '36px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNuevaPassword(!showNuevaPassword)}
                                        disabled={loading}
                                        className="eye-toggle-btn"
                                        title={showNuevaPassword ? 'Ocultar' : 'Mostrar'}
                                    >
                                        {showNuevaPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="confirm-password">
                                    <span>Confirmar Clave</span>
                                </label>
                                <div className="input-box">
                                    <span className="input-icon-left"><LockIcon /></span>
                                    <input
                                        id="confirm-password"
                                        className={`recovery-input ${isPasswordMismatch ? 'input-invalid' : ''}`}
                                        type={showConfirmarPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        value={confirmarPassword}
                                        onChange={(event) => setConfirmarPassword(event.target.value)}
                                        required
                                        disabled={loading}
                                        style={{ paddingRight: '36px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmarPassword(!showConfirmarPassword)}
                                        disabled={loading}
                                        className="eye-toggle-btn"
                                        title={showConfirmarPassword ? 'Ocultar' : 'Mostrar'}
                                    >
                                        {showConfirmarPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                {isPasswordMatching && (
                                    <span className="pass-match-indicator valid">
                                        <CheckIcon /> Coinciden
                                    </span>
                                )}
                                {isPasswordMismatch && (
                                    <span className="pass-match-indicator invalid">
                                        No coinciden
                                    </span>
                                )}
                            </div>
                        </div>

                        <button className="btn-submit-recovery" type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="recovery-spinner" aria-hidden="true" />
                                    <span>Actualizando contraseña...</span>
                                </>
                            ) : (
                                'Restablecer Contraseña'
                            )}
                        </button>
                    </form>
                )}

                {/* Banners informativos */}
                {error && (
                    <div className="alert-banner error" style={{ marginTop: '14px' }}>
                        <AlertIcon />
                        <span>{error}</span>
                    </div>
                )}
                {mensaje && (
                    <div className="alert-banner success" style={{ marginTop: '14px' }}>
                        <CheckIcon />
                        <span>{mensaje}</span>
                    </div>
                )}

                {/* Acciones de navegación */}
                <footer className="recovery-actions">
                    {codigoSolicitado && (
                        <button
                            className="btn-text-action"
                            type="button"
                            onClick={() => { setCodigoSolicitado(false); setMensaje(''); setError(''); }}
                            disabled={loading}
                        >
                            Cambiar correo electrónico
                        </button>
                    )}
                    <button
                        className="btn-back-action"
                        type="button"
                        onClick={() => navigate('/')}
                        disabled={loading}
                    >
                        <span>←</span> Volver al inicio de sesión
                    </button>
                </footer>
            </main>
        </div>
    );
};

export default RecuperarPasswordPage;