# Contexto Del Proyecto

## Producto

La aplicacion es el frontend de una plataforma de gestion de eventos academicos. Este repositorio contiene solo la interfaz web; el backend sera un proyecto separado y se consumira mediante una futura capa de cliente/API.

## Alcance Del Frontend

- Mostrar vistas de eventos, asistencia, certificados, aulas, ponentes, reportes y administracion de usuarios.
- Mantener datos de demostracion en archivos frontend mientras no exista backend.
- Separar vistas de pagina, componentes reutilizables, datos mock, estado compartido y utilidades.
- No incluir controladores, modelos de base de datos, rutas de servidor, migraciones, colas ni mailers.

## Lenguaje De Dominio

### Usuario

Persona que usa la plataforma. Puede ser asistente, colaborador, organizador, administrador o ponente segun sus permisos en cada evento.

### Facultad

Unidad academica usada para clasificar usuarios, carreras y eventos. Las listas de eventos pueden priorizar contenido relacionado con la facultad seleccionada.

### Carrera

Programa academico asociado a un usuario. Se usa para segmentacion, reportes y comunicaciones.

### Permiso De Evento

Capacidad asignada a un usuario para colaborar en un evento. Puede aplicar a un evento grande o a un evento pequeno. Los permisos de un evento grande se heredan por defecto en sus eventos pequenos.

### Evento Grande

Evento principal o serie de eventos. Tiene nombre, fechas, etiqueta personalizada, banner, colaboradores y permisos. Puede agrupar multiples eventos pequenos.

### Evento Pequeno

Actividad individual que puede pertenecer a un evento grande. Tiene nombre, tipo, ponente, aula, fecha, hora, equipamiento requerido, banner, colaboradores y permisos.

### Asistente Registrado

Usuario inscrito o esperado en un evento. Puede recibir notificaciones cuando el evento se modifica o elimina.

### Registro De Asistencia

Evidencia de presencia en un evento. Puede capturarse mediante QR o codigo manual.

### Certificado

Documento generado a partir de la asistencia. Puede generarse automaticamente o desde la lista de asistencia.

### Aula

Espacio disponible para eventos. Tiene tipo, horarios disponibles, dias disponibles, capacidad maxima y amenidades.

### Amenidad De Aula

Recurso disponible en un aula, como proyector, escritorios, mesas, smart board o pizarra.

### Ponente

Persona que propone o imparte una actividad. El registro de ponentes captura nombre, email, CV, duracion aproximada, tipo de charla, titulo, contenido, fecha de envio y evento al que aplica.

### Reporte

Vista o exportacion con metricas de eventos, asistencia y certificados. Puede exportarse a Excel o PDF.

### Estadistica

Indicador resumido para seguimiento operativo: asistencia total, ocupacion de aulas, certificados generados, eventos activos y eventos pasados.

## Modulos Esperados

### Experiencia De Eventos

Modulo frontend para descubrir eventos disponibles y pasados, filtrar por facultad, consultar detalles y preparar futuras acciones de inscripcion o asistencia.

### Administracion De Eventos

Modulo frontend para crear, modificar y eliminar eventos grandes y pequenos. Debe contemplar preguntas de confirmacion antes de notificar asistentes registrados.

### Asistencia

Modulo frontend para registrar asistencia por QR o codigo manual y consultar listas de asistencia.

### Certificados

Modulo frontend para consultar y disparar la generacion de certificados desde registros de asistencia.

### Inventario De Aulas

Modulo frontend para administrar disponibilidad, capacidad y amenidades de aulas.

### Registro De Ponentes

Modulo frontend para recibir propuestas de ponentes y asociarlas con eventos.

### Reportes Y Estadisticas

Modulo frontend para visualizar indicadores y preparar exportaciones.

### Administracion De Usuarios

Modulo frontend para crear usuarios, seleccionar facultad/carrera, modificar datos y asignar permisos en eventos.

## Decisiones De Trabajo

- Mientras no exista backend, los datos del producto viven en archivos mock dentro de `src/data`.
- Las paginas de nivel ruta viven en `src/pages`.
- Los componentes reutilizables viven en `src/components`.
- El estado global con Zustand se reserva para preferencias o estado compartido real; el estado local debe permanecer local.
- Las futuras llamadas al backend deben aislarse en una capa de cliente/API y no deben hardcodearse dentro de componentes.
- Las mejoras de arquitectura deben priorizar locality, leverage y seams claros sin introducir abstracciones innecesarias.
