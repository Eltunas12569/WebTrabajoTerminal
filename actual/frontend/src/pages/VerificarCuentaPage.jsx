import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/Login.css';

const VerificarCuentaPage = () => {
    const { user, loginUser, logout } = useAuth();
    const navigate = useNavigate();
    const [codigo, setCodigo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const irAlInicio = () => {
        const ruta = Number(user?.role_id) === 1 ? '/admin' : '/gestion';
        navigate(ruta);
    };

    const verificar = async (event) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(codigo)) {
            setError('El código debe tener 6 dígitos.');
            return;
        }

        setLoading(true);
        setError('');
        setMensaje('');
        try {
            await api.post('/auth/verificar-cuenta', { codigo });
            const usuarioActualizado = { ...user, verificado: true };
            loginUser({ user: usuarioActualizado, token: localStorage.getItem('token') });
            setMensaje('Cuenta verificada correctamente.');
            setTimeout(irAlInicio, 500);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'No se pudo verificar la cuenta.');
        } finally {
            setLoading(false);
        }
    };

    const reenviar = async () => {
        setResending(true);
        setError('');
        setMensaje('');
        try {
            const response = await api.post('/auth/reenviar-codigo');
            setMensaje(response.data.mensaje || 'Se envió un nuevo código a tu correo.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'No se pudo reenviar el código.');
        } finally {
            setResending(false);
        }
    };

    return (
        <main className="login-container">
            <section className="login-card" style={{ maxWidth: '460px' }}>
                <h1 className="login-title">Verifica tu cuenta</h1>
                <p className="login-subtitle">
                    Introduce el código de 6 dígitos que enviamos a {user?.correo || 'tu correo institucional'}.
                </p>
                <form onSubmit={verificar} className="login-form">
                    <input
                        className="login-input"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={codigo}
                        onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Código de verificación"
                        aria-label="Código de verificación"
                    />
                    <button className="btn-login" type="submit" disabled={loading}>
                        {loading ? 'Verificando...' : 'Verificar cuenta'}
                    </button>
                </form>
                {error && <div className="login-error-banner">{error}</div>}
                {mensaje && <div className="login-success-banner">{mensaje}</div>}
                <button className="btn-back" type="button" onClick={reenviar} disabled={resending}>
                    {resending ? 'Enviando...' : 'Reenviar código'}
                </button>
                <button className="btn-back" type="button" onClick={logout}>
                    Cerrar sesión
                </button>
            </section>
        </main>
    );
};

export default VerificarCuentaPage;
