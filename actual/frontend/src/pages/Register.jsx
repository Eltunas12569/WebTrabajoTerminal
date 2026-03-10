import React, { useState } from 'react';
import { register } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import './css/Register.css'; // Importamos el nuevo CSS

const Register = () => {
    const [formData, setFormData] = useState({
        nombres: '', apellidos: '', nss: '', boleta: '', correo: '', password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
                <h1 className="register-title">Registro de Atleta</h1>
                <p className="register-subtitle">Club Deportivo - ESCOM IPN</p>
                
                <form onSubmit={handleSubmit} className="register-form">
                    <input 
                        name="nombres" 
                        placeholder="Nombres" 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    <input 
                        name="apellidos" 
                        placeholder="Apellidos" 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    <input 
                        name="nss" 
                        type="number" 
                        placeholder="NSS (11 dígitos)" 
                        value={formData.nss} 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    <input 
                        name="boleta" 
                        type="number" 
                        placeholder="Boleta (10 dígitos)" 
                        value={formData.boleta} 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    <input 
                        name="correo" 
                        type="email" 
                        placeholder="Correo Institucional" 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    <input 
                        name="password" 
                        type="password" 
                        placeholder="Contraseña" 
                        onChange={handleChange} 
                        required 
                        className="register-input" 
                    />
                    
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