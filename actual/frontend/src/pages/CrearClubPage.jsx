import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/CrearClubPage.css'; // Importa el CSS para esta página

const CrearClubPage = () => {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [profesorEncargadoId, setProfesorEncargadoId] = useState('');
    const [alumnoEncargadoId, setAlumnoEncargadoId] = useState(''); // Ahora almacenará el ID del alumno seleccionado
    const [profesoresDisponibles, setProfesoresDisponibles] = useState([]); // Nuevo estado para los profesores
    const [loadingProfesores, setLoadingProfesores] = useState(true); // Estado de carga para profesores
    const [alumnosDisponibles, setAlumnosDisponibles] = useState([]); // Nuevo estado para los alumnos
    const [loadingAlumnos, setLoadingAlumnos] = useState(true); // Estado de carga para alumnos
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;

    // Cargar la lista de profesores al montar el componente
    useEffect(() => {
        const fetchProfesores = async () => {
            try {
                setLoadingProfesores(true);
                const response = await axios.get(`${API_URL}/users/professors`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setProfesoresDisponibles(response.data);
            } catch (err) {
                console.error("Error al cargar profesores:", err);
                setError('No se pudieron cargar los profesores disponibles.');
            } finally {
                setLoadingProfesores(false);
            }
        };
        fetchProfesores();
    }, [API_URL]);

    // Cargar la lista de alumnos encargados y alumnos al montar el componente
    useEffect(() => {
        const fetchAlumnos = async () => {
            try {
                setLoadingAlumnos(true);
                const response = await axios.get(`${API_URL}/users/students-in-charge`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setAlumnosDisponibles(response.data);
            } catch (err) {
                console.error("Error al cargar alumnos encargados:", err);
                setError('No se pudieron cargar los alumnos disponibles.');
            } finally {
                setLoadingAlumnos(false);
            }
        };
        fetchAlumnos();
    }, [API_URL]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Aquí deberías enviar los datos al backend
            // Asegúrate de que tu backend tenga un endpoint para crear clubes
            const response = await axios.post(`${API_URL}/clubes`, {
                nombre,
                descripcion,
                profesor_encargado_id: profesorEncargadoId,
                alumno_encargado_id: alumnoEncargadoId,
                estatus: 'en_revision', // Se añade el estatus por defecto
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}` // Asume que guardas el token en localStorage
                }
            });
            setSuccess('Club creado exitosamente: ' + response.data.message);
            // Opcional: Redirigir a otra página o limpiar el formulario
            setNombre('');
            setDescripcion('');
            setProfesorEncargadoId('');
            setAlumnoEncargadoId('');
            // navigate('/gestion'); // Por ejemplo, redirigir al dashboard de gestión
        } catch (err) {
            console.error("Error al crear el club:", err);
            setError(err.response?.data?.message || 'Error al crear el club. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="crear-club-container">
            <div className="crear-club-card">
                <h1 className="crear-club-title">Crear Nuevo Club Deportivo</h1>
                <p className="crear-club-subtitle">Completa los datos para registrar un nuevo club.</p>

                <form onSubmit={handleSubmit} className="crear-club-form">
                    <div className="form-group">
                        <label htmlFor="nombre">Nombre del Club</label>
                        <input
                            type="text"
                            id="nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. Club de Ajedrez ESCOM"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="descripcion">Descripción</label>
                        <textarea
                            id="descripcion"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Breve descripción del club, sus actividades y objetivos."
                            rows="4"
                            required
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="profesorEncargadoId">ID Profesor Encargado</label>
                        <select
                            id="profesorEncargadoId"
                            value={profesorEncargadoId}
                            onChange={(e) => setProfesorEncargadoId(e.target.value)}
                            required
                            disabled={loadingProfesores || loading}
                        >
                            <option value="">{loadingProfesores ? 'Cargando profesores...' : 'Selecciona un profesor'}</option>
                            {profesoresDisponibles.map((profesor) => (
                                <option key={profesor.id} value={profesor.id}>
                                    {profesor.nombres} {profesor.apellidos} (Boleta: {profesor.boleta})
                                </option>
                            ))}
                        </select>
                        {/* Se ha cambiado a un selector desplegable */}
                    </div>
                    <div className="form-group">
                        <label htmlFor="alumnoEncargadoId">Alumno Encargado</label>
                        <select
                            id="alumnoEncargadoId"
                            value={alumnoEncargadoId}
                            onChange={(e) => setAlumnoEncargadoId(e.target.value)}
                            required
                            disabled={loadingAlumnos || loading}
                        >
                            <option value="">{loadingAlumnos ? 'Cargando alumnos...' : 'Selecciona un alumno'}</option>
                            {alumnosDisponibles.map((alumno) => (
                                <option key={alumno.id} value={alumno.id}>
                                    {alumno.nombres} {alumno.apellidos} (Boleta: {alumno.boleta})
                                </option>
                            ))}
                        </select>
                        {/* Se ha cambiado a un selector desplegable para alumnos */}
                    </div>
                    <button type="submit" className="btn-crear-club" disabled={loading}>
                        {loading ? 'Creando...' : 'Registrar Club'}
                    </button>
                </form>

                {error && <div className="message-banner error">{error}</div>}
                {success && <div className="message-banner success">{success}</div>}
                <button onClick={() => navigate('/gestion')} className="btn-back-to-gestion">Volver al Dashboard</button>
            </div>
        </div>
    );
};

export default CrearClubPage;