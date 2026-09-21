import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import RecuperarPasswordPage from './pages/RecuperarPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import GestionDashboard from './pages/GestionDashboard';
import CrearClubPage from './pages/CrearClubPage'; 
import ClubDetailsAdminPage from './pages/ClubDetailsAdminPage';
import AvisosAdminPage from './pages/AvisosAdminPage';
import PerfilPage from './pages/PerfilPage';
import CambiarPasswordPage from './pages/CambiarPasswordPage';
import ClubChatPage from './pages/ClubChatPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import ClubPanelPage from './pages/ClubPanelPage';
import VerificarCuentaPage from './pages/VerificarCuentaPage';
import AvisoPrivacidadPage from './pages/AvisoPrivacidadPage';
import TerminosCondicionesPage from './pages/TerminosCondicionesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminEditUserPage from './pages/AdminEditUserPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

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
          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
          <Route path="/aviso-privacidad" element={<AvisoPrivacidadPage />} />
          <Route path="/terminos-condiciones" element={<TerminosCondicionesPage />} />
          <Route path="/verificar-cuenta" element={
            <ProtectedRoute>
              <VerificarCuentaPage />
            </ProtectedRoute>
          } />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

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

          {/* Crear Club (solo para Profesores) */}
          <Route path="/crear-club" element={
            <ProtectedRoute rolesPermitidos={[3]}>
              <CrearClubPage />
            </ProtectedRoute>
          } />

          {/* Detalles Públicos del Club (Usuarios regulares) */}
          <Route path="/club/:id" element={
            <ProtectedRoute rolesPermitidos={[2, 3, 4]}>
              <ClubDetailsPage />
            </ProtectedRoute>
          } />

          {/* Detalles del Club (Administrador) */}
          <Route path="/admin/club/:id" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <ClubDetailsAdminPage />
            </ProtectedRoute>
          } />

          {/* Página de Avisos (Administrador) */}
          <Route path="/admin/avisos" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <AvisosAdminPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/usuarios" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <AdminUsersPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/usuarios/:id/editar" element={
            <ProtectedRoute rolesPermitidos={[1]}>
              <AdminEditUserPage />
            </ProtectedRoute>
          } />

          {/* Configuración de Perfil (Cualquier usuario logueado) */}
          <Route path="/perfil" element={
            <ProtectedRoute rolesPermitidos={[1, 2, 3, 4]}>
              <PerfilPage />
            </ProtectedRoute>
          } />
          {/* Cambiar Contraseña (Cualquier usuario logueado) */}
          <Route path="/cambiar-password" element={
            <ProtectedRoute rolesPermitidos={[1, 2, 3, 4]}>
              <CambiarPasswordPage />
            </ProtectedRoute>
          } />
          <Route path="/perfil/cambiar-password" element={
            <ProtectedRoute rolesPermitidos={[1, 2, 3, 4]}>
              <CambiarPasswordPage />
            </ProtectedRoute>
          } />
          {/* Panel del club: avisos, eventos y recursos */}
          <Route path="/club/:id/panel" element={
            <ProtectedRoute rolesPermitidos={[2, 3, 4]}>
              <ClubPanelPage />
            </ProtectedRoute>
          } />

          {/* Chat del Club (Profesores y Alumnos Encargados y alumnos) */}
          <Route path="/chat/:id" element={
              <ProtectedRoute rolesPermitidos={[2, 3, 4]}>
                  <ClubChatPage />
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