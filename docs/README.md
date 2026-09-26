# Documentacion Del Proyecto

Indice de la documentacion versionada. `AGENTS.md` es el mapa operativo para agentes; este
documento es el punto de entrada al detalle.

## Fuentes Principales

- [`CONTEXT.md`](../CONTEXT.md) — mision, lenguaje de dominio y decisiones de trabajo.
- [`AGENTS.md`](../AGENTS.md) — reglas de ingenieria, comandos y mapa de documentacion.
- [`README.md`](../README.md) — guia de desarrollo y operacion.
- [`DESIGN.md`](../DESIGN.md) — identidad visual y tokens.

## Componentes

- [`components/README.md`](./components/README.md) — flujo de reutilizacion de UI.
- [`components/INVENTORY.md`](./components/INVENTORY.md) y
  [`components/generated-inventory.json`](./components/generated-inventory.json) — inventario mecanico
  generado; no se edita a mano.

## Producto

- [`product/features.md`](./product/features.md) — capacidades esperadas del producto.

## Seguridad

- [`security/`](./security) — auditorias y notas de seguridad.

## Arquitectura

- [`adr/README.md`](./adr/README.md) — indice y convencion de ADRs.
- [ADR-0001](./adr/adr-0001-adapters-mock-api.md) — adapters mock/API y composition root unico.
- [ADR-0002](./adr/adr-0002-openapi-live-targeted-cli.md) — contrato OpenAPI vivo con CLI puntual.
- [ADR-0003](./adr/adr-0003-local-harness-isolation.md) — aislamiento del harness local.
- [ADR-0004](./adr/adr-0004-component-catalog-storybook.md) — catalogo de componentes, inventario y
  baselines visuales.
- [ADR-0005](./adr/adr-0005-fanout-catalogo-actividades.md) — fan-out del catalogo para campos de
  detalle de actividades.
- [ADR-0006](./adr/adr-0006-api-first-data-source.md) — API real como origen de desarrollo y mocks
  reservados para pruebas.
- [ADR-0007](./adr/adr-0007-capa-presentacion-espanol.md) — capa de presentacion en espanol entre
  el API y la UI.
- [ADR-0008](./adr/adr-0008-tanstack-query-server-state.md) — TanStack Query como capa de estado de
  servidor (cache, claves y persistencia offline opcional).

## Planes

- [`superpowers/plans/`](./superpowers/plans) — planes de implementacion historicos y activos.

## Harness

- [`harness/README.md`](../harness/README.md) — flujo local `Features -> Spec -> Plan -> Implementation`.
- [`harness/observability.md`](./harness/observability.md) — metricas manuales y cadencia de revision.
- [`spec/README.md`](../spec/README.md) — fuentes de verdad y politica de aislamiento.
