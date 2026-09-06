import React, { useState } from 'react';
import { register } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import './css/Register.css'; // Importamos el nuevo CSS

const Register = () => {
    const [formData, setFormData] = useState({
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
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Restricciones institucionales
        if (name === 'nss') {
            const onlyNums = value.replace(/\D/g, ''); // NSS es estrictamente numérico
            if (onlyNums.length > 11) return;
            setFormData({ ...formData, [name]: onlyNums });
            return;
        }
        if (name === 'boleta') {
            if (value.length > 10) return;
            setFormData({ ...formData, [name]: value.toUpperCase() }); // Permite letras (ej. PM, PE) y las hace mayúsculas
            return;
        }
        if (name === 'num_empleado') {
            const onlyNums = value.replace(/\D/g, '');
            if (onlyNums.length > 10) return; // Límite razonable para un núm. de empleado
            setFormData({ ...formData, [name]: onlyNums });
            return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            await register(formData);
            alert('¡Registro exitoso! Ahora puedes entrar con tus credenciales.');
            navigate('/'); // Redirige al login
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container hide-scrollbar" style={{
            display: 'flex', 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%', 
            height: '100vh', 
            overflowY: 'auto', 
            backgroundImage: 'linear-gradient(to right, #5290cf 0%, #5290cf 20%, transparent 20%, transparent 80%, #5290cf 80%, #5290cf 100%), radial-gradient(circle at 50% 0%, #ffffff 0%, #f0f2f5 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            margin: 0,
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="register-card">
                <h1 className="register-title">Registro en el Sistema</h1>
                <p className="register-subtitle">Club Deportivo - ESCOM IPN</p>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, rol_id: 2 })}
                        style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: '5px',
                            background: formData.rol_id === 2 ? '#003366' : '#e1e5eb',
                            color: formData.rol_id === 2 ? '#fff' : '#333', cursor: 'pointer',
                            fontWeight: 'bold', transition: 'background 0.3s'
                        }}
                    >
                        🎓 Soy Alumno
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, rol_id: 3 })}
                        style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: '5px',
                            background: formData.rol_id === 3 ? '#003366' : '#e1e5eb',
                            color: formData.rol_id === 3 ? '#fff' : '#333', cursor: 'pointer',
                            fontWeight: 'bold', transition: 'background 0.3s'
                        }}
                    >
                        👨‍🏫 Soy Profesor
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    <input 
                        name="nombres" 
                        placeholder="Nombres" 
                        value={formData.nombres}
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input name="apellido_paterno" placeholder="Apellido Paterno" value={formData.apellido_paterno} onChange={handleChange} required className="register-input" style={{ flex: 1 }} />
                        <input name="apellido_materno" placeholder="Apellido Materno" value={formData.apellido_materno} onChange={handleChange} className="register-input" style={{ flex: 1 }} />
                    </div>

                    {formData.rol_id === 2 ? (
                        <>
                            <input 
                                name="nss" 
                                type="text" 
                                placeholder="NSS (11 dígitos)" 
                                value={formData.nss} 
                                onChange={handleChange} 
                                required={formData.rol_id === 2}
                                className="register-input" 
                            />
                            <input 
                                name="boleta" 
                                type="text" 
                                placeholder="Boleta (10 dígitos)" 
                                value={formData.boleta} 
                                onChange={handleChange} 
                                required={formData.rol_id === 2}
                                className="register-input" 
                            />
                            <select 
                                name="carrera" 
                                value={formData.carrera} 
                                onChange={handleChange} 
                                required={formData.rol_id === 2}
                                className="register-input" 
                            >
                                <option value="" disabled>Selecciona tu carrera</option>
                                <option value="Ing. en Sistemas Computacionales">Ing. en Sistemas Computacionales</option>
                                <option value="Ing. en Inteligencia Artificial">Ing. en Inteligencia Artificial</option>
                                <option value="Lic. en Ciencia de Datos">Lic. en Ciencia de Datos</option>
                                <option value="Ing. Mecatrónica">Ing. Mecatrónica</option>
                            </select>
                        </>
                    ) : (
                        <input 
                            name="num_empleado" 
                            type="text" 
                            placeholder="Número de Empleado" 
                            value={formData.num_empleado} 
                            onChange={handleChange} 
                            required={formData.rol_id === 3}
                            className="register-input" 
                        />
                    )}

                    <input 
                        name="correo" 
                        type="email" 
                        placeholder="Correo Institucional" 
                        value={formData.correo}
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                            name="password" 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Contraseña" 
                            value={formData.password}
                            onChange={handleChange} 
                            required 
                            className="register-input" 
                            style={{ paddingRight: '45px', width: '100%', boxSizing: 'border-box' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                            style={{
                                position: 'absolute', right: '10px', background: 'none', border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer', 
                                fontSize: '1.2rem', color: '#666', padding: '5px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {showPassword ? '👁️‍🗨️' : '◡'}
                        </button>
                    </div>
                    
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                        <input 
                            name="confirmPassword" 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirmar Contraseña" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            className="register-input" 
                            style={{ 
                                paddingRight: '45px', 
                                width: '100%', 
                                boxSizing: 'border-box',
                                borderColor: (confirmPassword && formData.password !== confirmPassword) ? '#dc3545' : '#e1e5eb'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={loading}
                            style={{
                                position: 'absolute', right: '10px', background: 'none', border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer', 
                                fontSize: '1.2rem', color: '#666', padding: '5px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {showConfirmPassword ? '👁️‍🗨️' : '◡'}
                        </button>
                    </div>
                    
                    <button type="submit" className="btn-register" disabled={loading}>
                        {loading ? 'Procesando...' : 'Crear Cuenta'}
                    </button>
                    
                    <button type="button" onClick={() => navigate('/')} className="btn-back">
                        ¿Ya tienes cuenta? Inicia sesión
                    </button>
                </form>

                {error && <div className="register-error-banner">❌ {error}</div>}
            </div>
        </div>
    );
};

export default Register;