# Catalogo De Componentes

Este indice orienta la reutilizacion de UI en SIPEG. Las interfaces TypeScript y las stories
colocadas junto al codigo son la fuente de verdad para props, estados y comportamiento ejecutable.
`DESIGN.md` sigue siendo la fuente de verdad visual.

El inventario mecanico vive en [`INVENTORY.md`](./INVENTORY.md) y
[`generated-inventory.json`](./generated-inventory.json). Ambos se generan desde el indice del
build de Storybook; no se editan manualmente.

## Flujo De Consulta

1. Busque aqui el problema de interfaz que necesita resolver.
2. Revise la story enlazada y el tipo de props exportado.
3. Importe desde el barrel publico indicado.
4. Componga el modulo existente antes de extenderlo o crear otro.
5. Si cambia su interfaz o estados, actualice contrato, story, prueba y esta tabla.

## Consulta Automatizada

Con `pnpm run storybook` activo, el addon MCP publica el catalogo en
`http://127.0.0.1:6006/mcp`. OpenCode lo consume mediante `opencode.json`; reinicie OpenCode si esa
configuracion cambia. El manifiesto estatico queda en
`storybook-static/manifests/components.json`.

Regenerar y comprobar el inventario versionado:

```bash
pnpm run components:inventory
pnpm run components:inventory:check
```

## Validacion Ejecutable

`pnpm run test:storybook` construye Storybook, ejecuta las `play` functions y compara todas las
stories con sus baselines visuales mientras verifica accesibilidad con axe. Los baselines viven en
`.storybook/__image_snapshots__` y solo deben actualizarse despues de revisar un cambio visual
intencional:

```bash
pnpm run test:storybook:update
```

Durante la edicion no hace falta recorrer el catalogo completo. Se prueban solo las stories
afectadas, con `play`, axe y captura visual, reutilizando el build estatico cuando sigue vigente:

```bash
pnpm run storybook:list-stories
pnpm run storybook:test:affected -- shared-ui-surface--panel
```

El build se reconstruye automaticamente cuando un fuente es mas nuevo que `storybook-static`, de
modo que no se validan stories obsoletas. Un id desconocido falla indicando el mas cercano en lugar
de ejecutar un recorrido vacio.

## Checklist De Storybook

El widget _Guide_ de Storybook propone pasos de onboarding que este proyecto ya cubre con su propio
pipeline, por lo que no se adoptan sus addons de testing:

- Accesibilidad: `parameters.a11y.test = "error"` en `.storybook/preview.tsx` y `axe-playwright`
  sobre cada story en `.storybook/storybook.visual.ts`.
- Visuales: baselines de Playwright en `.storybook/__image_snapshots__` (`pnpm run storybook:test:visual`).
- Interacciones: `play` functions ejecutadas por `@storybook/test-runner` en `pnpm run test:storybook`.
- Cobertura: `pnpm run test:coverage`; automatizacion en CI: `pnpm run check` en `.github/workflows/ci.yml`.

No se instala `@storybook/addon-vitest` porque su peer exige `vitest ^3 || ^4` y el proyecto usa
Vitest 5, y no se instala el addon Visual Tests porque depende de un servicio externo rechazado en
[ADR-0004](../adr/adr-0004-component-catalog-storybook.md). Por eso el widget lateral y la pagina
_Guide_ se desactivan de forma explicita con `sidebarOnboardingChecklist` y
`menuOnboardingChecklist` en `.storybook/main.ts`; su estado interno vive en ajustes de usuario y en
la cache del proyecto, no en el repositorio.

## Colaboración y operaciones

| Componente                            | Import público                          | Uso e invariantes                                                                                                            | Story                                                                                                    |
| ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `PermissionList`                      | `@/features/collaboration`              | Lectura de procedencia y ventanas efectivas; no ofrece revocación.                                                           | `src/features/collaboration/ui/PermissionList.stories.tsx`                                               |
| `OwnPermissionsView`                  | `@/features/collaboration`              | Consulta privada por identidad y scope; requiere providers de adapters y Query.                                              | `src/features/collaboration/ui/OwnPermissionsView.stories.tsx`                                           |
| `CollaboratorsView`                   | `@/features/collaboration`              | Gestión local; `canManage` procede de permisos efectivos. ADMIN puede buscar personas; otros delegadores usan identificador. | `src/features/collaboration/ui/CollaboratorsView.stories.tsx`                                            |
| `OperationalScopesView`               | `@/features/collaboration`              | Descubrimiento sin catálogo administrativo ni peticiones por cada scope.                                                     | `src/features/collaboration/ui/OperationalScopesView.stories.tsx`                                        |
| `OperationalScopeView`                | `@/features/collaboration`              | Guard de tipo/id y capacidades; compone permisos y colaboradores sin cargar scopes ajenos.                                   | `src/features/collaboration/ui/OperationalScopeView.stories.tsx`                                         |
| `OperationalMenuLink`                 | `@/features/collaboration/navigation`   | Enlace diferido, visible solo con scopes efectivos; requiere sesión y Query.                                                 | `src/features/collaboration/ui/OperationalMenuLink.stories.tsx`                                          |
| `OperationsMenu` / `OperationsLayout` | `@/components/operationsShell` (layout) | Marco del área; contexto en URL con selector limitado a scopes descubiertos.                                                 | `src/components/layout/OperationsMenu.stories.tsx`, `src/components/layout/OperationsLayout.stories.tsx` |

## UI Compartida

| Modulo                   | Import publico | Usar cuando                                                                                           | Evitar cuando                                                                | Requisitos                                                 | Story                                                                                              |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Surface`                | `@/components` | Se necesita un panel con borde, elevacion, padding o seleccion consistentes.                          | Un primitivo Chakra ya expresa la estructura sin repetir tratamiento visual. | `Provider`                                                 | [`Surface.stories.tsx`](../../src/components/ui/Surface.stories.tsx)                               |
| `AsyncStateView`         | `@/components` | Una carga asincrona alterna entre loading, error y contenido listo.                                   | El estado es estatico o requiere una composicion de dominio mas especifica.  | `Provider`                                                 | [`AsyncStateView.stories.tsx`](../../src/components/ui/AsyncStateView.stories.tsx)                 |
| `FeedbackState`          | `@/components` | Se explica un estado vacio, bloqueado o fallido con una accion opcional.                              | Solo se necesita anunciar una linea corta de estado.                         | `Provider`                                                 | [`FeedbackState.stories.tsx`](../../src/components/ui/FeedbackState.stories.tsx)                   |
| `StatusPanel`            | `@/components` | Se anuncia un mensaje corto con rol `status` o `alert`.                                               | Se necesita titulo, descripcion y accion.                                    | `Provider`                                                 | [`StatusPanel.stories.tsx`](../../src/components/ui/StatusPanel.stories.tsx)                       |
| `SelectionRequiredState` | `@/components` | Una vista administrativa exige seleccionar programa o actividad.                                      | La ausencia no depende del contexto de trabajo.                              | `Provider`                                                 | [`SelectionRequiredState.stories.tsx`](../../src/components/ui/SelectionRequiredState.stories.tsx) |
| `MetricCard`             | `@/components` | Se muestra una metrica en jerarquia standard, operational o summary.                                  | El contenido no es una cifra resumida.                                       | `Provider`; `tone` solo afecta a `standard`                | [`MetricCard.stories.tsx`](../../src/components/ui/MetricCard.stories.tsx)                         |
| `ModuleShell`            | `@/components` | Una pagina necesita encabezado principal, descripcion, acciones y contenido.                          | Se introduce una seccion interna de una pagina.                              | `h1` de la vista; `headingRef` opcional para mover el foco | [`ModuleShell.stories.tsx`](../../src/components/ui/ModuleShell.stories.tsx)                       |
| `SectionHeader`          | `@/components` | Se introduce una seccion dentro de un modulo.                                                         | Se necesita el encabezado principal de la ruta.                              | Mantener jerarquia desde el `h1` de `ModuleShell`          | [`SectionHeader.stories.tsx`](../../src/components/ui/SectionHeader.stories.tsx)                   |
| `PaginationControls`     | `@/components` | Una coleccion paginada conoce pagina, tamaño y total; muestra el rango visible y se oculta sin items. | La coleccion usa scroll infinito o carga incremental.                        | Estado de pagina controlado por el caller                  | [`PaginationControls.stories.tsx`](../../src/components/ui/PaginationControls.stories.tsx)         |
| `Provider`               | `@/components` | Se compone la raiz de aplicacion, pruebas o herramientas de UI.                                       | Dentro de componentes de producto ya envueltos por la raiz.                  | Chakra system y `next-themes`                              | Configurado globalmente en Storybook                                                               |

## Layout Compartido

| Modulo        | Import publico | Uso                                                              | Requisitos                                                | Story                                                                            |
| ------------- | -------------- | ---------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `AppLayout`   | `@/components` | Marco de rutas publicas con menu, contenido y footer.            | Debe renderizarse dentro de React Router por su `Outlet`. | [`AppLayout.stories.tsx`](../../src/components/layout/AppLayout.stories.tsx)     |
| `AdminLayout` | `@/components` | Marco de rutas administrativas con selector de contexto.         | Router, adapters, sesion y working context.               | [`AdminLayout.stories.tsx`](../../src/components/layout/AdminLayout.stories.tsx) |
| `AppMenu`     | `@/components` | Navegacion principal cuando el layout completo no es apropiado.  | Router y store de sesion.                                 | [`AppMenu.stories.tsx`](../../src/components/layout/AppMenu.stories.tsx)         |
| `AdminMenu`   | `@/components` | Navegacion de todos los modulos `/admin` y selector de contexto. | Router, adapters, working context y sesion `ADMIN`.       | [`AdminMenu.stories.tsx`](../../src/components/layout/AdminMenu.stories.tsx)     |
| `AppFooter`   | `@/components` | Footer compartido de SIPEG.                                      | `Provider`.                                               | [`AppFooter.stories.tsx`](../../src/components/layout/AppFooter.stories.tsx)     |
| `SkipLink`    | `@/components` | Enlace inicial para saltar a `#main-content`.                    | La pagina debe exponer ese destino.                       | [`SkipLink.stories.tsx`](../../src/components/layout/SkipLink.stories.tsx)       |

Los layouts se validan mediante las pruebas de integracion de `App` y sus propias stories. `AppMenu`
cubre sus estados anonimo, administrativo y de usuario estandar; `AdminMenu` cubre la navegacion
completa del panel y los estados de contexto de trabajo.

## Autenticacion

Import publico: `@/features/auth`.

| Modulo               | Usar cuando                                                         | Evitar cuando                                        | Requisitos                                | Story                                                                                         |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `LoginForm`          | Se solicitan credenciales para una sesion API real.                 | La identidad ya esta autenticada o en restauracion.  | `Provider`; callback async.               | [`LoginForm.stories.tsx`](../../src/features/auth/ui/LoginForm.stories.tsx)                   |
| `ForgotPasswordForm` | Se solicita un enlace de recuperacion para una direccion de correo. | Se restablece la contrasena con una sesion activa.   | `Provider`; Router.                       | [`ForgotPasswordForm.stories.tsx`](../../src/features/auth/ui/ForgotPasswordForm.stories.tsx) |
| `ResetPasswordForm`  | Se crea una contrasena nueva desde un enlace de recuperacion.       | Se cambia la contrasena de la sesion actual.         | `Provider`; token como prop.              | [`ResetPasswordForm.stories.tsx`](../../src/features/auth/ui/ResetPasswordForm.stories.tsx)   |
| `ChangePasswordForm` | Se cambia la contrasena de la sesion autenticada vigente.           | Se restablece la contrasena desde un enlace publico. | `Provider`; callback async.               | [`ChangePasswordForm.stories.tsx`](../../src/features/auth/ui/ChangePasswordForm.stories.tsx) |
| `ProfileForm`        | Se consultan o actualizan los datos editables del perfil propio.    | Un administrador crea o edita usuarios.              | `Provider`; perfil, catalogos y callback. | [`ProfileForm.stories.tsx`](../../src/features/auth/ui/ProfileForm.stories.tsx)               |
| `PersonalAreaLayout` | Se compone el area personal con submenu de secciones.               | Un modulo del panel necesita el contexto de trabajo. | Router; sesion autenticada.               | [`PersonalAreaLayout.stories.tsx`](../../src/features/auth/ui/PersonalAreaLayout.stories.tsx) |

`ForgotPasswordForm` y `ResetPasswordForm` no contienen la confirmacion de exito: esa copy vive en
las paginas para que un mismo texto neutral se muestre siempre. `ResetPasswordForm` recibe el token
como prop y solo lo reenvia al adapter, de modo que nunca aparece en el DOM.

`ChangePasswordForm` es el unico formulario de contrasena que no recibe tokens: la sesion se resuelve
en `useChangePassword` leyendo el store al enviar, de modo que ningun token llega a las props ni al
DOM. `RegisterForm`, `ResetPasswordForm` y `ChangePasswordForm` comparten el rango de 12 a 20
caracteres, que coincide con el `minLength: 12` y `maxLength: 20` del contrato en las tres
operaciones de contrasena.

`ProfileForm` recibe el perfil ya validado, los catalogos publicos de unidades y carreras, y un
callback: compone el parche con `toProfileUpdateRequest` y no admite otras entradas. El correo, la
cedula y el rol se renderizan como texto de solo lectura, nunca como controles, porque el contrato no
permite editarlos. Cuando la unidad vigente esta inactiva o su carrera no aparece en el catalogo, la
asignacion se conserva como opcion para no perderla en silencio. La unidad "Otro" bloquea la carrera
en "Otros" y produce `unitId: null` sin `careerId`.

`PersonalAreaLayout` es el marco comun del area personal: posee el unico `h1` del area, el submenu de
cuatro secciones y el `Outlet` de la seccion activa. La visibilidad de la navegacion se resuelve con
`useMediaQuery` y no con una media query de CSS, para que el estado expandido sea un valor de estado
real que las pruebas puedan observar y sobre el que `Escape` pueda actuar. Elegir una seccion cierra el
desplegable y lleva el foco al encabezado del destino, porque de lo contrario quien navega con teclado
o lector de pantalla quedaria con el foco dentro de un menu que se cerro debajo. Por eso el layout no
guarda estado de React: una seccion que aun carga suspende ese render y React descarta la
actualizacion pendiente, lo que cerraria el desplegable bajo quien acaba de abrirlo. La intencion de
foco vive en un ref, que sobrevive a un render interrumpido, y el estado del desplegable pertenece a
`PersonalAreaNavigation`, que es un subarbol hermano del `Outlet` y no se suspende.

## Registro

Import publico: `@/features/registration`.

| Modulo         | Usar cuando                                                   | Evitar cuando                           | Requisitos                                      | Story                                                                                     |
| -------------- | ------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `RegisterForm` | Se crea una cuenta publica con unidad y carrera relacionadas. | Un administrador crea o edita usuarios. | `Provider`; catalogos publicos; callback async. | [`RegisterForm.stories.tsx`](../../src/features/registration/ui/RegisterForm.stories.tsx) |

## Aulas

Import publico: `@/features/classrooms`.

| Modulo                          | Import publico          | Usar cuando                                                                                            | Evitar cuando                                           | Requisitos                                           | Story                                                                                                                     |
| ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ClassroomsView`                | `@/features/classrooms` | Se lista el inventario de aulas con los filtros que el contrato admite.                                | Se edita un aula concreta.                              | Sesion `ADMIN`; adapters de aulas.                   | [`ClassroomsView.stories.tsx`](../../src/features/classrooms/ui/ClassroomsView.stories.tsx)                               |
| `ClassroomDetailView`           | `@/features/classrooms` | Se editan datos, amenidades y la disponibilidad semanal de un aula.                                    | Se consulta la agenda publica o el selector.            | `classroomId` de la ruta; adapters.                  | [`ClassroomDetailView.stories.tsx`](../../src/features/classrooms/ui/ClassroomDetailView.stories.tsx)                     |
| `ClassroomAvailabilitySelector` | `@/features/classrooms` | Un formulario de actividad ya conoce fecha, horario y requisitos y necesita elegir un aula disponible. | Se mantienen aulas o se calculan conflictos localmente. | `criteria`, selección controlada; adapters de aulas. | [`ClassroomAvailabilitySelector.stories.tsx`](../../src/features/classrooms/ui/ClassroomAvailabilitySelector.stories.tsx) |

El filtro de estado del listado arranca en "todas" porque el backend solo devuelve aulas activas
cuando se omite `isActive`: una administracion que no puede listar las inactivas no puede
reactivarlas, y el adapter recorre las dos listas en ese caso.

`ClassroomDetailView` recibe `classroomId` como prop y no lee el router. El estado del aula no tiene
comando propio: desactivar y reactivar son el `PATCH` de `isActive`, igual que en las unidades de la
Fase 2.2, porque el contrato no publica un borrado de aulas. El fallo se expone por area
(`classroomFailure`, `amenityFailure`, `availabilityFailure`) porque un mismo `409` significa un aula
reservada, una amenidad repetida o un solape, y nombrar el motivo equivocado seria mentir. El
`period` de una ventana es texto informativo del backend: se muestra cuando existe pero no actúa como
regla adicional de disponibilidad.

`ClassroomAvailabilitySelector` no duplica los campos del formulario de actividades: recibe sus
criterios controlados y consulta solo cuando se pulsa "Consultar aulas". El contrato admite una sola
amenidad; los resultados no se persisten porque dependen de reservas y ventanas vigentes. Si los
criterios cambian despues de consultar, los resultados quedan marcados como desactualizados y no se
puede elegir otra aula hasta reconsultar; limpiar la asignacion siempre funciona. Si una nueva
consulta deja fuera una seleccion existente, la conserva marcada como no disponible para que el
formulario no pierda informacion sin avisar. El aula asignada de la actividad en edicion se conserva
etiquetada «Asignada; se validara al guardar» aunque la consulta no la devuelva: la operacion no
puede excluir su propia reserva y el `PATCH` es quien valida al guardar.

## Programas

Import publico: `@/features/event-programs`.

| Modulo                   | Import publico              | Usar cuando                                                                                     | Evitar cuando                               | Requisitos                                        | Story                                                                                                           |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `EventProgramsView`      | `@/features/event-programs` | Se lista la agenda y se edita, publica, archiva o reactiva un programa desde el panel.          | Se administran colaboradores o actividades. | Sesion `ADMIN`; adapters de programas y unidades. | [`EventProgramsView.stories.tsx`](../../src/features/event-programs/ui/EventProgramsView.stories.tsx)           |
| `CreateEventProgramForm` | `@/features/event-programs` | Se captura un programa adicional en borrador con unidad, fechas y etiqueta.                     | Se edita un programa existente.             | `Provider`; unidades activas; callbacks.          | [`CreateEventProgramForm.stories.tsx`](../../src/features/event-programs/ui/CreateEventProgramForm.stories.tsx) |
| `EditEventProgramForm`   | `@/features/event-programs` | Se editan nombre, etiqueta, descripcion y fechas de un programa, sin su unidad ni su identidad. | Se crea un programa o se cambia su estado.  | `Provider`; registro del listado; callbacks.      | [`EditEventProgramForm.stories.tsx`](../../src/features/event-programs/ui/EditEventProgramForm.stories.tsx)     |

El listado es solo para `ADMIN`: el contrato honra los estados no publicos unicamente para ese rol y los
colaboradores conservan el descubrimiento operativo en `/operaciones`. Arranca en "Todos"
(`status=ALL`), porque omitir el parametro devuelve solo programas activos, y muestra la unidad
embebida en cada resultado sin consultar el catalogo de unidades: esa consulta solo puebla el filtro
y, si falla, el listado sigue visible con reintento propio. No existe filtro por fechas en OpenAPI;
las fechas se muestran y la carencia queda registrada como pendiente contractual.

`CreateEventProgramForm` valida antes del envio el rango real de fechas y que la unidad siga activa,
reconstruye el request con allowlist y conserva lo escrito ante un rechazo. El contrato no distingue
con codigos un rango invalido de una unidad inactiva: ambos comparten el `400` y la interfaz ofrece
una explicacion conjunta sin exponer el mensaje del backend. El programa creado nace como borrador y
puede quedar fuera de los filtros vigentes; el mensaje de exito lo advierte. El formulario recibe el
foco en «Nombre» al montarse y cada error queda asociado a su control (`aria-invalid` y
`aria-errormessage`), de modo que el recorrido completo funciona por teclado.

La edicion y el ciclo de vida viven en un panel dentro de `EventProgramsView`, no en una ruta de
detalle: `GET /api/v1/event-programs/{id}` solo devuelve programas activos, de modo que borradores y
archivados se gestionan con el registro ya validado del listado. Publicar es el unico parche de
estado que el contrato acepta (`DRAFT -> ACTIVE`); archivar y reactivar son acciones explicitas con
confirmacion y nunca se ofrece borrado fisico. La agenda permanente se muestra sin fechas ni acciones
de ciclo de vida: su unidad es el enlace para reactivarla. `EditEventProgramForm` omite la unidad y
la bandera de programa predeterminado, y sus rechazos conservan lo escrito con un mensaje localizado
que no distingue causas que el contrato no separa.

Cada tarjeta ofrece tambien «Colaboradores»: el panel compone `CollaboratorsView` con el scope del
programa seleccionado y aisla su estado por `key`. Un programa archivado se consulta en modo solo
lectura y sin comandos de modificacion; la recuperacion de un `409` relee colaboradores y listado a
la vez para reflejar un estado que cambio mientras el panel estaba abierto. «Usar como contexto»
escribe solo `{ kind: "eventProgram", id }` en el store compartido y la tarjeta marca la seleccion
vigente; la resolucion de actividades pertenece a `working-context`, con lo que la administracion de
programas conserva su independencia del catalogo de actividades (R12). Los colaboradores siguen
descubriendo su trabajo en `/operaciones`.

La vista abre un solo panel a la vez y deshabilita las acciones de tarjeta mientras una creacion o
mutacion esta pendiente, de modo que una resolucion tardia no cierra el panel nuevo. Tras un
`conflict` o un `notFound`, `EditEventProgramForm` y la confirmacion ofrecen «Actualizar listado»:
`onRefresh` e `isRefreshing` son opcionales y la lectura no repite la mutacion. El mensaje del `409`
de edicion nombra tanto el archivo concurrente como las fechas fuera del rango, porque el contrato no
los separa. Las stories de esta seccion montan su propia composicion mock y su cliente Query por
story, incluidas `ConfirmingByKeyboard`, `ConflictRecovery` y `LifecycleFlow`; una prueba de navegador
dentro de la puerta de Storybook cubre teclado real, reflujo a 320 px, objetivos tactiles y axe sobre
la confirmacion movil y su estado hover.

## Alertas

Import publico: `@/features/alerts`. El menu principal carga el indicador de forma diferida desde el
entrypoint enfocado `@/features/alerts/navigation`.

| Modulo                  | Usar cuando                                                          | Evitar cuando                                | Requisitos                                        | Story                                                                                                 |
| ----------------------- | -------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `AlertsInboxView`       | Una ruta personal necesita la bandeja privada con filtros y paginas. | Se muestra un resumen de conteo sin bandeja. | Sesion autenticada; adapters de alertas y scopes. | [`AlertsInboxView.stories.tsx`](../../src/features/alerts/ui/AlertsInboxView.stories.tsx)             |
| `UnreadAlertsIndicator` | La navegacion necesita el acceso a la bandeja con el conteo.         | Se consulta o filtra la bandeja.             | Sesion autenticada; adapters de alertas; Query.   | [`UnreadAlertsIndicator.stories.tsx`](../../src/features/alerts/ui/UnreadAlertsIndicator.stories.tsx) |

`AlertsInboxView` traduce los ocho tipos del contrato con `alertTypeLabels` y distingue «Sin leer»/«Leída» con texto, no solo color. Los filtros y la pagina son estado de la vista; `useAlertsInbox` compone el listado privado con el descubrimiento operativo y las acciones de lectura. Solo aparecen enlaces a contextos operativos autorizados (`/operaciones/programas/:id` y `/operaciones/actividades/:id`); una alerta recibida no prueba acceso, propuestas y certificados aun no tienen ruta de detalle y quedan informativos. Si el descubrimiento falla, las alertas se conservan visibles sin enlaces y con reintento.

`AlertsInboxView` marca alertas como leidas con actualizacion optimista: «Marcar como leída» por tarjeta sin leer y «Marcar todas como leídas» para toda la cuenta, no solo para la pagina o el filtro visibles. El contador del indicador baja al instante porque ambas consultas comparten las mismas claves y el rollback restaura el snapshot exacto si el backend rechaza; el `updatedCount` del mensaje de exito sale del servidor. Una sola accion puede estar pendiente por identidad, los callbacks tardios no tocan la cache de otra cuenta y el foco pasa a la lista o al estado vacio cuando la tarjeta marcada desaparece, de modo que no queda en el `body`.

El indicador enlaza a `/perfil/alertas`, quinta seccion del area personal, incluso mientras el conteo carga o falla; en esa ruta se marca con `aria-current`. El conteo sale de `total` de la primera pagina filtrada por `isRead=false`, nunca de los items visibles, y jamas se persiste. Un fallo de la consulta se anuncia como conteo no disponible (`—`) y no como cero, porque afirmar que no hay alertas exige una respuesta exitosa. La region usa `aria-live` discreto en lugar de `role="status"` para no duplicar el estado global del documento, y el texto completo viaja visualmente oculto junto a la forma corta `Alertas · N`.

## Catalogo De Actividades

Import publico: `@/features/activity-catalog`.

| Modulo                          | Usar cuando                                                                                                                            | Evitar cuando                                        | Requisitos                                                                                  | Story                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ActivityCard`                  | Se presenta el resumen de una actividad del catalogo administrativo y opcionalmente se selecciona como contexto.                       | Se necesita editar la actividad.                     | `ActivitySummary`, `EventProgram`, `OrganizationalUnit` y aula opcional; enlaza al detalle. | [`ActivityCard.stories.tsx`](../../src/features/activity-catalog/ui/ActivityCard.stories.tsx)                                   |
| `EventProgramCard`              | Se resumen cifras de un programa y opcionalmente se selecciona como contexto.                                                          | Se necesita un formulario de programa.               | `ProgramSummary`; el total de inscritos muestra «No disponible» sin dato contractual.       | [`EventProgramCard.stories.tsx`](../../src/features/activity-catalog/ui/EventProgramCard.stories.tsx)                           |
| `ActivityFilters`               | Se filtra el catalogo publico o administrativo.                                                                                        | Los filtros pertenecen a otro dominio.               | Estado controlado; search, programa y limpiar son opcionales.                               | [`ActivityFilters.stories.tsx`](../../src/features/activity-catalog/ui/ActivityFilters.stories.tsx)                             |
| `ActivityCatalogView`           | Una ruta necesita la vista administrativa conectada completa.                                                                          | Se necesita una pieza presentacional aislada.        | Adapters, hook de catalogo y working context.                                               | [`ActivityCatalogView.stories.tsx`](../../src/features/activity-catalog/ui/ActivityCatalogView.stories.tsx)                     |
| `PublicActivityCard`            | Se presenta una actividad de la agenda anonima con su estado localizado.                                                               | Se administra o edita la actividad.                  | `PublicActivityRow`; sin credenciales.                                                      | [`PublicActivityCard.stories.tsx`](../../src/features/activity-catalog/ui/PublicActivityCard.stories.tsx)                       |
| `PublicActivityFilters`         | Se filtra la agenda publica por periodo, busqueda, unidad, tipo de unidad, programa y tipo, y se limpia todo.                          | Los filtros pertenecen al catalogo administrativo.   | Estado controlado; `programOptions` derivadas; callbacks.                                   | [`PublicActivityFilters.stories.tsx`](../../src/features/activity-catalog/ui/PublicActivityFilters.stories.tsx)                 |
| `PublicActivityDetailView`      | Una ruta publica muestra el detalle de una actividad por su id, con cupos y aviso de cancelacion.                                      | Se administra o edita la actividad.                  | `activityId`; adapters publicos; router.                                                    | [`PublicActivityDetailView.stories.tsx`](../../src/features/activity-catalog/ui/PublicActivityDetailView.stories.tsx)           |
| `ProgramActivitiesView`         | Se administran las actividades de un programa: filtros, paginacion, alta y acceso al detalle.                                          | Se consulta la agenda publica o el catalogo general. | `programId` y `mode`; adapters; Query; sesion.                                              | [`ProgramActivitiesView.stories.tsx`](../../src/features/activity-catalog/ui/ProgramActivitiesView.stories.tsx)                 |
| `ActivityDetailView`            | Se consulta y edita una actividad concreta con su programa, aula, ponentes, equipo y contadores.                                       | Se lista un catalogo de actividades.                 | `activityId` y `mode`; adapters; Query; router.                                             | [`ActivityDetailView.stories.tsx`](../../src/features/activity-catalog/ui/ActivityDetailView.stories.tsx)                       |
| `ActivityLifecycleConfirmation` | Se confirma publicar, despublicar, cancelar o eliminar un borrador, con motivo opcional solo al cancelar y recuperación de conflictos. | Se edita la actividad o se lista un catálogo.        | `Provider`; props controladas; callbacks.                                                   | [`ActivityLifecycleConfirmation.stories.tsx`](../../src/features/activity-catalog/ui/ActivityLifecycleConfirmation.stories.tsx) |
| `ActivityForm`                  | Se captura o edita una actividad, incluidos ponentes, equipo, banner y aula disponible.                                                | La actividad ya tiene otra accion de ciclo de vida.  | `Provider`; adapters de aulas; `programName`; callbacks.                                    | [`ActivityForm.stories.tsx`](../../src/features/activity-catalog/ui/ActivityForm.stories.tsx)                                   |

`ActivityCard` y `EventProgramCard` consumen resumenes: el listado de actividades del contrato no
expone `enrolledCount`, `checkedInCount`, `equipment` ni `cancelReason`, asi que el total de
inscritos muestra «No disponible» mientras no exista un agregado contractual y `ActivityCard`
enlaza al detalle administrativo, que consulta `GET /api/v1/activities/{id}` solo al abrirse
(ADR-0016). `ActivityCatalogView` compone la vista conectada completa y tiene story propia con
`play`.

La agenda publica (`@/features/activity-catalog/public`) descarga las paginas de
`GET /api/v1/activities?when=all`, valida el estado efectivo de cada item y clasifica en el cliente:
Disponibles = programadas o en curso; Proximas = programadas; Pasadas = completadas. Todos los filtros
combinan con AND, la preferencia de unidad prioriza sin excluir y la paginacion vuelve a la primera
pagina al cambiar cualquier filtro. Las tarjetas no piden detalle; el detalle publico llega en 5.3.

La administracion (`ProgramActivitiesView` + `ActivityDetailView` + `ActivityForm`) vive en rutas por
programa y es compartida entre `/admin` y `/operaciones`: las capacidades salen del descubrimiento de
permisos (`activity:read`, `activity:create`, `activity:update`, `activity:cancel`) y el backend
conserva la autoridad final. El listado pagina en el servidor con `status=ALL` para identidades
autorizadas; el alta nace como borrador dentro del programa y la edicion envia solo los campos
modificados. Los ponentes solo viajan cuando la persona los edita, porque el detalle del contrato no
devuelve su correo ni su organizacion. Un `409` conserva todo lo escrito, explica aula, horario o
cambio de estado sin exponer el mensaje del backend y ofrece «Actualizar actividad» para releer sin
repetir la mutacion.

`ActivityDetailView` compone `ActivityLifecycleConfirmation`: publicar y despublicar envian solo el
`PATCH` de estado con `activity:update`, mientras que cancelar usa `POST .../cancel` con su permiso
propio `activity:cancel` y un motivo opcional de hasta 500 caracteres. La cancelacion exige un
programa activo, `COMPLETED` y `CANCELLED` no ofrecen transiciones, y una relectura que deje de
admitir la accion conserva el texto y deshabilita la confirmacion.

La eliminacion de borradores sigue la regla publicada: `DELETE /api/v1/activities/{id}` no envia
cuerpo, responde `204` sin contenido y exige el permiso efectivo `activity:delete` o ADMIN; solo se
aplica a una actividad `DRAFT` de un programa `ACTIVE`. La interfaz comprueba permiso y estados, pero
no certifica la retencion: el servidor responde `409` cuando existen registros de asistencia o
alertas que deben conservarse.

`ActivityLifecycleConfirmation` cubre tambien la eliminacion con la accion `delete`: la etiqueta es
«Eliminar borrador», no ofrece campo de motivo y confirma con un request vacio. La autoridad de
elegibilidad es el servidor: la interfaz solo comprueba el permiso efectivo, el estado `DRAFT` y el
programa `ACTIVE`, y el `409` de retencion conserva el borrador. El contrato no publica ninguna
decision ni resultado de notificacion, de modo que ni los formularios ni las confirmaciones ofrecen
un control para notificar, los cuerpos de escritura descartan `notifyAttendees` incluso con valor
`false` y los anuncios describen unicamente la operacion completada. El `message` libre del envelope
no se presenta como evidencia de envio; `NTF-002` y `NTF-004` siguen pendientes de contrato.

## Contexto De Trabajo

| Modulo                 | Import publico               | Uso                                                            | Requisitos                                  | Story                                                                                                        |
| ---------------------- | ---------------------------- | -------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `WorkingContextSelect` | `@/features/working-context` | Seleccionar un programa legible o una actividad para el panel. | Adapters, sesion `ADMIN` y working context. | [`WorkingContextSelect.stories.tsx`](../../src/features/working-context/ui/WorkingContextSelect.stories.tsx) |

El selector administrativo usa la modalidad completa del catalogo: ofrece todos los programas
legibles con su estado en español, incluidas agendas permanentes y programas archivados, y solo un
`ADMIN` puede habilitarla. Una relectura completa, concluida y sin error reconcilia la seleccion: si
el contexto desaparece se retira y se anuncia —sin bloquear el selector—, mientras que durante una
carga, un refresco o un fallo la seleccion se conserva y no se presenta como vigente. Un fallo del
catalogo muestra error y reintento, nunca la afirmacion de que no hay contextos. El contexto es
`{ kind, id }` en memoria: se limpia al cerrar sesion y jamas se persiste.

## Definicion De Terminado

Un nuevo modulo de UI reutilizable queda documentado cuando:

1. Tiene un tipo de props publico cuando forma parte de un barrel.
2. Explica intencion, invariantes, defaults y providers no evidentes.
3. Tiene una story colocada con datos realistas y estados significativos.
4. Sus interacciones relevantes usan `play` con aserciones semanticas.
5. Tiene una prueba Vitest colocada cuando contiene comportamiento fuera de la story.
6. Aparece en este indice con su import publico y criterios de uso.
7. Regenera `docs/components/INVENTORY.md` y `generated-inventory.json`.
8. Pasa `pnpm run storybook:build`, `pnpm run test:storybook` y `pnpm run components:inventory:check`.
