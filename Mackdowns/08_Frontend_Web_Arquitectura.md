# 08. Frontend Web: Arquitectura, Herramientas y Core (React / Vite)

Este documento describe la arquitectura técnica de la aplicación web cliente, detallando la organización de directorios, dependencias del ecosistema, configuración del cliente HTTP y gestión del estado global de autenticación.

## 1. Estructura del Código Fuente (`actual/frontend`)

```text
actual/frontend/
├── public/                       # Assets estáticos servidos directamente (iconos, SVGs, imágenes)
├── src/
│   ├── assets/                   # Recursos gráficos integrados al bundle (SVGs, logos institucionales)
│   ├── components/               # Componentes modulares y reutilizables de interfaz
│   │   ├── AccionesAlumno.jsx    # Unión por código de club y gestión de invitaciones
│   │   ├── CalendarioEventos.jsx # Calendario mensual interactivo con RSVP y filtros
│   │   ├── ProtectedRoute.jsx    # Componente de guarda de rutas por autenticación y rol
│   │   └── Sidebar.jsx           # Barra lateral de navegación adaptativa según el rol
│   ├── context/
│   │   └── AuthContext.jsx       # Contexto global de sesión (usuario, token, login, logout)
│   ├── pages/                    # Vistas y pantallas principales de la aplicación
│   │   ├── css/                  # Hojas de estilo CSS modulares por pantalla
│   │   ├── AdminCalendarioPage.jsx # Calendario institucional global de eventos
│   │   ├── AdminDashboard.jsx    # Tablero de control general del administrador
│   │   ├── AdminEditUserPage.jsx # Formulario de modificación administrativa de usuarios
│   │   ├── AdminUsersPage.jsx    # Padrón general de usuarios con filtros y búsqueda
│   │   ├── AvisoPrivacidadPage.jsx # Documento oficial del Aviso de Privacidad (LGPDPPSO)
│   │   ├── AvisosAdminPage.jsx   # Publicador y auditor de avisos institucionales
│   │   ├── CambiarPasswordPage.jsx # Cambio voluntario de contraseña autenticado
│   │   ├── CanalesChatPage.jsx   # Canales institucionales privados (Directivos y Encargados)
│   │   ├── ClubChatPage.jsx      # Sala de conversación grupal en tiempo real del club
│   │   ├── ClubDetailsAdminPage.jsx # Inspección y auditoría de clubes por el administrador
│   │   ├── ClubDetailsPage.jsx   # Portal unificado del club (Info, Avisos, Eventos y Creación)
│   │   ├── ClubEmergenciasPage.jsx # Directorio médico confidencial para encargados
│   │   ├── ClubPanelPage.jsx     # Panel operativo y atajos de gestión del club
│   │   ├── CrearClubPage.jsx     # Formulario de propuesta y fundación de club para docentes
│   │   ├── GestionDashboard.jsx  # Tablero principal de alumnos y profesores con avisos priorizados
│   │   ├── Login.jsx             # Portal de acceso con redirección por rol
│   │   ├── PerfilPage.jsx        # Consulta de perfil y edición de Ficha Médica
│   │   ├── RecuperarPasswordPage.jsx # Solicitud y restablecimiento de contraseña mediante OTP
│   │   ├── Register.jsx          # Registro institucional validado por rol
│   │   ├── TerminosCondicionesPage.jsx # Reglamento deportivo y normas de convivencia
│   │   ├── UnauthorizedPage.jsx  # Pantalla de acceso restringido (Error HTTP 403)
│   │   └── VerificarCuentaPage.jsx # Validación de cuenta por correo con código OTP de 6 dígitos
│   ├── services/                 # Capa de red y comunicación HTTP con el backend
│   │   ├── api.js                # Instancia singleton de Axios con interceptores de JWT y 401
│   │   └── authService.js        # Métodos para login, registro y recuperación de contraseña
│   ├── App.css                   # Disposición y contenedores principales de la app
│   ├── App.jsx                   # Enrutador central, tabla de rutas y guardias RBAC
│   ├── index.css                 # Reseteo CSS global y tipografía institucional
│   └── main.jsx                  # Montaje DOM con createRoot en nodo #root
├── .env                          # Variables de entorno cliente (ej. VITE_API_URL)
├── eslint.config.js              # Configuración de linter (Flat Config de ESLint)
├── index.html                    # HTML raíz de la Single Page Application (SPA)
├── package.json                  # Manifiesto de dependencias y scripts de construcción
└── vite.config.js                # Configuración de Vite con Fast Refresh para React
```

## 2. Herramientas y Ecosistema Tecnológico
- **Vite (v7.3.1):** Servidor de desarrollo basado en ESM nativo con Hot Module Replacement (HMR) y compilador de producción optimizado mediante Rollup.
- **React (v19.2.0) & React-DOM:** Biblioteca base para el desarrollo de la interfaz mediante componentes funcionales, renderizado reactivo y manipulación eficiente del Virtual DOM.
- **React Router DOM (v7.13.1):** Motor de enrutamiento del lado del cliente para navegación fluida sin recargas de página.
- **Axios (v1.13.6):** Cliente HTTP basado en promesas con soporte de interceptores globales.
- **Socket.IO Client (v4.8.3):** Conexión bidireccional mediante WebSockets para chat en tiempo real y notificaciones push inmediatas.
- **jwt-decode (v4.0.0):** Decodificación y lectura de claims en el token JWT en el cliente.
- **ESLint (v9.39.1):** Análisis estático y garantía del cumplimiento de las reglas de React Hooks.

## 3. Capa de Red e Interceptores HTTP (`src/services/api.js`)
Toda la comunicación con la API REST del backend (`http://localhost:3000/api`) se centraliza en `api.js`:
- **Inyección Automática de Token:** Un interceptor de petición lee el token JWT de `localStorage` y lo anexa a la cabecera `Authorization: Bearer <token>` en cada solicitud saliente.
- **Manejo Centralizado de Expiración (HTTP 401):** Si el servidor responde con un código 401 (token expirado o inválido), el interceptor de respuesta limpia inmediatamente `user_data` y `token` del almacenamiento local y fuerza la redirección al login (`/`) para evitar accesos a vistas desactualizadas.

## 4. Gestión de Estado Global de Autenticación (`AuthContext.jsx`)
- Provee los datos de la sesión activa en todo el árbol de componentes mediante el hook personalizado `useAuth()`.
- **Persistencia Local:** Al iniciar sesión (`loginUser`), almacena el objeto de usuario bajo `user_data` y el token bajo `token` en `localStorage`.
- **Cierre de Sesión Seguro (`logout`):** Purga las claves de sesión local y redirige al inicio.

## 5. Control de Acceso Basado en Roles (`ProtectedRoute.jsx`)
- Actúa como guardia de rutas (*Route Guard*).
- Si no existe un usuario autenticado en el contexto, redirige inmediatamente a `/`.
- Si la ruta define `rolesPermitidos` (ej. `[1]` para Administrador, `[2, 3, 4]` para Alumnos y Profesores, o `[3]` para Creación de Clubes), evalúa numéricamente `user.role_id`. Si el usuario no cuenta con el rol requerido, redirige a la vista `/unauthorized` impidiendo accesos indebidos.
