import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './css/VerificarCuenta.css';

const opcionesParentesco = [
    'Madre',
    'Padre',
    'Tutor / Tutora',
    'Hermano / Hermana',
    'Esposo / Esposa / Pareja',
    'Abuelo / Abuela',
    'Tío / Tía',
    'Primo / Prima',
    'Hijo / Hija',
    'Amigo / Amiga',
    'Otro familiar'
];

const tiposSangreValidos = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const VerificarCuentaPage = () => {
    const { user, loginUser, logout } = useAuth();
    const navigate = useNavigate();

    // Estado del código OTP
    const [codigo, setCodigo] = useState('');

    // Estado de datos médicos básicos
    const [tipoSangre, setTipoSangre] = useState('');
    const [alergias, setAlergias] = useState('');

    // Estado de contactos de emergencia (Mínimo 2 requeridos)
    const [contactos, setContactos] = useState([
        { nombre: '', telefono: '', parentesco: '' },
        { nombre: '', telefono: '', parentesco: '' }
    ]);

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    // Cargar información previa de perfil si existe
    useEffect(() => {
        const cargarPerfil = async () => {
            try {
                const response = await api.get('/auth/perfil');
                const data = response.data;
                if (data) {
                    if (data.tipo_sangre) setTipoSangre(data.tipo_sangre);
                    if (data.ficha_medica?.tipo_sangre) setTipoSangre(data.ficha_medica.tipo_sangre);
                    if (data.ficha_medica?.alergias) setAlergias(data.ficha_medica.alergias);
                    if (data.ficha_medica?.contactos && data.ficha_medica.contactos.length >= 2) {
                        setContactos(data.ficha_medica.contactos.map(c => ({
                            nombre: c.nombre || '',
                            telefono: c.telefono || '',
                            parentesco: c.parentesco || ''
                        })));
                    }
                }
            } catch {
                // Silencioso: mantiene los 2 contactos vacíos por defecto
            }
        };
        cargarPerfil();
    }, []);

    const irAlInicio = () => {
        const ruta = Number(user?.role_id) === 1 ? '/admin' : '/gestion';
        navigate(ruta);
    };

    // Manejo de cambios en los contactos con restricciones de caracteres
    const handleContactChange = (index, field, value) => {
        let val = value;
        if (field === 'nombre') {
            // Solo letras (con acentos, ñ, ü) y espacios simples, máximo 70 caracteres
            val = value
                .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                .replace(/^\s+/, '')
                .replace(/\s{2,}/g, ' ')
                .slice(0, 70);
        } else if (field === 'telefono') {
            // Solo dígitos numéricos, máximo 10 dígitos
            val = value.replace(/\D/g, '').slice(0, 10);
        }

        setContactos(prev =>
            prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
        );
    };

    const addContact = () => {
        setContactos(prev => [
            ...prev,
            { nombre: '', telefono: '', parentesco: '' }
        ]);
    };

    const removeContact = (index) => {
        // No permitir eliminar si solo quedan 2
        if (contactos.length <= 2) return;
        setContactos(prev => prev.filter((_, i) => i !== index));
    };

    const verificarYGuardar = async (event) => {
        event.preventDefault();
        setError('');
        setMensaje('');

        // 1. Validar código de verificación (6 dígitos)
        if (!/^\d{6}$/.test(codigo.trim())) {
            setError('Ingresa el código de verificación de 6 dígitos numéricos enviado a tu correo.');
            return;
        }

        // 2. Validar tipo de sangre
        if (!tipoSangre || !tiposSangreValidos.includes(tipoSangre)) {
            setError('Selecciona tu tipo de sangre.');
            return;
        }

        // 3. Validar alergias o condiciones médicas
        if (!alergias || !alergias.trim()) {
            setError('Indica si tienes alguna alergia o padecimiento médico (escribe "Ninguna" si no tienes).');
            return;
        }

        // 4. Validar mínimo 2 contactos de emergencia
        if (contactos.length < 2) {
            setError('Debes registrar al menos 2 contactos de emergencia para activar y autenticar tu cuenta.');
            return;
        }

        // 5. Validar cada contacto con las restricciones solicitadas
        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+(?:\s[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+)*$/;
        for (let i = 0; i < contactos.length; i++) {
            const c = contactos[i];
            const nom = c.nombre ? c.nombre.trim() : '';
            const tel = c.telefono ? c.telefono.trim() : '';

            if (!nom) {
                setError(`El contacto #${i + 1} requiere un nombre completo.`);
                return;
            }
            if (nom.length < 3) {
                setError(`El nombre del contacto #${i + 1} debe tener al menos 3 caracteres.`);
                return;
            }
            if (!nombreRegex.test(nom)) {
                setError(`El nombre del contacto #${i + 1} solo puede contener letras y espacios válidos (sin números ni caracteres especiales).`);
                return;
            }
            if (!tel) {
                setError(`El contacto #${i + 1} requiere un número de teléfono.`);
                return;
            }
            if (tel.length !== 10) {
                setError(`El teléfono del contacto #${i + 1} debe contener exactamente 10 dígitos numéricos.`);
                return;
            }
            if (!c.parentesco || !c.parentesco.trim()) {
                setError(`Selecciona el parentesco o relación para el contacto #${i + 1}.`);
                return;
            }
        }

        setLoading(true);

        try {
            // PASO A: Guardar datos médicos y contactos de emergencia en el backend (sin modificar el backend)
            const payloadEmergencia = {
                tipo_sangre: tipoSangre,
                alergias: alergias.trim(),
                contactos: contactos.map(c => ({
                    nombre: c.nombre.trim(),
                    telefono: c.telefono.trim(),
                    parentesco: c.parentesco.trim()
                }))
            };

            await api.put('/auth/perfil', payloadEmergencia);

            // PASO B: Autenticar y verificar la cuenta con el código OTP
            await api.post('/auth/verificar-cuenta', { codigo: codigo.trim() });

            // Actualizar sesión en AuthContext
            const usuarioActualizado = { ...user, verificado: true };
            loginUser({ user: usuarioActualizado, token: localStorage.getItem('token') });

            setMensaje('¡Datos de emergencia registrados y cuenta verificada con éxito! Redirigiendo...');
            setTimeout(irAlInicio, 900);
        } catch (requestError) {
            console.error("Error al autenticar cuenta:", requestError);
            const msgError = requestError.response?.data?.message || 'No se pudo verificar la cuenta. Revisa el código de acceso e intenta nuevamente.';
            setError(msgError);
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
            setMensaje(response.data.mensaje || 'Se envió un nuevo código a tu correo institucional.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'No se pudo reenviar el código. Espera un momento.');
        } finally {
            setResending(false);
        }
    };

    return (
        <main className="verificar-container">
            <section className="verificar-card">
                <header className="verificar-header">
                    <div className="verificar-header-logo">
                        <img src="/IMG_1003-Photoroom%20(1).png" alt="Logo ESCOM" />
                    </div>
                    <h1 className="verificar-title">🔐 Verificación y Activación de Cuenta</h1>
                    <p className="verificar-subtitle">
                        Introduce el código enviado a <span className="verificar-correo-badge">{user?.correo || 'tu correo institucional'}</span> y completa tus datos de emergencia obligatorios para autenticar tu cuenta.
                    </p>
                </header>

                <div className="verificar-aviso-box">
                    ℹ️ <strong>Requisito institucional de seguridad:</strong> Para activar tu cuenta y poder inscribirte o participar en clubes y actividades escolares, es indispensable registrar tu tipo de sangre, alergias y <strong>al menos dos contactos de emergencia</strong> con número telefónico a 10 dígitos.
                </div>

                {error && (
                    <div className="verificar-alert error" role="alert">
                        ⚠️ {error}
                    </div>
                )}
                {mensaje && (
                    <div className="verificar-alert success" role="alert">
                        ✓ {mensaje}
                    </div>
                )}

                <form onSubmit={verificarYGuardar}>
                    {/* SECCIÓN 1: CÓDIGO DE VERIFICACIÓN */}
                    <div className="verificar-section">
                        <div className="verificar-section-header">
                            <h2 className="verificar-section-title">
                                <span>1️⃣ Código de Acceso</span>
                            </h2>
                            <span className="verificar-badge-req">Obligatorio</span>
                        </div>
                        <div className="form-group-v">
                            <label className="form-label-v" htmlFor="input-codigo-otp">
                                <span>Código de Verificación (6 dígitos) <span className="req">*</span></span>
                            </label>
                            <div className="codigo-input-wrapper">
                                <input
                                    id="input-codigo-otp"
                                    className="codigo-otp-input"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="••••••"
                                    required
                                />
                                <button
                                    className="btn-reenviar-codigo"
                                    type="button"
                                    onClick={reenviar}
                                    disabled={resending || loading}
                                >
                                    {resending ? 'Enviando...' : '📩 Reenviar código'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: DATOS MÉDICOS BÁSICOS */}
                    <div className="verificar-section">
                        <div className="verificar-section-header">
                            <h2 className="verificar-section-title">
                                <span>2️⃣ Ficha Médica Básica</span>
                            </h2>
                            <span className="verificar-badge-req">Obligatorio</span>
                        </div>
                        <div className="grid-medico-2col">
                            <div className="form-group-v">
                                <label className="form-label-v" htmlFor="select-tipo-sangre">
                                    <span>Tipo de Sangre <span className="req">*</span></span>
                                </label>
                                <select
                                    id="select-tipo-sangre"
                                    className="form-control-v"
                                    value={tipoSangre}
                                    onChange={(e) => setTipoSangre(e.target.value)}
                                    required
                                >
                                    <option value="">Selecciona tu tipo de sangre...</option>
                                    {tiposSangreValidos.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group-v">
                                <label className="form-label-v" htmlFor="input-alergias">
                                    <span>Alergias o Condiciones Médicas <span className="req">*</span></span>
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        id="input-alergias"
                                        type="text"
                                        className="form-control-v"
                                        value={alergias}
                                        onChange={(e) => setAlergias(e.target.value)}
                                        placeholder="Ej. Ninguna / Penicilina / Asma"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setAlergias('Ninguna')}
                                        className="btn-reenviar-codigo"
                                        style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                                        title="Indicar que no se tienen alergias"
                                    >
                                        Ninguna
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: CONTACTOS DE EMERGENCIA (MÍNIMO 2) */}
                    <div className="verificar-section">
                        <div className="verificar-section-header">
                            <h2 className="verificar-section-title">
                                <span>3️⃣ Contactos de Emergencia</span>
                            </h2>
                            <span className="verificar-badge-req">Mínimo 2 requeridos</span>
                        </div>

                        {contactos.map((contacto, index) => {
                            const esObligatorio = index < 2;
                            return (
                                <div key={index} className="contacto-card-v">
                                    <div className="contacto-card-header">
                                        <span className="contacto-card-title">
                                            👤 Contacto de Emergencia #{index + 1} {esObligatorio ? '(Obligatorio)' : '(Opcional)'}
                                        </span>
                                        {contactos.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeContact(index)}
                                                className="btn-eliminar-contacto"
                                                title="Eliminar este contacto adicional"
                                            >
                                                ✖ Eliminar
                                            </button>
                                        )}
                                    </div>

                                    <div className="contacto-inputs-grid">
                                        <div className="form-group-v">
                                            <label className="form-label-v">
                                                <span>Nombre Completo <span className="req">*</span></span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control-v"
                                                value={contacto.nombre}
                                                onChange={(e) => handleContactChange(index, 'nombre', e.target.value)}
                                                required
                                                minLength={3}
                                                maxLength={70}
                                                pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+(?:\s[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+)*$"
                                                title="Solo letras y espacios (mínimo 3 caracteres, sin números ni símbolos)"
                                                placeholder="Nombre(s) y Apellidos"
                                            />
                                        </div>

                                        <div className="form-group-v">
                                            <label className="form-label-v">
                                                <span>Teléfono (10 dígitos) <span className="req">*</span></span>
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className="form-control-v"
                                                value={contacto.telefono}
                                                onChange={(e) => handleContactChange(index, 'telefono', e.target.value)}
                                                required
                                                minLength={10}
                                                maxLength={10}
                                                pattern="[0-9]{10}"
                                                title="Número telefónico a 10 dígitos"
                                                placeholder="Ej. 5512345678"
                                            />
                                        </div>

                                        <div className="form-group-v">
                                            <label className="form-label-v">
                                                <span>Parentesco / Relación <span className="req">*</span></span>
                                            </label>
                                            <select
                                                className="form-control-v"
                                                value={contacto.parentesco || ''}
                                                onChange={(e) => handleContactChange(index, 'parentesco', e.target.value)}
                                                required
                                            >
                                                <option value="">Selecciona parentesco...</option>
                                                {opcionesParentesco.map(opc => (
                                                    <option key={opc} value={opc}>{opc}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            onClick={addContact}
                            className="btn-agregar-contacto"
                        >
                            ➕ Agregar otro contacto de emergencia
                        </button>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="verificar-actions">
                        <button
                            className="btn-verificar-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? '⏳ Guardando y verificando cuenta...' : '🛡️ Guardar Datos de Emergencia y Autenticar Cuenta'}
                        </button>

                        <button
                            className="btn-verificar-logout"
                            type="button"
                            onClick={logout}
                            disabled={loading}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
};

export default VerificarCuentaPage;
