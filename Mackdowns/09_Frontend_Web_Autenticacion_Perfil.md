# 09. Frontend Web: Autenticación, Registro, Perfil y Ficha Médica (React)

Este documento detalla la implementación en el cliente web de los flujos de inicio de sesión, registro institucional, verificación de cuentas, restablecimiento de contraseñas y la administración del perfil con su respectiva ficha médica de emergencia.

## 1. Portal de Acceso (`Login.jsx`)
- **Interfaz y Captura:** Solicita correo institucional y contraseña en un contenedor centrado con diseño institucional de ESCOM.
- **Consumo de Servicio:** Invoca `authService.login(correo, password)`.
- **Manejo de Respuestas y Errores:**
  - Si la autenticación es exitosa, guarda el token y perfil mediante `loginUser()`.
  - Muestra alertas específicas ante bloqueos temporales por límite de intentos fallidos (5 intentos = 15 minutos), credenciales inválidas o exceso en la tasa de peticiones por IP (código HTTP 429).
- **Redirección por Rol:**
  - Administrador (`role_id: 1`): Redirige a `/admin`.
  - Alumnos y Profesores (`role_id: 2, 3, 4`): Redirige a `/gestion`.

## 2. Registro Institucional Validado (`Register.jsx`)
- **Selección Dinámica de Rol:**
  - **Alumno (Rol 2):** Habilita campos obligatorios de Boleta (exactamente 10 dígitos), Número de Seguridad Social / NSS (exactamente 11 dígitos) y Selección de Carrera deportiva/académica. Exige correo con terminación `@alumno.ipn.mx`.
  - **Profesor (Rol 3):** Exige Número de Empleado oficial y correo institucional `@ipn.mx` (excluyendo explícitamente cuentas con dominio de alumno).
- **Políticas de Contraseña:** Aplica la expresión regular `/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/` (mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 símbolo especial).
- **Ficha Médica Opcional en Registro:** Permite capturar Tipo de Sangre y Condiciones Preexistentes/Alergias desde el primer momento.
- **Cumplimiento Regulatorio:** El botón de registro permanece inhabilitado hasta que el usuario marca la casilla de aceptación obligatoria del Aviso de Privacidad Institucional.

## 3. Verificación de Cuenta por Correo (`VerificarCuentaPage.jsx`)
- Se activa cuando un usuario intenta ingresar sin haber verificado su dirección institucional.
- **Entrada OTP:** Campo de texto numérico para capturar el código de 6 dígitos enviado por correo.
- **Reenvío Inteligente:** Permite solicitar un nuevo código de verificación con un temporizador de bloqueo temporal para evitar saturación de envíos.
- Al confirmar el código, actualiza el estado de verificación en el cliente y habilita el paso a los tableros principales.

## 4. Recuperación y Cambio de Contraseñas
- **`RecuperarPasswordPage.jsx`:**
  - **Fase 1:** Captura el correo institucional y llama a `/api/auth/recuperar-password` para despachar el código OTP.
  - **Fase 2:** Solicita el código OTP recibido, la nueva contraseña y su confirmación, aplicando las mismas reglas de complejidad antes de emitir la actualización a `/api/auth/restablecer-password`.
- **`CambiarPasswordPage.jsx`:**
  - Formulario accesible para usuarios con sesión iniciada (`/perfil/cambiar-password` o `/cambiar-password`).
  - Solicita la clave actual y la nueva contraseña, validando que difieran y cumplan con los estándares de seguridad.

## 5. Gestión de Perfil y Ficha Médica (`PerfilPage.jsx`)
- Consume el endpoint `/api/auth/perfil` para obtener la información unificada del usuario.
- **Datos Académicos / Institucionales:** Muestra datos no modificables (boleta, número de empleado, carrera, correo institucional y rol asignado).
- **Ficha Médica de Emergencia (Editable):**
  - Selector de Tipo de Sangre (A+, A-, B+, B-, AB+, AB-, O+, O-).
  - Área de texto para registro de Alergias y Condiciones Médicas Preexistentes.
  - **Contactos de Emergencia:** Módulo interactivo para registrar y editar contactos directos (Nombre, Teléfono y Parentesco: Padre, Madre, Tutor, Cónyuge, etc.).

## 6. Vistas Regulatorias e Informativas
- **`AvisoPrivacidadPage.jsx`:** Documento de transparencia y protección de datos personales alineado a la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO).
- **`TerminosCondicionesPage.jsx`:** Lineamientos de uso de la plataforma, normas de conducta en los clubes y responsabilidades de alumnos y entrenadores.
- **`UnauthorizedPage.jsx`:** Vista 403 que informa de manera clara la falta de privilegios requeridos para acceder a un recurso y ofrece un botón de retorno seguro al panel principal.
