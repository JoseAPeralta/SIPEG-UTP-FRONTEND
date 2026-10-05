# Collaboration And Authorization - Features

## Problem

Collaborators need scoped access to programs and activities, but inherited and direct permissions can
be misleading unless their origin, validity, and effective result are visible.

## Users

- Administrators delegating work.
- Program and activity organizers, editors, and viewers.

## Desired Outcome

Each user discovers and operates only within effective scopes, while grant managers understand where
access comes from and what can safely be changed.

## In Scope

- `COL-001` understandable collaboration roles and permissions.
- `COL-002` discovery of accessible programs and activities.
- `COL-003` adding, changing, listing, and removing collaborators.
- `COL-004` inherited, local, and combined permission provenance.
- `COL-005` direct permission overrides with validity periods.
- `COL-006` immediate refresh of authorized navigation and actions.

## Out Of Scope

- Defining the scope-discovery contract; the frontend consumes the published operation
  (`GET /api/v1/users/me/scopes`, ADR-0014).
- Replacing backend authorization with hidden controls or route guards.
- User account administration.

## Domain Rules

- Every effective authorization decision comes from the backend.
- Program collaboration is inherited by its activities by default when the contract confirms it.
- A locally managed grant must not offer a misleading way to revoke inherited access.
- Raw permission codes are translated to user-facing labels.

## User Stories

### Discover My Scope (`COL-001`, `COL-002`)

As a collaborator, I want to discover accessible work without knowing resource IDs in advance.

Acceptance criteria:

- Scope discovery does not issue one authorization request per public catalog item.
- Navigation and direct URLs reflect effective access while still handling backend denial.

### Manage Collaborators (`COL-003`, `COL-004`)

As a grant manager, I want to manage collaborators and see inherited users so that I do not create
conflicting or redundant access.

Acceptance criteria:

- Program and activity details distinguish local, inherited, and combined access.
- Inherited collaborators are shown when local activity collaboration is edited.
- Only contract-permitted role changes and removals are offered.

### Manage Direct Permissions (`COL-005`, `COL-006`)

As a grant manager, I want time-bounded direct permissions to update the experience promptly.

Acceptance criteria:

- Validity and effective state are displayed when supplied by the backend.
- Successful changes refresh permissions, menus, details, and working context.
- A rejected or expired grant never remains as an enabled client-side action.

## Quality Requirements

### Alcance contractual de 3.5–3.7 (2026-10-04)

- Los listados de colaboradores exigen ADMIN o `permission:grant`. Devuelven colaboradores locales
  con procedencia efectiva de sus permisos; no enumeran personas exclusivamente heredadas. El
  criterio "Inherited collaborators are shown" sigue pendiente de una operación que las exponga.
- Los GET de permisos propios y colaboradores omiten concesiones futuras y expiradas. Se muestran
  origen, modalidad de concesión cuando existe, ventana efectiva y estado al consultar, no un historial.
- POST y PATCH retornan concesiones locales sin `origin` ni `effective`; la UI relee el listado para
  mostrar herencia, en vez de tratar esas respuestas como detalles efectivos.
- Eliminar la última persona activa capaz de delegar responde 409; los rechazos por subconjunto de
  permisos se explican sin inferir una matriz por rol ni exponer mensajes internos.
- ADMIN puede buscar personas con el listado administrativo existente. Un delegador sin rol ADMIN
  debe conocer el identificador de la cuenta: no hay búsqueda de personas autorizada para él.
- La coherencia tras mutaciones está centralizada en una sola política de invalidación por identidad
  y scope: las consultas activas se reconsultan antes de completar la mutación, las inactivas quedan
  marcadas y ninguna clave de otra identidad o pública se toca. Cambios de programa alcanzan
  conservadoramente todas las fronteras de colaboración y permisos de la identidad por la herencia.
- Un `403` de mutación no se interpreta como revocación total: la UI relee autorización y
  descubrimiento, de modo que un permiso revocado apaga gestión, contexto y menú sin cerrar sesión, y
  un fallo de esa reconsulta nunca reactiva acciones ni conserva datos como autorización válida.
  3.10 cerro la cobertura horizontal: URL directa y navegacion en el cliente sobre el guard de
  scope exacto, rechazo `403` del backend sobre descubrimiento favorable y reconciliacion de las
  cinco mutaciones; 3.8 incorporo las mutaciones de overrides.

### Alcance contractual de 3.8 (2026-10-05)

- `POST /event-programs/{id}/permissions` y `POST /activities/{id}/permissions` crean o reemplazan una
  concesión local con ventana opcional (`validFrom`/`validUntil` ISO 8601 o `null`);
  `DELETE .../permissions/{permission}?userId=...` retira la concesión local. El frontend valida la
  respuesta local con el mapper y relee el listado efectivo, que distingue procedencia.
- Solo se ofrece revocar concesiones locales: un permiso exclusivamente heredado no muestra acción y
  el origen `BOTH` advierte que el acceso heredado del programa continúa. En actividad, el backend
  responde `409` si se intenta revocar un permiso heredado sin concesión local; la UI no produce ese
  caso. Retirar `permission:grant` al último delegador activo también responde `409`.
- El operador solo puede delegar permisos que posee y dentro de su propia vigencia. La UI limita las
  opciones con sus permisos efectivos y explica el `403` sin exponer el mensaje del backend.
- **Límite de vigencia:** los GET de colaboradores y permisos propios omiten concesiones futuras y
  vencidas, y no existe una operación de historial. Por eso el criterio "los expirados dejan de
  habilitar acciones sin desaparecer del historial mostrado" solo se cumple en su primera mitad: la
  comprobación temporal local (`hasEffectivePermission` y `useAuthorizationTime`) impide que una
  concesión vencida habilite acciones, pero una concesión vencida o futura no se muestra. Queda
  pendiente de una lectura de historial publicada por el backend; no se modela en el frontend.

- Authorization data is private, identity-scoped, and never persisted offline.
- Permission origin and unavailable actions are understandable without color alone.
- Horizontal access, direct URLs, invalidation, and conflict handling have automated tests.

## Dependencies

- User, event-program, and activity resources.
- Backend permission evaluation and scope discovery.
- Identity-scoped query keys and route navigation.

## Open Questions

- What operation returns all scopes accessible to the current user? (resolved in Fase 3.4, 2026-10-04:
  the dedicated `GET /api/v1/users/me/scopes` operation, published in OpenAPI and consumed by the
  frontend through `features/collaboration`; see ADR-0014.)
- Which roles, permission codes, provenance values, and validity fields are contractual? (resolved in
  Fase 3.3, 2026-10-04: roles `VIEWER`, `EDITOR`, `ORGANIZER`; the 21 canonical permission codes
  enumerated in `POST .../permissions`; `origin` `LOCAL|INHERITED|BOTH`; `source`
  `ROLE_DEFAULT|OVERRIDE`; `validFrom`/`validUntil` ISO 8601 or null. The per-role default permission
  matrix is not contractual and is not modeled in the frontend.)
- What safeguards prevent removal of the last user able to delegate access?
