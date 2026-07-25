# Estructura del Proyecto Completo (Backend Node.js & Frontend React)

# Arquitectura del Backend (Node.js / Express)

## 1. Estructura de Directorios y Propósito de Archivos

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # Configuración y conexión a la base de datos (ej. pool de MySQL)
│   ├── controllers/
│   │   └── authController.js     # Lógica de negocio para autenticación (login, registro, validación)
│   ├── middlewares/
│   │   ├── authMiddleware.js     # Verificación de tokens JWT y autenticación de usuarios
│   │   └── roleAuth.js           # Validación de roles y permisos específicos por ruta
│   ├── models/
│   │   └── userModel.js          # Consultas SQL e interacción con la tabla de usuarios
│   ├── routes/
│   │   ├── authRoutes.js         # Endpoints de autenticación (/api/auth/...)
│   │   ├── avisos.js             # Endpoints para la gestión de avisos y notificaciones
│   │   ├── clubes.js             # Endpoints para la administración de clubes
│   │   └── userRoutes.js         # Endpoints para la gestión general de usuarios
│   └── services/
│       └── authService.js        # Lógica auxiliar de autenticación o servicios externos relacionados
├── .env                          # Variables de entorno (puertos, secretos JWT, credenciales DB)
├── avisos_globales.js            # Script o utilidad para gestión global de avisos
├── limpiarDB.js                  # Script de mantenimiento para limpieza o reseteo de la base de datos
├── package.json                  # Dependencias y scripts de Node.js
├── seed.js                       # Script para poblar la base de datos con datos iniciales (seeders)
└── server.js                     # Punto de entrada principal de la aplicación Express
```

## 2. Descripción de Archivos Clave y Convenciones
- **`server.js`**: Inicializa la aplicación Express, configura los middlewares globales (CORS, JSON parser) y monta las rutas bajo prefijos organizados (`/api/...`).
- **`config/db.js`**: Administra la conexión a la base de datos centralizada.
- **Rutas y Controladores**: Separación estricta entre la definición de rutas (`routes/`) y la ejecución de la lógica de negocio (`controllers/`).


---

# Arquitectura del Frontend (React / Vite)

## 1. Estructura de Directorios y Propósito de Archivos

```text
frontend/
├── public/                       # Archivos estáticos públicos
├── src/
│   ├── assets/                   # Recursos estáticos (imágenes, iconos, SVGs)
│   ├── components/               # Componentes reutilizables de UI y lógica
│   │   ├── AccionesAlumno.jsx    # Componente con acciones específicas para el rol de alumno
│   │   └── ProtectedRoute.jsx    # Componente de ruta protegida basada en autenticación/roles
│   ├── context/
│   │   └── AuthContext.jsx       # Contexto global de autenticación (estado de sesión, token, usuario)
│   ├── pages/                    # Vistas principales de la aplicación
│   │   ├── css/                  # Hojas de estilo específicas o modulares
│   │   ├── AdminDashboard.jsx    # Panel de control para administradores
│   │   ├── AvisosAdminPage.jsx   # Vista de administración de avisos
│   │   ├── ClubChatPage.jsx      # Vista de chat o interacción de clubes
│   │   ├── ClubDetailsAdminPage.jsx # Detalles de club con vista de administración
│   │   ├── ClubDetailsPage.jsx   # Detalles generales del club para usuarios
│   │   ├── CrearClubPage.jsx     # Formulario/Vista para creación de nuevos clubes
│   │   ├── GestionDashboard.jsx  # Panel general de gestión
│   │   ├── Login.jsx             # Vista de inicio de sesión
│   │   ├── PerfilPage.jsx        # Vista de perfil de usuario
│   │   └── Register.jsx          # Vista de registro de nuevos usuarios
│   ├── services/                 # Servicios para comunicación HTTP con el backend
│   │   ├── api.js                # Instancia configurada de Axios/Fetch con interceptores base
│   │   └── authService.js        # Peticiones HTTP específicas de autenticación al backend
│   ├── App.css                   # Estilos globales de la app
│   ├── App.jsx                   # Componente raíz con la definición de rutas (React Router)
│   ├── index.css                 # Estilos base
│   └── main.jsx                  # Punto de entrada principal montado en el DOM
├── .env                          # Variables de entorno del cliente (ej. VITE_API_URL)
├── .gitignore                    # Archivos ignorados por Git
├── eslint.config.js              # Configuración de linter (ESLint)
├── index.html                    # HTML raíz
├── package.json                  # Dependencias y scripts del frontend
└── vite.config.js                # Configuración de Vite
```

## 2. Flujo de Datos y Conexión con el Backend
- **`services/api.js`**: Centraliza la URL base del servidor Node.js y se encarga de inyectar automáticamente el token JWT en las cabeceras HTTP si el usuario está autenticado.
- **`context/AuthContext.jsx`**: Mantiene el estado reactivo del usuario conectado en toda la aplicación web.
- **`ProtectedRoute.jsx`**: Protege las rutas privadas evaluando si existe una sesión válida antes de renderizar páginas como dashboards o chats.

