# 12. Frontend Web: Emergencias Médicas y Comunicación en Tiempo Real (React / WebSockets)

Este documento detalla la implementación del directorio médico de emergencia para encargados de clubes, así como las salas de conversación grupal y canales directivos en tiempo real basadas en WebSockets con Socket.IO.

## 1. Directorio Médico de Emergencia (`ClubEmergenciasPage.jsx`)
Vista de uso estrictamente confidencial ubicada en la ruta `/club/:id/emergencias`:
- **Barrera de Privilegios:** Exclusiva para el Profesor Titular, Alumno Encargado y Administrador. Si un usuario regular intenta entrar, el backend y el frontend bloquean el acceso retornando error 403.
- **Padrón Médico del Club:**
  - Consume `/api/clubes/:idClub/emergencias`.
  - Muestra la lista de todos los integrantes activos del club clasificados por jerarquía (Profesor Titular, Alumno Encargado, Miembros).
  - **Datos Médicos Clave:**
    - Tipo de Sangre (destacado con etiqueta de alta visibilidad).
    - Alergias y Condiciones Médicas Preexistentes.
    - Número de Seguridad Social (NSS) para gestiones ante servicios hospitalarios.
- **Herramientas de Contacto Inmediato:**
  - Despliega los contactos de emergencia registrados por cada alumno (Nombre, Teléfono y Parentesco).
  - **Botón de Copiado Rápido:** Botón amplio y accesible para copiar el número telefónico al portapapeles con un solo toque y confirmación visual inmediata ("¡Copiado!").
- **Filtros y Búsqueda Operativa:**
  - Buscador predictivo por nombre, boleta o rol.
  - Filtros rápidos para localizar inmediatamente a alumnos con condiciones preexistentes o tipos de sangre específicos.

## 2. Chat en Tiempo Real del Club (`ClubChatPage.jsx`)
Sala de conversación interactiva para todos los integrantes activos de un club deportivo:
- **Autenticación en el Handshake:** Al montar el componente, se instancia el cliente de `socket.io-client` enviando el token JWT en las opciones de conexión (`auth: { token }`).
- **Gestión de Salas:**
  - Emite el evento `unirse_club` enviando el `club_id`.
  - El servidor valida la pertenencia del alumno al club antes de incorporarlo al canal `club_${clubId}`.
- **Sincronización de Mensajes:**
  - Carga el historial previo mediante llamada HTTP a `/api/clubes/:id/chat`.
  - Escucha el evento `nuevo_mensaje` emitido por el socket para añadir mensajes instantáneamente al final de la conversación sin recargas.
  - **Envío en Tiempo Real:** Emite `enviar_mensaje` con el contenido del mensaje y el identificador del club.
  - **Scroll Automático:** Desplaza suavemente el scroll hacia el mensaje más reciente mediante referencias de React (`useRef`).

## 3. Canales Institucionales de Comunicación (`CanalesChatPage.jsx`)
Centro de coordinación directiva accesible desde `/canales-chat`, `/chat-directivos` y `/chat-encargados`:
- **Canal 1: Directivos (`sala_directivos`):**
  - Espacio de enlace entre el Administrador General de la escuela y los encargados de todos los clubes.
  - Emite `unirse_chat_directivos` y escucha `nuevo_mensaje_directivos`.
- **Canal 2: Encargados (`sala_encargados`):**
  - Espacio privado de apoyo y logística exclusivo entre Profesores Titulares y Alumnos Encargados.
  - Emite `unirse_chat_encargados` y escucha `nuevo_mensaje_encargados`.
- **Etiquetas de Representación en Vivo:**
  - Los mensajes muestran la insignia del club que representa el emisor (por ejemplo: `Profe Titular - Fútbol`, `Alumno Rep. - Taekwondo`), facilitando la identificación institucional de los participantes.
- **Selector Integrado:** Barra de navegación lateral que permite alternar fluidamente entre ambos canales institucionales.
