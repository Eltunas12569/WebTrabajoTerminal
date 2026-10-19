import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, rolesPermitidos }) => {
    const { user, loading } = useAuth();

    // 1. Esperar la validación autoritativa del servidor para evitar bypasses de UI
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{
                    width: '38px',
                    height: '38px',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#003366',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
            </div>
        );
    }

    // 2. Si no hay usuario en el contexto verificado, al login
    if (!user) return <Navigate to="/" replace />;

    /**
     * 3. Verificación de rol validado directamente por el servidor
     */
    const rolActual = user.role_id;
    
    // 4. Verificación robusta (Número vs Número)
    if (rolesPermitidos) {
        const tienePermiso = rolesPermitidos.map(Number).includes(Number(rolActual));
        
        if (!tienePermiso) {
            console.warn(`[Seguridad] Acceso denegado. Rol validado por el servidor: ${rolActual}. Permitidos: ${rolesPermitidos}`);
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;