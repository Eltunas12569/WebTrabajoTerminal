import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import GestionDashboard from './pages/GestionDashboard';
import CrearClubPage from './pages/CrearClubPage'; // Asume que este archivo existe
import ClubDetailsAdminPage from './pages/ClubDetailsAdminPage';

/**
 * Configuración de Rutas del Sistema de Gestión Deportiva - ESCOM
 * Implementa seguridad por roles (RBAC) para proteger el acceso a Azure.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<h1 style={{padding: '20px'}}>No tienes permiso para estar aquí.</h1>} />

          {/* --- RUTAS PROTEGIDAS --- */}
          
          {/* Solo Administrador (role_id: 1) */}
          <Route path="/admin" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Gestión Deportiva (Profesores, Alumnos Encargados y Alumnos) 
              rolesPermitidos: [2: Profesor, 3: Alumno Encargado, 4: Alumno] */}
          <Route path="/gestion" element={
            <ProtectedRoute rolesPermitidos={[2, 3, 4]}>
              <GestionDashboard />
            </ProtectedRoute>
          } />

          {/* Crear Club (Administrador) */}
          <Route path="/crear-club" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <CrearClubPage />
            </ProtectedRoute>
          } />

          {/* Detalles del Club (Administrador) */}
          <Route path="/admin/club/:id" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <ClubDetailsAdminPage />
            </ProtectedRoute>
          } />

          {/* Manejo de errores 404 */}
          <Route path="*" element={<div style={{ padding: '20px' }}><h1>404 - Página no encontrada</h1></div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;