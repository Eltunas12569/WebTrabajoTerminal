import React, { useState, useEffect } from 'react';
import { register } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import './css/Register.css';

// Iconos SVG limpios y estándar
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

const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const Register = () => {
    const [formData, setFormData] = useState(() => {
        try {
            const saved = sessionStorage.getItem('register_form_draft');
            if (saved) return JSON.parse(saved);
        } catch {
            // Manejo silencioso
        }
        return {
            nombres: '',
            apellido_paterno: '',
            apellido_materno: '',
            nss: '',
            boleta: '',
            carrera: '',
            num_empleado: '',
            correo: '',
            password: '',
            rol_id: 2 // 2 = Alumno, 3 = Profesor
        };
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(() => {
        return sessionStorage.getItem('register_privacy_accepted') === 'true';
    });

    const navigate = useNavigate();

    // Guardar borrador en sesión para no perder datos si navega
    useEffect(() => {
        try {
            const draft = { ...formData, password: '' };
            sessionStorage.setItem('register_form_draft', JSON.stringify(draft));
            sessionStorage.setItem('register_privacy_accepted', String(privacyAccepted));
        } catch {
            // Manejo silencioso
        }
    }, [formData, privacyAccepted]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Restricciones numéricas institucionales
        if (name === 'nss') {
            const onlyNums = value.replace(/\D/g, '');
            if (onlyNums.length > 11) return;
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
            return;
        }
        if (name === 'boleta') {
            const onlyNums = value.replace(/\D/g, '');
            if (onlyNums.length > 10) return;
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
            return;
        }
        if (name === 'num_empleado') {
            const onlyNums = value.replace(/\D/g, '');
            if (onlyNums.length > 10) return;
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (!privacyAccepted) {
            setError('Debes aceptar los términos y condiciones y el aviso de privacidad.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await register({
                ...formData,
                acepta_privacidad: privacyAccepted,
                version_aviso_privacidad: '1.1'
            });
            sessionStorage.removeItem('register_form_draft');
            sessionStorage.removeItem('register_privacy_accepted');
            alert(response?.message || '¡Registro exitoso! Revisa tu correo institucional para verificar tu cuenta.');
            navigate('/');
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Ocurrió un error en el registro.');
        } finally {
            setLoading(false);
        }
    };

    const isPasswordMatching = confirmPassword.length > 0 && formData.password === confirmPassword;
    const isPasswordMismatch = confirmPassword.length > 0 && formData.password !== confirmPassword;

    return (
        <div className="register-screen">
            {/* Marca de agua institucional de fondo */}
            <div className="register-watermark" aria-hidden="true">
                <img src="/IMG_0999%20(1).png" alt="" />
            </div>

            <main className="register-card-desktop">
                {/* Encabezado Horizontal: Branding a la izquierda + Selector de rol a la derecha */}
                <header className="register-header-row">
                    <div className="register-brand">
                        <div className="register-logo">
                            <img src="/IMG_1003-Photoroom%20(1).png" alt="Logo ESCOM" />
                        </div>
                        <div>
                            <h1 className="register-title">Registro de cuenta
                            </h1>
                        </div>
                    </div>

                    <div className="role-toggle-desktop" role="tablist" aria-label="Tipo de usuario">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formData.rol_id === 2}
                            className={`role-btn-desktop ${formData.rol_id === 2 ? 'active' : ''}`}
                            onClick={() => { setFormData(prev => ({ ...prev, rol_id: 2 })); setError(''); }}
                        >
                       Alumno
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formData.rol_id === 3}
                            className={`role-btn-desktop ${formData.rol_id === 3 ? 'active' : ''}`}
                            onClick={() => { setFormData(prev => ({ ...prev, rol_id: 3 })); setError(''); }}
                        >
                            Profesor
                        </button>
                    </div>
                </header>

                {/* Formulario en 2 Columnas para Pantallas de Computadora */}
                <form onSubmit={handleSubmit}>
                    <div className="register-columns-grid">
                        {/* COLUMNA 1: Datos Personales e Identificación */}
                        <section className="register-column">
                            <div className="column-heading">
                                <span className="column-badge">1</span>
                                <span className="column-title">Datos Personales</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-nombres">
                                    <span>Nombres <span className="req">*</span></span>
                                </label>
                                <input
                                    id="reg-nombres"
                                    name="nombres"
                                    type="text"
                                    placeholder="Nombre(s) completo(s)"
                                    value={formData.nombres}
                                    onChange={handleChange}
                                    required
                                    className="form-input"
                                    autoComplete="given-name"
                                />
                            </div>

                            <div className="inner-row-2">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-paterno">
                                        <span>Apellido Paterno <span className="req">*</span></span>
                                    </label>
                                    <input
                                        id="reg-paterno"
                                        name="apellido_paterno"
                                        type="text"
                                        placeholder="Primer apellido"
                                        value={formData.apellido_paterno}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                        autoComplete="family-name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-materno">
                                        <span>Apellido Materno</span>
                                        <span className="hint">Opcional</span>
                                    </label>
                                    <input
                                        id="reg-materno"
                                        name="apellido_materno"
                                        type="text"
                                        placeholder="Segundo apellido"
                                        value={formData.apellido_materno}
                                        onChange={handleChange}
                                        className="form-input"
                                        autoComplete="additional-name"
                                    />
                                </div>
                            </div>

                            {formData.rol_id === 2 ? (
                                <div className="inner-row-2">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="reg-boleta">
                                            <span>Boleta <span className="req">*</span></span>
                                            <span className="hint">10 dígitos</span>
                                        </label>
                                        <input
                                            id="reg-boleta"
                                            name="boleta"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={10}
                                            placeholder="2024630000"
                                            value={formData.boleta}
                                            onChange={handleChange}
                                            required={formData.rol_id === 2}
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="reg-nss">
                                            <span>NSS <span className="req">*</span></span>
                                            <span className="hint">11 dígitos</span>
                                        </label>
                                        <input
                                            id="reg-nss"
                                            name="nss"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={11}
                                            placeholder="12345678901"
                                            value={formData.nss}
                                            onChange={handleChange}
                                            required={formData.rol_id === 2}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-empleado">
                                        <span>Número de Empleado <span className="req">*</span></span>
                                    </label>
                                    <input
                                        id="reg-empleado"
                                        name="num_empleado"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="Número de empleado"
                                        value={formData.num_empleado}
                                        onChange={handleChange}
                                        required={formData.rol_id === 3}
                                        className="form-input"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Divisor vertical sutil */}
                        <div className="register-divider" aria-hidden="true" />

                        {/* COLUMNA 2: Programa Académico y Cuenta */}
                        <section className="register-column">
                            <div className="column-heading">
                                <span className="column-badge">2</span>
                                <span className="column-title">
                                    {formData.rol_id === 2 ? 'Programa Académico y Acceso' : 'Cuenta Institucional'}
                                </span>
                            </div>

                            {formData.rol_id === 2 && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-carrera">
                                        <span>Programa Académico <span className="req">*</span></span>
                                    </label>
                                    <select
                                        id="reg-carrera"
                                        name="carrera"
                                        value={formData.carrera}
                                        onChange={handleChange}
                                        required={formData.rol_id === 2}
                                        className="form-input form-select"
                                    >
                                        <option value="" disabled>Selecciona tu carrera en ESCOM</option>
                                        <option value="Ing. en Sistemas Computacionales">Ing. en Sistemas Computacionales</option>
                                        <option value="Ing. en Inteligencia Artificial">Ing. en Inteligencia Artificial</option>
                                        <option value="Lic. en Ciencia de Datos">Lic. en Ciencia de Datos</option>
                                        <option value="Ing. Mecatrónica">Ing. Mecatrónica</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-correo">
                                    <span>Correo Institucional <span className="req">*</span></span>
                                    <span className="hint">
                                        {formData.rol_id === 2 ? '@alumno.ipn.mx' : '@ipn.mx'}
                                    </span>
                                </label>
                                <input
                                    id="reg-correo"
                                    name="correo"
                                    type="email"
                                    placeholder={formData.rol_id === 2 ? 'ejemplo@alumno.ipn.mx' : 'ejemplo@ipn.mx'}
                                    value={formData.correo}
                                    onChange={handleChange}
                                    required
                                    className="form-input"
                                    autoComplete="email"
                                />
                            </div>

                            <div className="inner-row-2">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-password">
                                        <span>Contraseña <span className="req">*</span></span>
                                        <span className="hint">Mín. 8 car.</span>
                                    </label>
                                    <div className="password-box">
                                        <input
                                            id="reg-password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="form-input"
                                            autoComplete="new-password"
                                            style={{ paddingRight: '34px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={loading}
                                            className="eye-btn"
                                            title={showPassword ? 'Ocultar' : 'Mostrar'}
                                        >
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-confirm">
                                        <span>Confirmar <span className="req">*</span></span>
                                    </label>
                                    <div className="password-box">
                                        <input
                                            id="reg-confirm"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className={`form-input ${isPasswordMismatch ? 'input-error' : ''}`}
                                            autoComplete="new-password"
                                            style={{ paddingRight: '34px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            disabled={loading}
                                            className="eye-btn"
                                            title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                                        >
                                            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                    {isPasswordMatching && (
                                        <span className="pass-hint valid">
                                            <CheckIcon /> Coinciden
                                        </span>
                                    )}
                                    {isPasswordMismatch && (
                                        <span className="pass-hint invalid">
                                            No coinciden
                                        </span>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Fila Inferior: Términos, Botón de Acción y Enlace */}
                    <footer className="register-bottom-row">
                        <label className="terms-row" htmlFor="reg-privacy">
                            <input
                                id="reg-privacy"
                                type="checkbox"
                                checked={privacyAccepted}
                                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                required
                                className="terms-checkbox"
                            />
                            <span className="terms-text">
                                He leído y acepto los{' '}
                                <Link to="/terminos-condiciones" target="_blank" rel="noopener noreferrer">
                                    términos y condiciones
                                </Link>
                                {' '}y el{' '}
                                <Link to="/aviso-privacidad" target="_blank" rel="noopener noreferrer">
                                    aviso de privacidad
                                </Link>.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="btn-submit-wide"
                            disabled={loading || !privacyAccepted}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" aria-hidden="true" />
                                    <span>Creando cuenta...</span>
                                </>
                            ) : (
                                'Crear Cuenta'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="link-login-flat"
                        >
                            ¿Ya tienes cuenta? Inicia sesión
                        </button>
                    </footer>
                </form>

                {/* Banner de Error si ocurre alguno */}
                {error && (
                    <div className="error-banner-desktop" role="alert">
                        <AlertIcon />
                        <span>{error}</span>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Register;