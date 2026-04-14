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
        if (name === 'nss' && value.length > 11) return;
        if (name === 'boleta' && value.length > 10) return;
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
        <div className="register-container">
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
                        <input name="apellido_materno" placeholder="Apellido Materno (Opcional)" value={formData.apellido_materno} onChange={handleChange} className="register-input" style={{ flex: 1 }} />
                    </div>
                    <input 
                        name="nss" 
                        type="number" 
                        placeholder="NSS (11 dígitos)" 
                        value={formData.nss} 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />

                    {formData.rol_id === 2 ? (
                        <>
                            <input 
                                name="boleta" 
                                type="number" 
                                placeholder="Boleta (10 dígitos)" 
                                value={formData.boleta} 
                                onChange={handleChange} 
                                required={formData.rol_id === 2}
                                className="register-input" 
                            />
                            <input 
                                name="carrera" 
                                type="text" 
                                placeholder="Carrera (Ej. Ing. en Sistemas)" 
                                value={formData.carrera} 
                                onChange={handleChange} 
                                required={formData.rol_id === 2}
                                className="register-input" 
                            />
                        </>
                    ) : (
                        <input 
                            name="num_empleado" 
                            type="number" 
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
                            style={{ paddingRight: '45px', width: '100%', boxSizing: 'border-box' }}
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