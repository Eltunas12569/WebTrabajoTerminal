import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './css/Unauthorized.css';

const nombresRoles = {
    1: 'Administrador',
    2: 'Alumno',
    3: 'Profesor',
    4: 'Alumno representante'
};

const UnauthorizedPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const rol = nombresRoles[Number(user?.role_id)] || 'Usuario';

    const volverAlPanel = () => {
        navigate(Number(user?.role_id) === 1 ? '/admin' : '/gestion');
    };

    return (
        <main className="unauthorized-page">
            <div className="unauthorized-orbit unauthorized-orbit-one" />
            <div className="unauthorized-orbit unauthorized-orbit-two" />

            <section className="unauthorized-card" aria-labelledby="unauthorized-title">
                <div className="unauthorized-brand">
                    <span className="unauthorized-brand-mark">ES</span>
                    <span>Sistema de Clubes · ESCOM IPN</span>
                </div>

                <div className="unauthorized-status" aria-hidden="true">
                    <span className="unauthorized-status-code">403</span>
                    <span className="unauthorized-status-line" />
                </div>

                <p className="unauthorized-eyebrow">Acceso restringido</p>
                <h1 id="unauthorized-title">No tienes permisos para esta sección</h1>
                <p className="unauthorized-description">
                    Tu cuenta está autenticada como <strong>{rol}</strong>, pero este espacio requiere un nivel
                    de autorización diferente. Puedes regresar a tu panel o cerrar la sesión actual.
                </p>

                <div className="unauthorized-actions">
                    <button type="button" className="unauthorized-primary" onClick={volverAlPanel}>
                        Volver a mi panel
                    </button>
                    <button type="button" className="unauthorized-secondary" onClick={logout}>
                        Cerrar sesión
                    </button>
                </div>

                <p className="unauthorized-help">
                    Si necesitas acceso por motivos académicos o administrativos, solicita autorización al responsable
                    del sistema.
                </p>
            </section>
        </main>
    );
};

export default UnauthorizedPage;