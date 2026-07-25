# 01. Base de Datos: Estructura y Relaciones (Sistema TT)

Este documento contiene el esquema completo de la base de datos `sistema_tt`, con las definiciones de sus 15 tablas y relaciones clave. Se omiten los datos (inserts) para mantener el archivo optimizado [cite: 21].

## 1. Tablas de Autenticación y Usuarios
El sistema maneja la herencia de usuarios separando los datos generales de los detalles específicos por rol [cite: 21].

```sql
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombres` varchar(100) NOT NULL,
  `apellido_paterno` varchar(100) NOT NULL,
  `apellido_materno` varchar(100) DEFAULT NULL,
  `correo` varchar(100) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role_id` int DEFAULT '2',
  `intentos_fallidos` int DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
);

CREATE TABLE `alumnos_detalles` (
  `usuario_id` int NOT NULL,
  `nss` varchar(11) NOT NULL,
  `boleta` varchar(10) NOT NULL UNIQUE,
  `carrera` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`usuario_id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `profesores_detalles` (
  `usuario_id` int NOT NULL,
  `num_empleado` varchar(20) DEFAULT NULL UNIQUE,
  PRIMARY KEY (`usuario_id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);
```

## 2. Tablas de Perfil y Emergencia
Manejan la información médica y contactos de los usuarios [cite: 21].

```sql
CREATE TABLE `fichas_medicas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL UNIQUE,
  `tipo_sangre` varchar(5) DEFAULT NULL,
  `condiciones_preexistentes` text,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `contactos_emergencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `telefono` varchar(15) NOT NULL,
  `parentesco` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);
```

## 3. Tablas Core: Gestión de Clubes
Administran la creación, estatus y miembros de los clubes [cite: 21].

```sql
CREATE TABLE `clubes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `estatus` enum('activo','inactivo','en_revision','rechazado','esperando_firmas') DEFAULT 'en_revision',
  `codigo_union` varchar(10) DEFAULT NULL UNIQUE,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `objetivo` text,
  `cronograma` json DEFAULT NULL,
  `detalle_actividades` text,
  `espacios_tiempos` text,
  `impacto` text,
  `archivo_lista_estudiantes` varchar(255) DEFAULT NULL,
  `motivo_rechazo` text,
  PRIMARY KEY (`id`)
);

CREATE TABLE `inscripciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `club_id` int NOT NULL,
  `rol_en_club` enum('miembro','encargado_alumno','encargado_profesor') DEFAULT 'miembro',
  `fecha_inscripcion` datetime DEFAULT CURRENT_TIMESTAMP,
  `estatus` enum('activo','inactivo','pendiente') DEFAULT 'activo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_club_unico` (`usuario_id`,`club_id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `historial_encargados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `rol_desempenado` varchar(50) DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);
```

## 4. Tablas de Interacción y Operación
Manejan la comunicación (Avisos, Chat), eventos y recursos de los clubes [cite: 21].

```sql
CREATE TABLE `avisos_globales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text NOT NULL,
  `prioridad` enum('alta','normal','baja') DEFAULT 'normal',
  `autor_id` int NOT NULL,
  `club_id` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_vencimiento` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE
);

CREATE TABLE `avisos_club` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `contenido` text NOT NULL,
  `fecha_envio` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `chat_club` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `mensaje` text NOT NULL,
  `fecha_envio` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `eventos_club` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `fecha_evento` varchar(100) NOT NULL,
  `lugar` varchar(150) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `asistencias_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evento_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `asistira` tinyint(1) NOT NULL,
  `fecha_respuesta` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `evento_id` (`evento_id`,`usuario_id`),
  FOREIGN KEY (`evento_id`) REFERENCES `eventos_club` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);

CREATE TABLE `solicitudes_recursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo_recurso` enum('material','espacio') NOT NULL,
  `nombre_recurso` varchar(150) NOT NULL,
  `cantidad` int DEFAULT '1',
  `motivo` text,
  `estatus` enum('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `tipo_club` varchar(50) DEFAULT 'Académico',
  `unidad` varchar(50) DEFAULT NULL,
  `especificaciones` text,
  `opciones_marcas` text,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
);
```
