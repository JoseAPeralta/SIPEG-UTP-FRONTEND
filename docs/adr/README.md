# Architecture Decision Records

Este directorio registra las decisiones de arquitectura del frontend SIPEG. Cada ADR es
inmutable: una decisión se reemplaza creando un ADR nuevo que la sucede.

## Convencion

- Nombre: `adr-NNNN-<slug>.md`, con `NNNN` secuencial de 4 digitos.
- Formato: front matter (`title`, `status`, `date`, `authors`, `tags`, `supersedes`,
  `superseded_by`) y secciones Status, Context, Decision, Consequences, Alternatives Considered,
  Implementation Notes y References con vinetas codificadas (POS/NEG/ALT/IMP/REF).
- Estado: `Proposed`, `Accepted`, `Rejected`, `Superseded` o `Deprecated`.
- Al reemplazar un ADR, actualice `supersedes`/`superseded_by` en ambos documentos.

## Indice

| ADR                                                              | Titulo                                                         | Estado   | Fecha      |
| ---------------------------------------------------------------- | -------------------------------------------------------------- | -------- | ---------- |
| [ADR-0001](./adr-0001-adapters-mock-api.md)                      | Adapters between mock and API behind a single composition root | Accepted | 2026-09-25 |
| [ADR-0002](./adr-0002-openapi-live-targeted-cli.md)              | Live OpenAPI contract through a targeted CLI                   | Accepted | 2026-09-25 |
| [ADR-0003](./adr-0003-local-harness-isolation.md)                | Local harness isolation with workspace and runtime boundaries  | Accepted | 2026-09-25 |
| [ADR-0004](./adr-0004-component-catalog-storybook.md)            | Component catalog, mechanical inventory and visual baselines   | Accepted | 2026-09-25 |
| [ADR-0005](./adr-0005-fanout-catalogo-actividades.md)            | Activity catalog fan-out for detail fields                     | Accepted | 2026-09-25 |
| [ADR-0006](./adr-0006-api-first-data-source.md)                  | API-first data source in development                           | Accepted | 2026-09-25 |
| [ADR-0007](./adr-0007-capa-presentacion-espanol.md)              | Spanish presentation layer between API and UI                  | Accepted | 2026-09-25 |
| [ADR-0008](./adr-0008-tanstack-query-server-state.md)            | TanStack Query as the server-state layer                       | Accepted | 2026-09-25 |
| [ADR-0009](./adr-0009-auth-session-token-storage.md)             | Auth session and token storage                                 | Accepted | 2026-09-26 |
| [ADR-0010](./adr-0010-public-administrative-query-boundaries.md) | Separate public and administrative query boundaries            | Accepted | 2026-09-26 |
