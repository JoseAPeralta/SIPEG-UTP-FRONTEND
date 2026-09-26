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

## UI Compartida

| Modulo                   | Import publico | Usar cuando                                                                                           | Evitar cuando                                                                | Requisitos                                        | Story                                                                                      |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Surface`                | `@/components` | Se necesita un panel con borde, elevacion, padding o seleccion consistentes.                          | Un primitivo Chakra ya expresa la estructura sin repetir tratamiento visual. | `Provider`                                        | [`Surface.stories.tsx`](../../src/components/ui/Surface.stories.tsx)                       |
| `AsyncStateView`         | `@/components` | Una carga asincrona alterna entre loading, error y contenido listo.                                   | El estado es estatico o requiere una composicion de dominio mas especifica.  | `Provider`                                        | [`AsyncStateView.stories.tsx`](../../src/components/ui/AsyncStateView.stories.tsx)         |
| `FeedbackState`          | `@/components` | Se explica un estado vacio, bloqueado o fallido con una accion opcional.                              | Solo se necesita anunciar una linea corta de estado.                         | `Provider`                                        | [`FeedbackState.stories.tsx`](../../src/components/ui/FeedbackState.stories.tsx)           |
| `StatusPanel`            | `@/components` | Se anuncia un mensaje corto con rol `status` o `alert`.                                               | Se necesita titulo, descripcion y accion.                                    | `Provider`                                        | [`StatusPanel.stories.tsx`](../../src/components/ui/StatusPanel.stories.tsx)               |
| `SelectionRequiredState` | `@/components` | Una vista administrativa exige seleccionar programa o actividad.                                      | La ausencia no depende del contexto de trabajo.                              | `Provider`                                        | Pendiente                                                                                  |
| `MetricCard`             | `@/components` | Se muestra una metrica en jerarquia standard, operational o summary.                                  | El contenido no es una cifra resumida.                                       | `Provider`; `tone` solo afecta a `standard`       | [`MetricCard.stories.tsx`](../../src/components/ui/MetricCard.stories.tsx)                 |
| `ModuleShell`            | `@/components` | Una pagina necesita encabezado principal, descripcion, acciones y contenido.                          | Se introduce una seccion interna de una pagina.                              | Debe ser el encabezado `h1` de la vista           | [`ModuleShell.stories.tsx`](../../src/components/ui/ModuleShell.stories.tsx)               |
| `SectionHeader`          | `@/components` | Se introduce una seccion dentro de un modulo.                                                         | Se necesita el encabezado principal de la ruta.                              | Mantener jerarquia desde el `h1` de `ModuleShell` | [`SectionHeader.stories.tsx`](../../src/components/ui/SectionHeader.stories.tsx)           |
| `PaginationControls`     | `@/components` | Una coleccion paginada conoce pagina, tamaño y total; muestra el rango visible y se oculta sin items. | La coleccion usa scroll infinito o carga incremental.                        | Estado de pagina controlado por el caller         | [`PaginationControls.stories.tsx`](../../src/components/ui/PaginationControls.stories.tsx) |
| `Provider`               | `@/components` | Se compone la raiz de aplicacion, pruebas o herramientas de UI.                                       | Dentro de componentes de producto ya envueltos por la raiz.                  | Chakra system y `next-themes`                     | Configurado globalmente en Storybook                                                       |

## Layout Compartido

| Modulo        | Import publico | Uso                                                             | Requisitos                                                |
| ------------- | -------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `AppLayout`   | `@/components` | Marco de rutas publicas con menu, contenido y footer.           | Debe renderizarse dentro de React Router por su `Outlet`. |
| `AdminLayout` | `@/components` | Marco de rutas administrativas con selector de contexto.        | Router, adapters, sesion y working context.               |
| `AppMenu`     | `@/components` | Navegacion principal cuando el layout completo no es apropiado. | Router y store de sesion.                                 |
| `AdminMenu`   | `@/components` | Navegacion del panel y selector de contexto.                    | Router, adapters y working context.                       |
| `AppFooter`   | `@/components` | Footer compartido de SIPEG.                                     | `Provider`.                                               |
| `SkipLink`    | `@/components` | Enlace inicial para saltar a `#main-content`.                   | La pagina debe exponer ese destino.                       |

Los layouts se validan actualmente mediante las pruebas de integracion de `App`. Sus stories se
incorporaran cuando existan fixtures estables para sesion y rutas completas.

## Catalogo De Actividades

Import publico: `@/features/activity-catalog`.

| Modulo                | Usar cuando                                                                     | Evitar cuando                                 | Requisitos                                                        | Story                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `ActivityCard`        | Se presenta una actividad publica, con inscritos o seleccionable como contexto. | Se necesita editar la actividad.              | `Activity`, `EventProgram`, `OrganizationalUnit` y aula opcional. | [`ActivityCard.stories.tsx`](../../src/features/activity-catalog/ui/ActivityCard.stories.tsx)         |
| `EventProgramCard`    | Se resumen cifras de un programa y opcionalmente se selecciona como contexto.   | Se necesita un formulario de programa.        | `ProgramSummary`.                                                 | [`EventProgramCard.stories.tsx`](../../src/features/activity-catalog/ui/EventProgramCard.stories.tsx) |
| `ActivityFilters`     | Se filtra el catalogo publico o administrativo.                                 | Los filtros pertenecen a otro dominio.        | Estado controlado; search, programa y limpiar son opcionales.     | [`ActivityFilters.stories.tsx`](../../src/features/activity-catalog/ui/ActivityFilters.stories.tsx)   |
| `ActivityCatalogView` | Una ruta necesita la vista administrativa conectada completa.                   | Se necesita una pieza presentacional aislada. | Adapters, hook de catalogo y working context.                     | Cubierta por sus modulos presentacionales                                                             |

## Contexto De Trabajo

| Modulo                 | Import publico               | Uso                                                    | Requisitos                           | Story     |
| ---------------------- | ---------------------------- | ------------------------------------------------------ | ------------------------------------ | --------- |
| `WorkingContextSelect` | `@/features/working-context` | Seleccionar programa o actividad activa para el panel. | Adapters y store de working context. | Pendiente |

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
