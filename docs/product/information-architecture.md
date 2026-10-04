# Arquitectura De Informacion

Este documento clasifica los destinos navegables de SIPEG por audiencia y autoridad. Las rutas
describen la organizacion actual del frontend; el backend sigue siendo la autoridad final de acceso.

## Areas De Navegacion

### Publica

Disponible sin sesion:

| Ruta               | Proposito                                                |
| ------------------ | -------------------------------------------------------- |
| `/`                | Catalogo publico de actividades.                         |
| `/login`           | Inicio de sesion.                                        |
| `/registro`        | Registro publico de cuenta.                              |
| `/verify-email`    | Verificacion de correo mediante enlace seguro.           |
| `/forgot-password` | Solicitud de enlace de recuperacion de contrasena.       |
| `/reset-password`  | Restablecimiento mediante el enlace recibido por correo. |

`/forgot-password` se alcanza desde el enlace "¿Olvidó su contraseña?" del formulario de inicio de
sesion. `/reset-password` es un flujo directo: el backend genera el enlace con el parametro `token`,
que la pagina lee una vez y retira de inmediato de la barra de direcciones para que no quede en el
historial, en capturas ni en registros. Ninguna de las dos rutas exige sesion.

### Personal

Destinos del participante autenticado, previstos para autoservicio:

- `/perfil/datos` para los datos que el contrato permite cambiar.
- `/perfil/seguridad` para la contrasena de la cuenta.
- `/perfil/actividades` para inscripciones y codigos de asistencia.
- `/perfil/certificados` para consulta y descarga privada.
- `/alertas` para la bandeja personal.

`/perfil` es ademas el unico destino personal del menu principal: el enlace "Cambiar contraseña" salio
de `AppMenu` y queda disponible desde la seccion de seguridad y por enlace directo. Antes de la
Fase 1.9 los servicios de actividades y certificados se anunciaban como tarjetas informativas dentro
de `/perfil`, sin enlaces ni controles, porque sus contratos aun no existen y enlazarlos los convertiria
en un callejon sin salida. La Fase 1.9 los convierte en rutas navegables con estado informativo, y las
fases 9 y 10 rellenan su funcionalidad en esas mismas rutas.

### Perfil Del Participante

| Ruta                   | Modulo                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| `/perfil`              | Abre los datos de la cuenta; conserva el enlace historico.       |
| `/perfil/datos`        | Consulta y edicion de los datos que el contrato permite cambiar. |
| `/perfil/seguridad`    | Cambio de contrasena de la sesion autenticada.                   |
| `/perfil/actividades`  | Inscripciones y codigos de asistencia, desde la Fase 9.          |
| `/perfil/certificados` | Consulta y descarga privada, desde la Fase 10.                   |

Todas exigen sesion y estan disponibles para cualquier rol global, porque el area personal protege la
identidad de la persona y no el panel. `/cambiar-contrasena` se conserva como alias de
`/perfil/seguridad` para no romper los enlaces ya compartidos.

Desde la Fase 1.7 la pagina agrupaba tres secciones en un unico documento. Desde la Fase 1.9 cada
seccion tiene ruta propia y un submenu comun: lateral siempre visible en escritorio y desplegable
local con la seccion actual a la vista en movil. `/perfil` abre los datos de la cuenta y
`/cambiar-contrasena` redirige a la seguridad, de modo que no quedan dos rutas equivalentes y los
enlaces ya compartidos siguen funcionando. La seccion de seguridad se resuelve en su propia ruta y no
lee el catalogo institucional, por lo que un fallo del catalogo ya no puede ocultar el cambio de
contrasena. La jerarquia de encabezados va del `h1` del area a un `h2` por seccion.

Solo `firstName`, `lastName`, `unitId` y `careerId` son editables. Correo, rol global, estado,
identificador y cedula los administra el backend y se muestran como texto de solo lectura. Elegir la
unidad "Otro" envia `unitId: null` y muestra la carrera global "Otros" bloqueada, porque el backend
la asigna. El perfil vive solo en memoria: nunca se persiste ni entra en una clave de consulta.

### Seguridad De La Sesion Actual

| Ruta                  | Modulo                                                 |
| --------------------- | ------------------------------------------------------ |
| `/cambiar-contrasena` | Cambio de contrasena de la sesion autenticada vigente. |

`/cambiar-contrasena` exige sesion y redirige a `/perfil/seguridad`, que es la seccion canonica. La
ruta antigua sigue funcionando por enlace directo y por marcador, porque la redireccion reemplaza la
entrada del historial en lugar de acumular una. El enlace ya no aparece en el menu principal, que solo
ofrece "Mi perfil" como destino personal.

El cambio conserva la sesion actual y el backend revoca las demas sesiones abiertas. Esa revocacion
no invalida de inmediato un token de acceso ya emitido en otra pestana: esa pestana sigue operando
hasta que intente renovar su credencial de refresco y el backend la rechace.

### Panel Administrativo Actual

En Fase 0 todas las rutas implementadas del panel exigen sesion y rol global `ADMIN`:

| Ruta                        | Modulo                                                           |
| --------------------------- | ---------------------------------------------------------------- |
| `/admin`                    | Resumen operativo.                                               |
| `/admin/eventos`            | Catalogo administrativo y contexto.                              |
| `/admin/aulas`              | Inventario, filtros y alta de aulas.                             |
| `/admin/aulas/:classroomId` | Detalle, estado, amenidades y disponibilidad semanal de un aula. |
| `/admin/unidades`           | Consulta administrativa de unidades organizativas.               |
| `/admin/carreras`           | Administracion de carreras institucionales y globales.           |
| `/admin/ponentes`           | Read model transitorio de propuestas.                            |
| `/admin/usuarios`           | Read model transitorio de usuarios.                              |
| `/admin/asistencia`         | Read model transitorio de asistencia.                            |
| `/admin/certificados`       | Read model transitorio de certificados.                          |
| `/admin/reportes`           | Read model transitorio de reportes.                              |

El menu del panel enlaza todos estos modulos; ninguna ruta implementada queda huerfana.

### Operaciones Por Capacidad

La futura area `/operaciones` reunira programas, actividades, asistencia, certificados y reportes
para colaboradores con capacidad efectiva. No se implementa en Fase 0: primero debe existir un
contrato para descubrir todos los programas y actividades accesibles sin consultar el catalogo
publico recurso por recurso. Esta decision se resuelve en Fase 3.

Los catalogos institucionales y la administracion global de usuarios continuaran siendo exclusivos
de `ADMIN`. Los guards del frontend mejoran la experiencia, pero no sustituyen la autorizacion del
backend.

## Aliases Heredados

Las rutas `/eventos`, `/aulas`, `/unidades`, `/carreras`, `/ponentes`, `/usuarios`, `/asistencia`,
`/certificados` y `/reportes` redirigen temporalmente a su equivalente bajo `/admin`. Se conservan
para no romper enlaces locales existentes y deben retirarse cuando la navegacion por capacidades de
Fase 3 defina los destinos canonicos de operaciones.

## Reglas De Navegacion

- Una ruta implementada debe aparecer en el menu apropiado o documentarse como flujo directo.
- La visibilidad de un enlace no concede permisos; cada solicitud conserva autorizacion backend.
- Las rutas publicas y personales no reutilizan datos administrativos ni sus caches.
- Los nombres visibles usan vocabulario de producto; los aliases son detalles de migracion.
