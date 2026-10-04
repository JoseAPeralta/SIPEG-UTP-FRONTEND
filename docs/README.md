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

- [`product/features.md`](./product/features.md) — indice trazable de capacidades, IDs estables y
  especificacion primaria.
- [`product/information-architecture.md`](./product/information-architecture.md) — areas de
  navegacion, rutas canonicas y aliases heredados.
- [`../spec/README.md`](../spec/README.md) — indice de especificaciones por dominio y reglas de
  propiedad.
- [`superpowers/plans/plan-maestro-frontend.md`](./superpowers/plans/plan-maestro-frontend.md)
  — roadmap maestro y dependencias entre fases.

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
- [ADR-0009](./adr/adr-0009-auth-session-token-storage.md) — sesion de autenticacion y
  almacenamiento de tokens.
- [ADR-0010](./adr/adr-0010-public-administrative-query-boundaries.md) — fronteras separadas para
  consultas publicas y administrativas.
- [ADR-0011](./adr/adr-0011-domain-adapter-strangler-migration.md) — migracion incremental del
  agregado de operaciones hacia adapters por dominio.
- [ADR-0012](./adr/adr-0012-explicit-http-authentication-policy.md) — politica explicita de
  autenticacion HTTP y aislamiento de cache privada.
- [ADR-0013](./adr/adr-0013-httponly-refresh-cookie-cross-tab.md) — cookie de refresh HttpOnly y
  coordinacion de sesion entre pestañas.
- [ADR-0014](./adr/adr-0014-scope-discovery-contract.md) — operacion dedicada de descubrimiento de
  scopes del usuario (propuesta, pendiente de publicacion en OpenAPI).

## Planes

- [`superpowers/plans/`](./superpowers/plans) — planes de implementacion historicos y activos.

## Harness

- [`harness/README.md`](../harness/README.md) — flujo local `Features -> Spec -> Plan -> Implementation`.
- [`harness/observability.md`](./harness/observability.md) — metricas manuales y cadencia de revision.
- [`spec/README.md`](../spec/README.md) — fuentes de verdad, trazabilidad y politica de aislamiento.
