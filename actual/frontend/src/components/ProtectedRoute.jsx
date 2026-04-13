import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, rolesPermitidos }) => {
    const { user } = useAuth();

    // 1. Si no hay usuario en el contexto, al login
    if (!user) return <Navigate to="/" />;

    /**
     * 2. CORRECCIÓN DE ACCESO AL ROL:
     * Después de los cambios del backend, el rol está en user.role_id
     */
    const rolActual = user.role_id;
    
    // 3. Verificación robusta (Número vs Número)
    if (rolesPermitidos) {
        const tienePermiso = rolesPermitidos.map(Number).includes(Number(rolActual));
        
        if (!tienePermiso) {
            console.warn(`Acceso denegado. Rol del usuario: ${rolActual}. Permitidos: ${rolesPermitidos}`);
            return <Navigate to="/unauthorized" />;
        }
    }

    return children;
};

export default ProtectedRoute;