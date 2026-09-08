import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitarRecuperacion, restablecerPassword } from '../services/authService';
import './css/Login.css';

const RecuperarPasswordPage = () => {
    const navigate = useNavigate();
    const [correo, setCorreo] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
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
            setError('El código debe tener 6 dígitos.');
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
            setMensaje(response.mensaje || 'Contraseña actualizada correctamente.');
            setTimeout(() => navigate('/'), 1200);
        } catch (requestError) {
            mostrarError(requestError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-container">
            <section className="login-card recovery-card">
                <div className="login-header">
                    <div className="logo-placeholder">🔐</div>
                    <h1 className="login-title">Recuperar contraseña</h1>
                    <p className="login-subtitle">
                        {codigoSolicitado
                            ? 'Introduce el código enviado a tu correo y define una nueva contraseña.'
                            : 'Te enviaremos un código de recuperación a tu correo institucional.'}
                    </p>
                </div>

                {!codigoSolicitado ? (
                    <form className="login-form" onSubmit={solicitarCodigo}>
                        <label className="input-label" htmlFor="recovery-email">Correo institucional</label>
                        <input
                            id="recovery-email"
                            className="login-input"
                            type="email"
                            autoComplete="email"
                            placeholder="ejemplo@ipn.mx"
                            value={correo}
                            onChange={(event) => setCorreo(event.target.value)}
                            required
                            disabled={loading}
                        />
                        <button className="btn-submit recovery-submit" type="submit" disabled={loading}>
                            {loading ? 'Enviando código...' : 'Enviar código'}
                        </button>
                    </form>
                ) : (
                    <form className="login-form" onSubmit={cambiarPassword}>
                        <label className="input-label" htmlFor="recovery-code">Código de recuperación</label>
                        <input
                            id="recovery-code"
                            className="login-input recovery-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="000000"
                            value={codigo}
                            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            disabled={loading}
                        />

                        <label className="input-label" htmlFor="new-password">Nueva contraseña</label>
                        <input
                            id="new-password"
                            className="login-input"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            value={nuevaPassword}
                            onChange={(event) => setNuevaPassword(event.target.value)}
                            required
                            disabled={loading}
                        />

                        <label className="input-label" htmlFor="confirm-password">Confirmar contraseña</label>
                        <input
                            id="confirm-password"
                            className="login-input"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Repite tu nueva contraseña"
                            value={confirmarPassword}
                            onChange={(event) => setConfirmarPassword(event.target.value)}
                            required
                            disabled={loading}
                        />

                        <p className="password-hint">Usa al menos 8 caracteres, una mayúscula, un número y un símbolo.</p>
                        <button className="btn-submit recovery-submit" type="submit" disabled={loading}>
                            {loading ? 'Actualizando...' : 'Restablecer contraseña'}
                        </button>
                    </form>
                )}

                {error && <div className="error-banner login-error-banner">{error}</div>}
                {mensaje && <div className="login-success-banner">{mensaje}</div>}

                <div className="recovery-actions">
                    {codigoSolicitado && (
                        <button className="link-button" type="button" onClick={() => setCodigoSolicitado(false)} disabled={loading}>
                            Cambiar correo
                        </button>
                    )}
                    <button className="btn-back" type="button" onClick={() => navigate('/')} disabled={loading}>
                        Volver al inicio de sesión
                    </button>
                </div>
            </section>
        </main>
    );
};

export default RecuperarPasswordPage;