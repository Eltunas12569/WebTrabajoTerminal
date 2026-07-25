# 04. Frontend Móvil: Arquitectura Android (Kotlin)

Este documento describe la estructura del proyecto en Android Studio, detallando la organización de las Activities, la capa de red y la configuración de construcción.

## 1. Estructura del Código Fuente (`com.example.stt`)

```text
app/src/main/
├── AndroidManifest.xml         # Archivo de manifiesto (permisos de red, declaración de activities)
├── java/com/example/stt/
│   ├── ApiService.kt           # Interfaz de Retrofit con las definiciones de los endpoints del backend
│   ├── RetrofitClient.kt       # Instancia singleton de Retrofit e interceptores HTTP (Inyección de JWT)
│   ├── SessionManager.kt       # Utilidad para gestionar SharedPreferences (guardado de token, datos de usuario y rol)
│   ├── SplashActivity.kt       # Pantalla de carga inicial y verificación de sesión
│   ├── MainActivity.kt         # Lógica de inicio de sesión (Login)
│   ├── RegisterActivity.kt     # Registro de nuevos usuarios
│   ├── GeneralActivity.kt      # Actividad base o contenedora general
│   ├── HomeActivity.kt         # Pantalla principal para usuarios regulares (Alumnos/Profesores)
│   ├── AdminHomeActivity.kt    # Pantalla principal del panel de administración
│   ├── MisClubesActivity.kt    # Listado de clubes a los que pertenece el usuario
│   ├── NuevoClubActivity.kt    # Formulario para proponer la creación de un nuevo club
│   ├── EditarClubActivity.kt   # Vista para edición de información de clubes
│   ├── ClubDashboardActivity.kt# Dashboard principal interno de un club (Chat, Avisos, Eventos)
│   └── PerfilActivity.kt       # Vista y edición del perfil del usuario (datos médicos, contactos)
└── res/
    ├── raw/
    │   └── anim_success.json   # Archivos Lottie o animaciones JSON
    ├── values/                 # Recursos de strings, themes y colores
    └── drawable/, menu/, mipmap/ # Iconografía y recursos gráficos
```

## 2. Capa de Red y Autenticación (El puente con Node.js)
- **Retrofit y GSON/Moshi:** Toda la comunicación HTTP se centraliza en `ApiService.kt`.
- **Manejo de Sesión (`SessionManager`):** Responsable de guardar el token JWT en almacenamiento local y proveerlo al `RetrofitClient` para adjuntarlo en las cabeceras `Authorization: Bearer <token>` de las peticiones protegidas.
- **Rutas Mapeadas:** Las funciones en `ApiService` reflejan directamente los endpoints del backend estructurados en `03_Backend_API_Controllers.md` (ej. login, perfil, clubes, avisos, etc.).

## 3. Navegación y Flujo de Roles
- El flujo de la aplicación diverge en el login (`MainActivity`). Dependiendo del `role_id` devuelto por el servidor y guardado en `SessionManager`, el usuario es redirigido a `AdminHomeActivity` (Rol 1) o `HomeActivity` (Roles 2 y 3).
- Las vistas de gestión de clubes (`NuevoClubActivity`, `EditarClubActivity`, `ClubDashboardActivity`) están construidas sobre la lógica de la base de datos de inscripciones, mostrando opciones diferentes si el usuario es encargado o miembro.

## 4. Configuración de Construcción (Gradle)
- **DSL:** Utiliza Kotlin DSL (`build.gradle.kts` y `settings.gradle.kts`) en lugar de Groovy tradicional.
- **Gestión de Dependencias:** Emplea `libs.versions.toml` (Version Catalog) para centralizar y unificar las versiones de las librerías (como Retrofit, OkHttp, Coroutines, etc.) en todo el proyecto.
