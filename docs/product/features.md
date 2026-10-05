# Indice De Capacidades Del Producto

Este indice asigna un identificador estable y una unica especificacion primaria a cada capacidad.
El estado de implementacion se registra por separado; una capacidad no se elimina ni cambia de ID
cuando cambia su estado.

| ID      | Capacidad                                                                     | Especificacion primaria                                                  |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ACC-001 | Registro publico de cuenta                                                    | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-002 | Verificacion de correo                                                        | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-003 | Inicio, restauracion y cierre seguro de sesion                                | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-004 | Recuperacion de contrasena sin enumerar cuentas                               | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-005 | Cambio autenticado de contrasena                                              | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-006 | Consulta y edicion del perfil propio                                          | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-007 | Area personal `/perfil` con perfil, seguridad y accesos propios               | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-008 | Tratamiento seguro de estados y errores de cuenta                             | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| ACC-009 | Submenu del area personal con ruta propia por seccion                         | [Cuentas](../../spec/accounts/accounts-features.md)                      |
| CAT-001 | Administracion de unidades organizativas                                      | [Catalogos](../../spec/catalogs/catalogs-features.md)                    |
| CAT-002 | Administracion de carreras institucionales y globales                         | [Catalogos](../../spec/catalogs/catalogs-features.md)                    |
| CAT-003 | Inventario de aulas y laboratorios con disponibilidad, capacidad y amenidades | [Catalogos](../../spec/catalogs/catalogs-features.md)                    |
| CAT-004 | Consulta de disponibilidad de aulas por necesidad de actividad                | [Catalogos](../../spec/catalogs/catalogs-features.md)                    |
| CAT-005 | Referencias publicas y administracion restringida de catalogos                | [Catalogos](../../spec/catalogs/catalogs-features.md)                    |
| USR-001 | Listado, busqueda, filtros y paginacion de usuarios                           | [Usuarios](../../spec/users/users-features.md)                           |
| USR-002 | Creacion, detalle y modificacion de usuarios                                  | [Usuarios](../../spec/users/users-features.md)                           |
| USR-003 | Asignacion de unidad organizativa y carrera a usuarios                        | [Usuarios](../../spec/users/users-features.md)                           |
| USR-004 | Salvaguardas para conflictos y cambios administrativos criticos               | [Usuarios](../../spec/users/users-features.md)                           |
| COL-001 | Roles y permisos de colaboracion comprensibles                                | [Colaboracion](../../spec/collaboration/collaboration-features.md)       |
| COL-002 | Descubrimiento de programas y actividades accesibles                          | [Colaboracion](../../spec/collaboration/collaboration-features.md)       |
| COL-003 | Gestion de colaboradores en programas y actividades                           | [Colaboracion](../../spec/collaboration/collaboration-features.md)       |
| COL-004 | Herencia y procedencia de permisos                                            | [Colaboracion](../../spec/collaboration/collaboration-features.md)       |
| COL-005 | Permisos directos con vigencia                                                | [Colaboracion](../../spec/collaboration/collaboration-features.md)       |
| COL-006 | Actualizacion inmediata de navegacion y acciones autorizadas                  | [Colaboracion](../../spec/collaboration/collaboration-features.md)       |
| EPG-001 | Programa predeterminado permanente por unidad organizativa                    | [Programas](../../spec/event-programs/event-programs-features.md)        |
| EPG-002 | Listado administrativo de programas con busqueda y filtros                    | [Programas](../../spec/event-programs/event-programs-features.md)        |
| EPG-003 | Creacion de programas con identidad, fechas, etiqueta y banner                | [Programas](../../spec/event-programs/event-programs-features.md)        |
| EPG-004 | Edicion y publicacion de programas                                            | [Programas](../../spec/event-programs/event-programs-features.md)        |
| EPG-005 | Archivado y reactivacion de programas sin eliminacion fisica                  | [Programas](../../spec/event-programs/event-programs-features.md)        |
| EPG-006 | Colaboradores integrados al detalle del programa                              | [Programas](../../spec/event-programs/event-programs-features.md)        |
| EPG-007 | Seleccion de programa como contexto de trabajo                                | [Programas](../../spec/event-programs/event-programs-features.md)        |
| ACT-001 | Catalogo publico de actividades proximas, disponibles y pasadas               | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-002 | Busqueda, filtros combinados y prioridad por unidad seleccionada              | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-003 | Detalle publico de una actividad publicable                                   | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-004 | Administracion de datos y programacion de actividades                         | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-005 | Seleccion de aula compatible con horario, capacidad y equipamiento            | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-006 | Publicacion, despublicacion y cancelacion de actividades                      | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-007 | Eliminacion condicionada a una regla de retencion contractual                 | [Actividades](../../spec/activities/activities-features.md)              |
| ACT-008 | Seleccion de actividad como contexto de trabajo                               | [Actividades](../../spec/activities/activities-features.md)              |
| SPP-001 | Formulario publico completo de propuesta de ponente                           | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-002 | Seleccion de programa elegible para la propuesta                              | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-003 | Confirmacion y seguimiento seguro por el autor                                | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-004 | Bandeja administrativa con filtros y permisos por alcance                     | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-005 | Historial de versiones y feedback de propuestas                               | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-006 | Resolucion de propuestas sin crear actividades implicitamente                 | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-007 | Catalogo de ponentes y vinculacion opcional de cuenta                         | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| SPP-008 | Privacidad de CV y archivos de propuestas                                     | [Propuestas](../../spec/speaker-proposals/speaker-proposals-features.md) |
| ATT-001 | Inscripcion de participante en una actividad                                  | [Asistencia](../../spec/attendance/attendance-features.md)               |
| ATT-002 | Consulta y cancelacion contractual de inscripciones propias                   | [Asistencia](../../spec/attendance/attendance-features.md)               |
| ATT-003 | Codigo QR con alternativa de codigo manual                                    | [Asistencia](../../spec/attendance/attendance-features.md)               |
| ATT-004 | Registro asistido de entrada para personal autorizado                         | [Asistencia](../../spec/attendance/attendance-features.md)               |
| ATT-005 | Lista administrativa de inscritos y presentes                                 | [Asistencia](../../spec/attendance/attendance-features.md)               |
| ATT-006 | Prevencion de registros duplicados y respeto del contexto                     | [Asistencia](../../spec/attendance/attendance-features.md)               |
| CER-001 | Consulta de elegibilidad para certificados                                    | [Certificados](../../spec/certificates/certificates-features.md)         |
| CER-002 | Generacion individual idempotente                                             | [Certificados](../../spec/certificates/certificates-features.md)         |
| CER-003 | Generacion masiva desde la lista de asistencia                                | [Certificados](../../spec/certificates/certificates-features.md)         |
| CER-004 | Generacion automatica solo cuando la defina el contrato                       | [Certificados](../../spec/certificates/certificates-features.md)         |
| CER-005 | Consulta y descarga privada de certificados propios                           | [Certificados](../../spec/certificates/certificates-features.md)         |
| CER-006 | Actualizacion de certificados y alertas tras emision                          | [Certificados](../../spec/certificates/certificates-features.md)         |
| ALT-001 | Bandeja privada de alertas con filtros y paginacion                           | [Alertas](../../spec/alerts/alerts-features.md)                          |
| ALT-002 | Indicador accesible de alertas no leidas                                      | [Alertas](../../spec/alerts/alerts-features.md)                          |
| ALT-003 | Marcado individual y masivo de alertas leidas                                 | [Alertas](../../spec/alerts/alerts-features.md)                          |
| ALT-004 | Refresco y limpieza de alertas por identidad                                  | [Alertas](../../spec/alerts/alerts-features.md)                          |
| NTF-001 | Avisos por correo iniciados por acciones documentadas                         | [Notificaciones](../../spec/notifications/notifications-features.md)     |
| NTF-002 | Decision de notificar antes de modificar, cancelar o eliminar una actividad   | [Notificaciones](../../spec/notifications/notifications-features.md)     |
| NTF-003 | Aviso de feedback o resolucion al proponente                                  | [Notificaciones](../../spec/notifications/notifications-features.md)     |
| NTF-004 | Confirmacion visible del resultado de notificacion                            | [Notificaciones](../../spec/notifications/notifications-features.md)     |
| RPT-001 | Cifras de asistencia con filtros por alcance y rango                          | [Reportes](../../spec/reports/reports-features.md)                       |
| RPT-002 | Estadisticas de inscripcion, presencia, ocupacion y certificados              | [Reportes](../../spec/reports/reports-features.md)                       |
| RPT-003 | Dashboard con datos autoritativos y disponibilidad explicita                  | [Reportes](../../spec/reports/reports-features.md)                       |
| RPT-004 | Presentacion accesible de tablas y metricas                                   | [Reportes](../../spec/reports/reports-features.md)                       |
| RPT-005 | Exportacion protegida a Excel                                                 | [Reportes](../../spec/reports/reports-features.md)                       |
| RPT-006 | Exportacion protegida a PDF                                                   | [Reportes](../../spec/reports/reports-features.md)                       |
| RPT-007 | Permisos independientes para consultar y exportar reportes                    | [Reportes](../../spec/reports/reports-features.md)                       |
