import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, rolesPermitidos }) => {
    const { user } = useAuth();

    // 1. Si no hay usuario en el contexto, al login
    if (!user) return <Navigate to="/" />;

    /**
     * 2. CORRECCIÓN DE ACCESO AL ROL:
     * Dependiendo de cómo guardes el usuario en AuthContext, 
     * el rol suele estar en user.rol o user.user.rol.
     * Aquí normalizamos ambos casos y convertimos a Número.
     */
    const rolActual = user.rol || (user.user && user.user.rol);
    
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