# Arquitectura De Informacion

Este documento clasifica los destinos navegables de SIPEG por audiencia y autoridad. Las rutas
describen la organizacion actual del frontend; el backend sigue siendo la autoridad final de acceso.

## Areas De Navegacion

### Publica

Disponible sin sesion:

| Ruta            | Proposito                                      |
| --------------- | ---------------------------------------------- |
| `/`             | Catalogo publico de actividades.               |
| `/login`        | Inicio de sesion.                              |
| `/registro`     | Registro publico de cuenta.                    |
| `/verify-email` | Verificacion de correo mediante enlace seguro. |

### Personal

Destinos del participante autenticado, previstos para autoservicio:

- `/mi-cuenta` para perfil y seguridad.
- `/mis-actividades` para inscripciones y codigos de asistencia.
- `/mis-certificados` para consulta y descarga privada.
- `/alertas` para la bandeja personal.

Estos destinos no se crean en Fase 0; cada uno depende de su contrato y fase funcional.

### Panel Administrativo Actual

En Fase 0 todas las rutas implementadas del panel exigen sesion y rol global `ADMIN`:

| Ruta                  | Modulo                                  |
| --------------------- | --------------------------------------- |
| `/admin`              | Resumen operativo.                      |
| `/admin/eventos`      | Catalogo administrativo y contexto.     |
| `/admin/aulas`        | Inventario parcial de aulas.            |
| `/admin/ponentes`     | Read model transitorio de propuestas.   |
| `/admin/usuarios`     | Read model transitorio de usuarios.     |
| `/admin/asistencia`   | Read model transitorio de asistencia.   |
| `/admin/certificados` | Read model transitorio de certificados. |
| `/admin/reportes`     | Read model transitorio de reportes.     |

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

Las rutas `/eventos`, `/aulas`, `/ponentes`, `/usuarios`, `/asistencia`, `/certificados` y
`/reportes` redirigen temporalmente a su equivalente bajo `/admin`. Se conservan para no romper
enlaces locales existentes y deben retirarse cuando la navegacion por capacidades de Fase 3 defina
los destinos canonicos de operaciones.

## Reglas De Navegacion

- Una ruta implementada debe aparecer en el menu apropiado o documentarse como flujo directo.
- La visibilidad de un enlace no concede permisos; cada solicitud conserva autorizacion backend.
- Las rutas publicas y personales no reutilizan datos administrativos ni sus caches.
- Los nombres visibles usan vocabulario de producto; los aliases son detalles de migracion.
