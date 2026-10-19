# Contexto Del Proyecto

## Producto

SIPEG es un producto independiente. Este repositorio implementa una instancia monoorganizacion configurada para la Universidad Tecnologica de Panama (UTP). No se implementa multitenancy. La aplicacion es el frontend de una plataforma de gestion de eventos academicos; el backend es un proyecto separado en `../SIPEG-UTP-BACKEND` y se consume mediante una capa de cliente/API.

## Alcance Del Frontend

- Mostrar vistas de programas de eventos, actividades, asistencia, certificados, aulas, ponentes, reportes y administracion de usuarios.
- Mantener datos de demostracion en archivos frontend mientras no exista integracion completa con el backend.
- Separar vistas de pagina, componentes reutilizables, datos mock, estado compartido y utilidades.
- No incluir controladores, modelos de base de datos, rutas de servidor, migraciones, colas ni mailers.

La arquitectura de informacion vigente se documenta en
[`docs/product/information-architecture.md`](docs/product/information-architecture.md). La Fase 0
mantiene los modulos implementados bajo `/admin` y conserva aliases heredados. La Fase 3.4 integro
el descubrimiento de scopes accesibles contra el contrato dedicado descrito en
[ADR-0014](docs/adr/adr-0014-scope-discovery-contract.md). Las fases 3.5–3.7 incorporan `/operaciones`,
rutas por scope, lectura de permisos propios y gestión local de colaboradores por capacidad efectiva,
sin N+1 de descubrimiento ni acceso al agregado operativo global.

## Alineacion Con El Backend

El vocabulario del frontend sigue el contrato OpenAPI versionado en `../SIPEG-UTP-BACKEND/openapi.json`.

- El recurso oficial es **actividad** (`activities`). No existe un recurso `/events`.
- Una actividad pertenece obligatoriamente a un programa de eventos.
- Un programa de eventos pertenece exactamente a una unidad organizativa.
- El backend es la autoridad de autorizacion; el frontend solo modela capacidades para navegacion y experiencia.

## Lenguaje De Dominio

### Usuario

Persona que usa la plataforma. Tiene un rol global (`ADMIN` o `USER`) y puede recibir permisos de colaboracion por programa de eventos o actividad.

### Unidad Organizativa

Catalogo unificado de unidades de la universidad. Se distingue por `type`: `FACULTY` (unidad academica) o `SUBDIRECTORATE` (unidad administrativa). Tiene `code`, `name`, `description`, `isActive` y un encargado opcional (`head`). Cada unidad tiene un programa de eventos predeterminado permanente.

### Carrera

Programa academico asociado a un usuario y, opcionalmente, a una unidad organizativa de tipo facultad.

### Programa De Eventos

Unidad organizadora que agrupa actividades. Pertenece exactamente a una unidad organizativa. Cada unidad tiene un programa predeterminado permanente; los programas adicionales tienen fechas, etiqueta y banner. Los programas se archivan y no se eliminan fisicamente.

### Actividad

Evento individual que pertenece obligatoriamente a un programa de eventos. Tiene nombre, tipo (`WORKSHOP`, `SEMINAR`, `TALK`, `CONFERENCE`, `PANEL`, `COURSE`, `COMPETITION`, `OTHER`), ponentes, aula, fecha, hora, equipamiento requerido, banner y estado (`DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`, `CANCELLED`).

### Permiso De Colaboracion

Capacidad asignada a un usuario para colaborar en un programa de eventos o en una actividad. Los permisos del programa se heredan por defecto en sus actividades. Los roles de colaboracion son `VIEWER`, `EDITOR` y `ORGANIZER`, y el catalogo canonico de 21 permisos vive en `features/collaboration/model/permissions.ts`. El contrato no publica la matriz de permisos predeterminados de cada rol, asi que el frontend no la infiere ni decide autorizacion: el backend sigue siendo la autoridad.

### Registro De Asistencia

Evidencia de presencia en una actividad. Cada inscripcion (`activity` x `user`) tiene un `code` unico de validacion; el `method` (`QR` o `MANUAL`) registra como se valido.

### Certificado

Documento generado a partir de la asistencia. Puede generarse automaticamente o desde la lista de asistencia.

### Aula

Espacio disponible para actividades. Tiene tipo (`LABORATORY` o `CLASSROOM`), ubicacion, capacidad maxima y amenidades.

### Ponente

Persona que propone o imparte una actividad. Las propuestas se asocian a un programa de eventos y capturan CV, duracion aproximada, tipo de charla, titulo, contenido y fecha de envio.

### Reporte

Vista o exportacion con metricas de programas, actividades, asistencia y certificados.

### Contexto De Trabajo

En el área operativa el scope vive en la URL `/operaciones/programas/:id` o
`/operaciones/actividades/:id`; el selector usa solo scopes descubiertos. No se copia el catálogo
administrativo ni se persisten permisos. Al vencer una ventana se reevalúan las capacidades; la
lectura privada se refresca además periódicamente y ante cambios de colaboración propios.

La procedencia `LOCAL`, `INHERITED` y `BOTH` viene del servidor y se traduce a texto. `source` es una
modalidad de concesión distinta del origen. Los GET omiten grants futuros/expirados y personas con
colaboración exclusivamente heredada: la UI no reconstruye ese historial ni ofrece revocación local
del acceso heredado. Los defaults por rol del mock se inyectan únicamente como escenarios explícitos
de prueba; no hay una matriz de autorización duplicada en producción.

Seleccion activa del panel administrativo: un programa de eventos o una actividad. Asistencia, certificados y reportes operan sobre el contexto seleccionado. La seleccion vive en memoria durante la sesion del navegador y se limpia al cerrar sesion.

## Arquitectura Frontend

### Capas

```txt
app (composicion, app/adapters/http y app/query)
  ↓
features (modelo, adapters, hooks, ui)
  ↓
components compartidos + types + utils
```

### Adapters

- `src/app/adapters/contracts.ts` define los puertos del frontend: `ActivityCatalogAdapter`, `EventProgramsAdapter`, `AuthAdapter`, `OrganizationalUnitsAdapter`, `CareersAdapter`, `ClassroomsAdapter`, `UsersAdapter` y `OperationsAdapter` (agregado legado congelado).
- `src/app/adapters/createBrowserAppAdapters.ts` es el composition root del navegador: usa la API por defecto (`VITE_DATA_SOURCE=api`) y deja `mock` como override explicito, pero entrega puertos estables que importan cada adapter concreto solo al invocar su primer metodo. `createAppAdapters.ts` conserva la composicion sincrona para pruebas. Ambos inyectan de forma privada el lector del access token donde corresponde.
- `src/app/adapters/http/apiClient.ts` concentra el cliente HTTP; cada request declara modo `none` o `bearer`, solo el cliente construye `Authorization` y ningun componente hardcodea URLs (ADR-0012). La cookie `HttpOnly` de sesion solo viaja en `login`, `refresh` y `logout`: una operacion anonima usa `credentials: omit` y jamas envia la cookie ni el token, aunque exista sesion (ADR-0015).
- `src/app/query` concentra el estado de servidor con TanStack Query: el cliente, las claves, la persistencia offline opcional y el provider. Los hooks de cada feature llaman `useQuery`/`useMutation` sobre los adapters inyectados y conservan su forma publica; `useActivityCatalog()` es una lectura administrativa con Bearer y clave por identidad, la agenda anonima vive en `usePublicActivities` con su propia clave, y `useOperations` es la puerta de entrada a operaciones.
- Unidades, carreras y aulas son consultas por recurso: cada uno tiene su mapper, sus adapters API/mock y su hook (`useOrganizationalUnits`, `useCareers`, `useClassrooms`), con claves separadas por frontera y sin credenciales, porque sus listados son operaciones publicas del contrato. `useAvailableClassrooms` conserva un snapshot de criterios enviado explicitamente, no se persiste y consulta `GET /classrooms/available` sin Bearer; el backend sigue siendo la autoridad para ventanas y reservas. `useActivityCatalog` y `useRegistrationCatalog` se conservan como read models compuestos para no duplicar reglas de seleccion en las vistas.
- `useUsers` es la lectura administrativa aplanada de `GET /api/v1/admin/users` (Bearer, rol `ADMIN`); `useUsersPage` expone una pagina ya filtrada por el backend y `useUserDetail` el detalle. Las claves se ligan al `userId`, nunca al token, no se persisten y las referencias de unidad y carrera vienen embebidas, de modo que el listado no consulta los catalogos para etiquetar filas. La pantalla pagina, busca y filtra en servidor, crea cuentas (siempre rol `USER`, que el backend verifica por correo) y edita rol, estado, unidad y carrera con copy localizado para duplicados, relaciones invalidas y las salvaguardas de autodesactivacion y ultimo ADMIN. `loadUsers` sigue disponible para el resumen transitorio de certificados.
- La agenda publica tiene su propio read model y puerto (`PublicActivityCatalogAdapter`): se resuelve con **una sola operacion** `GET /api/v1/activities` pagina a pagina, porque ese listado ya embebe aula, programa y unidad. No comparte tipo con `Activity` a proposito: el listado publico omite `equipment`, `enrolledCount`, `checkedInCount` y `cancelReason`, y modelar esa diferencia como dos tipos impide que la agenda dependa de un dato que el contrato no le da; cada item valida su `status` efectivo y solo acepta `SCHEDULED`, `ONGOING` y `COMPLETED`. El catalogo administrativo tampoco pide el detalle de cada actividad: lee las paginas de `GET /api/v1/event-programs/{id}/activities` y proyecta cada fila a `ActivitySummary` con una allowlist; el detalle (`GET /api/v1/activities/{id}`) se consulta solo al abrir una actividad y los totales agregados que el contrato no publica se muestran como «No disponible» (ADR-0016).
- Los codigos y nombres de las unidades viven en un registro del frontend (`features/organizational-units/model/unitRegistry.ts`), no se descargan. No cambian con frecuencia y `ActivityOrganizationalUnit` no trae `code`, que es justo lo que el tema y los badges necesitan; la union con el listado publico se hace por nombre normalizado (sin diacriticos ni dobles espacios), y una unidad desconocida degrada a color `default` sin romper la agenda. `ORGANIZATIONAL_UNIT_CODES` es una tupla const y las fichas son un `Record` sobre ella, de modo que agregar un codigo sin ficha rompe la compilacion. Los tipos de actividad son etiquetas de dominio (`activityTypeLabels`) y tampoco se descargan.
- La agenda publica descarga las paginas de `GET /api/v1/activities?when=all`, valida el estado efectivo de cada item y clasifica en cliente (Disponibles = programadas o en curso; Proximas = programadas; Pasadas = completadas). Los filtros de periodo, busqueda, unidad, tipo de unidad, programa y tipo combinan con AND; la preferencia de unidad prioriza sin excluir y cualquier cambio de filtro vuelve a la primera pagina. Las tarjetas usan el resumen embebido y nunca piden el detalle; el detalle publico llega en 5.3.
- El detalle publico vive en `/actividades/:activityId` y usa `getPublicActivity(id)` del puerto publico: una sola peticion sin credenciales, `404 -> null` y `DRAFT` rechazado como drift. Muestra programa, unidad, ponentes, aula, horario, capacidad/inscritos/disponibles y el estado; una cancelada conserva su aviso y motivo, y una no publicable presenta "Actividad no disponible". La consulta es identica con o sin sesion y no se persiste offline.
- La reconciliación de las mutaciones de actividades (5.10) vive en `features/activity-catalog/hooks/activityMutationReads.ts` y la comparten alta, edición, ciclo de vida y eliminación: cada éxito revalida las páginas del programa propietario —no las de otros programas ni la identidad completa—, el catálogo administrativo en sus dos modalidades (y con él el dashboard y las opciones del contexto de trabajo), la agenda y el detalle públicos, el descubrimiento de scopes y, salvo en la eliminación de un borrador, la disponibilidad de aulas. El detalle privado cancela su lectura en vuelo y se escribe con la respuesta autoritativa del comando en vez de reconsultarse; el listado independiente de programas no se toca porque no deriva datos de actividades, y una respuesta de una generación de sesión anterior no escribe caché privada aunque la revalidación pública continúe.
- La agenda publica no revalida al recuperar el foco de la ventana (`refetchOnWindowFocus: false`) y usa `PUBLIC_CATALOG_STALE_TIME_MS`, porque con la politica global cada vuelta a la pestana volveria a descargarla entera.
- El arranque de sesion no bloquea las rutas publicas: solo las que exigen identidad esperan a que `POST /auth/refresh` resuelva, para no expulsar a una sesion valida ni retrasar el primer pintado de la agenda. Mientras se restaura, `AppMenu` reserva el hueco en lugar de ofrecer el acceso.
- La sesion vive en Zustand: perfil y access token solo en memoria; el refresh token viaja en una cookie `HttpOnly` compartida por el navegador. Al abrir una pestana o recargar, `POST /auth/refresh` rota la cookie y se carga `users/me` antes de renderizar rutas protegidas. Web Locks serializa operaciones sobre la cookie y BroadcastChannel envia avisos sin credenciales. El cierre confirmado por el servidor limpia la identidad y caches en todas las pestanas; un fallo de revocacion permite reintentar (ADR-0013).
- Las rutas administrativas exigen sesion y rol `ADMIN`; la autorizacion efectiva sigue siendo del backend.
- La persistencia offline es opcional (`VITE_QUERY_PERSISTENCE=on`), guarda solo los catalogos publicos exitosos (actividades, unidades y aulas) en `localStorage` y se invalida con una version de esquema mas `VITE_APP_VERSION`; nunca persiste sesion, tokens, carreras ni claves privadas por usuario (ADR-0010, ADR-0012). Sus paquetes se importan solo al habilitarla. React Query Devtools tambien es opt-in (`VITE_QUERY_DEVTOOLS=on`) y solo existe en desarrollo.
- `main.tsx`, `App.tsx` y la landing usan entrypoints estrechos (`components/root`, `components/appShell`, `components/publicUi`, `app/adapters/browser`, `app/query/runtime`, `features/auth/session`, `features/activity-catalog/public`). Los layouts privados y sus features se importan al activar sus rutas; `src/architecture.test.ts` impide volver a usar barrels generales en el arranque.
- Los adapters concretos viven en cada feature (`features/*/adapters`).
- Programas tiene frontera propia en `features/event-programs` (4.1): mapper completo, adapters API/mock y `useEventPrograms`, con clave administrativa por identidad que nunca se persiste. Ambos composition roots inyectan el mismo puerto en el catálogo compuesto, que solo conserva la lectura de resúmenes de actividades. El módulo de programas no importa `activity-catalog` (R12); el endpoint exacto de listado le pertenece (R8), sin cambiar la propiedad de subrecursos de actividades o colaboradores. Las etiquetas se comparten mediante `features/event-programs/public`, un entrypoint puro; los formularios y el ciclo de vida quedaron integrados y cubiertos en 4.3–4.9.
- El listado administrativo de programas vive en `/admin/programas` (4.2): `useEventProgramsPage` pagina y filtra por búsqueda, unidad y estado con `loadEventProgramsPage`, clave por identidad, filtros y página. La pantalla es solo para `ADMIN` porque el contrato solo honra estados no públicos para ese rol; los colaboradores conservan el descubrimiento operativo en `/operaciones`. El filtro por fechas no existe en OpenAPI: las fechas se muestran y la carencia queda documentada. La unidad viaja embebida en cada resultado, de modo que el listado no consulta el catálogo de unidades para etiquetar filas; solo lo usa para poblar su filtro.
- La creación de programas (4.3) vive dentro de `/admin/programas` con `CreateEventProgramForm` y `useCreateEventProgram`: `POST /api/v1/event-programs` nace como borrador para una unidad activa, exige `program:create` y la interfaz solo se ofrece a `ADMIN`. La validación local comprueba fechas reales y que la unidad siga activa; el contrato no distingue con códigos un rango inválido de una unidad inactiva, así que el `400` comparte explicación. El adapter reconstruye el body con allowlist, el éxito invalida por prefijo todas las páginas del listado y el programa creado puede quedar fuera de los filtros vigentes, lo que el mensaje advierte.
- La edición y el ciclo de vida de programas (4.4–4.6) viven en un panel de `/admin/programas`, no en una ruta de detalle: el `GET` de detalle solo devuelve programas activos. `useEventProgramMutations` expone `update`, `publish` (`DRAFT -> ACTIVE`, único parche de estado aceptado), `archive` y `reactivate`; cada éxito refresca por prefijo el listado administrativo, el catálogo administrativo y la agenda pública, y la agenda permanente refresca además el detalle de su unidad. `eventProgramLifecycleActions` decide las acciones por programa: un archivado solo se reactiva, un borrador edita/publica/archiva y la agenda permanente no ofrece archivo ni reactivación. El archivo y la reactivación son confirmaciones explícitas; nunca se ofrece `DELETE`. El mock reproduce los `409` de archivo con una semilla determinista y valida que las fechas no dejen actividades fuera del rango, de modo que las pruebas no dependen de la fecha de ejecución.
- La cobertura de formularios y ciclo de vida (4.9) cierra el modulo: `EventProgramsView` abre un solo panel a la vez, deshabilita los controles que lo sustituirian mientras hay una mutacion pendiente y ofrece «Actualizar listado» tras un conflicto o un `404` sin repetir la mutacion. El mensaje del `409` de edicion nombra tanto el archivo concurrente como las fechas que dejan actividades fuera del rango. El alta y la edicion reciben el foco en el primer campo y sus errores quedan asociados al control (`aria-invalid` y `aria-errormessage`); el recorrido completo alta -> edicion -> publicacion -> archivo -> reactivacion esta probado contra el mock con estado compartido. Las stories de programas montan su propia composicion mock y su cliente Query; una prueba de navegador dentro de la puerta de Storybook cubre teclado real, reflujo a 320 px, objetivos tactiles y axe sobre las confirmaciones. El tema usa la escala 600 opaca en el hover de los botones solidos (`DESIGN.md`) porque la mezcla `solid/90` de Chakra bajaba el contraste AA del texto blanco.
- Solo los adapters (y sus pruebas) importan desde `src/data/mock`; paginas, componentes y hooks no conocen los mocks.
- Cuando el OpenAPI cambia, se actualizan dominio, mappers, `src/data/mock` y tests en el mismo cambio, y se valida con `pnpm run api:mocks-check` (backend vivo, no CI).
- El adapter HTTP consume los contratos OpenAPI documentados y valida la respuesta antes de exponerla; no inventa campos ni endpoints.
- Las metricas de alcance de reportes viven en `features/reports/model/scopeMetrics.ts` y las consumen asistencia, certificados, reportes y dashboard.
- Mientras el backend no publique contratos de asistencia, certificados, ponentes y reportes, el origen `api` mantiene esas operaciones no disponibles con un error explicito.
- `OperationsAdapter` es un agregado legado congelado: no admite consumidores nuevos y se extrae en
  orden propuestas, asistencia, certificados y reportes. Carreras y usuarios ya se extrajeron en las
  fases 2.1, 3.1 y 3.2. Cada puerto se crea solo al integrar su contrato; no se mezclan respuestas API con
  fallback mock (ADR-0011).

### Separacion De Presentacion

- Los hooks concentran carga, filtros, paginacion, seleccion y calculos.
- Las funciones puras del dominio viven en `features/*/model` y `src/utils`.
- Los componentes de UI reciben props y callbacks; las vistas conectadas pueden invocar un hook de su feature.
- Las paginas de nivel ruta componen una vista o un hook y no contienen reglas de negocio.
- La capa de presentacion traduce el vocabulario del contrato a espanol con mapas tipados en `features/<dominio>/model/*Labels.ts`; la UI no muestra codigos del API ni mensajes crudos del backend. Los textos libres del backend (nombres, descripciones, equipamiento) no se traducen.
- El modulo `features/collaboration` modela roles y permisos como tipos y etiquetas puras: `resolveCollaborationRoleLabel` y `resolvePermissionLabel` degradan un codigo desconocido a un texto localizado y nunca lo muestran crudo. La UI de colaboracion consume estas funciones; los codigos del contrato solo circulan por dentro.
- `ApiError` (`src/app/adapters/http/apiClient.ts`) entrega mensajes en espanol por codigo HTTP y no expone la ruta ni el mensaje del backend.

### Pruebas

- Todas las pruebas viven junto al archivo que prueban, sin carpetas `__tests__`.
- Se prueban funciones puras, mappers, adapters, hooks y comportamiento de UI.
- `src/test/factories.ts` provee factorias de datos; `src/test/render.tsx` inyecta adapters.

### Imports

- Se usan barrels explicitos (`src/components`, `features/*`) para imports publicos.
- Los archivos internos importan su vecino directo para evitar ciclos.
- Las paginas cargadas con `lazy()` mantienen imports directos.

### Edges Permitidos

- `src/app/adapters/**` (composition root) puede importar adapters concretos de cualquier feature en profundidad.
- `src/components/layout/AdminMenu` puede importar el barrel `@/features/working-context`; es un edge permitido, no una regla general para `components/layout`.
- `src/store/**` no importa `@/features/**`; los tipos compartidos viven en `src/types/domain.ts`.
- `src/components/ui/**` no importa `@/features/**`; solo los adapters y sus pruebas importan `src/data/mock`.
- `src/architecture.test.ts` verifica estas reglas: R1 limita mocks, R2 mantiene UI compartida pura,
  R3 exige barrels de features tambien desde paginas y componentes, R4 aisla stores, R5 limita el
  cliente HTTP a adapters, R6 limita `fetch` y endpoints `/api/v1`, R7 congela los consumidores de
  `OperationsAdapter` y R8 reserva cada endpoint con dueno (catalogos y usuarios) a los adapters de
  su feature.

## Decisiones De Trabajo

- Los datos de demostracion viven en `src/data/mock` y se agrupan por dominio.
- Las paginas de nivel ruta viven en `src/pages`.
- Los componentes reutilizables viven en `src/components` (con `ui/` y `layout/`).
- El estado global con Zustand se reserva para sesion, preferencia de unidad y contexto de trabajo.
- La preferencia de unidad inicia el filtro de unidad del catalogo administrativo, se actualiza al cambiar de unidad y vuelve a `"all"` al cerrar sesion.
- El catalogo administrativo usa resumenes y detalle bajo demanda desde 5.9 (ADR-0016): cargar, filtrar, paginar o seleccionar contexto no produce ninguna peticion de detalle. La decision se revisa si el backend publica contadores agregados o los incluye en el listado; ADR-0005 queda superseded.
- Las llamadas al backend se aislan en la capa de adapters y no se hardcodean dentro de componentes.
- Las mejoras de arquitectura priorizan locality, leverage y seams claros sin introducir abstracciones innecesarias.

## Decisiones De Arquitectura

- [ADR-0001: Adapters mock/API y composition root unico](./docs/adr/adr-0001-adapters-mock-api.md)
- [ADR-0002: Contrato OpenAPI vivo con CLI puntual](./docs/adr/adr-0002-openapi-live-targeted-cli.md)
- [ADR-0003: Aislamiento del harness local](./docs/adr/adr-0003-local-harness-isolation.md)
- [ADR-0004: Catalogo de componentes, inventario y baselines visuales](./docs/adr/adr-0004-component-catalog-storybook.md)
- [ADR-0005: Fan-out del catalogo para campos de detalle de actividades](./docs/adr/adr-0005-fanout-catalogo-actividades.md)
- [ADR-0006: API real como origen de desarrollo y mocks para pruebas](./docs/adr/adr-0006-api-first-data-source.md)
- [ADR-0007: Capa de presentacion en espanol entre el API y la UI](./docs/adr/adr-0007-capa-presentacion-espanol.md)
- [ADR-0008: TanStack Query como capa de estado de servidor](./docs/adr/adr-0008-tanstack-query-server-state.md)
- [ADR-0009: Sesion de autenticacion y almacenamiento de tokens](./docs/adr/adr-0009-auth-session-token-storage.md)
- [ADR-0010: Fronteras separadas para consultas publicas y administrativas](./docs/adr/adr-0010-public-administrative-query-boundaries.md)
- [ADR-0011: Migracion strangler del agregado de operaciones](./docs/adr/adr-0011-domain-adapter-strangler-migration.md)
- [ADR-0012: Politica explicita de autenticacion HTTP](./docs/adr/adr-0012-explicit-http-authentication-policy.md)
- [ADR-0013: Cookie refresh HttpOnly y coordinacion de sesion entre pestanas](./docs/adr/adr-0013-httponly-refresh-cookie-cross-tab.md)
- [ADR-0014: Operacion dedicada para descubrir scopes del usuario](./docs/adr/adr-0014-scope-discovery-contract.md)
- [ADR-0015: Politica explicita de credenciales para lecturas anonimas y de sesion](./docs/adr/adr-0015-explicit-credentials-policy.md)
- [ADR-0016: Resumenes de actividades desde listados y detalle bajo demanda](./docs/adr/adr-0016-resumenes-actividades-detalle-bajo-demanda.md)
