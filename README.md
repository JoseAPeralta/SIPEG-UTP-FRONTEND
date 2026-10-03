# SIPEG Frontend

SIPEG es un producto independiente. Este repositorio implementa una instancia monoorganizacion configurada para la Universidad Tecnologica de Panama (UTP). No se implementa multitenancy. La aplicacion busca centralizar la administracion de eventos grandes, actividades individuales, asistencia, certificados, aulas, ponentes, usuarios, reportes y estadisticas operativas.

Este repositorio contiene solo la interfaz web. El backend vive en el repositorio hermano `../SIPEG-UTP-BACKEND` y el frontend debe consumirlo mediante una capa clara de cliente/API. Algunas pantallas todavia trabajan con datos de demostracion ubicados en `src/data/mock`.

Actualmente el proyecto incluye la base tecnica, navegacion principal, vistas iniciales por modulo, datos mock, configuracion de calidad, PWA e infraestructura de build. Las funcionalidades de negocio todavia no estan finalizadas.

## Estado De Funcionalidades

Leyenda: `X` pendiente, `~` parcial, `✓` finalizada.

| Estado | Funcionalidad              | Descripcion                                                                                                 |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| X      | Gestion de usuarios        | Crear usuarios, seleccionar unidad organizativa y carrera, modificar datos y asignar permisos.              |
| X      | Notificaciones por email   | Enviar avisos a usuarios o asistentes registrados cuando se creen, modifiquen o cancelen actividades.       |
| X      | Programas de eventos       | Crear programas con nombre, fechas, etiqueta personalizada, banner, colaboradores y permisos.               |
| X      | Actividades                | Crear actividades con nombre, tipo, ponentes, aula, fecha, hora, equipamiento requerido y banner.           |
| X      | Herencia de permisos       | Heredar colaboradores y permisos desde programas de eventos hacia sus actividades por defecto.              |
| ~      | Catalogo de actividades    | Lectura integrada disponible; faltan limites publicos definitivos, detalle y reduccion del fan-out.         |
| ✓      | Autenticacion y sesion     | Iniciar sesion con la API real, restaurar la sesion, cerrar sesion y proteger rutas administrativas.        |
| ~      | Filtros por unidad         | Filtra por unidad, tipo de actividad y programa; faltan tipo de unidad y prioridad por unidad seleccionada. |
| X      | Modificacion de eventos    | Modificar programas y actividades, y preguntar si se debe notificar a asistentes registrados.               |
| X      | Archivado de programas     | Archivar programas de eventos en lugar de eliminarlos fisicamente.                                          |
| X      | Cancelacion de actividades | Cancelar actividades segun la regla de retencion aplicable y notificar a los inscritos.                     |
| X      | Registro de asistencia     | Registrar asistencia para actividades mediante QR o codigos manuales.                                       |
| X      | Certificados               | Generar certificados automaticamente o desde la lista de asistencia.                                        |
| ~      | Inventario de aulas        | Consulta aulas y laboratorios; faltan administracion y disponibilidad semanal reutilizable.                 |
| X      | Registro de ponentes       | Capturar propuestas con nombre, email, CV, duracion, tipo de charla, titulo, contenido y programa asociado. |
| X      | Reportes y estadisticas    | Mostrar metricas de asistencia, certificados, ocupacion de aulas y actividades activas o pasadas.           |
| X      | Exportaciones              | Preparar exportacion de reportes a Excel y PDF.                                                             |
| ✓      | Adaptadores de datos       | Separar mocks del API real mediante puertos y adapters con `VITE_DATA_SOURCE`.                              |

## Stack

- React 19
- TypeScript 6
- Vite
- React Router v8
- Chakra UI v3
- Zustand
- Vitest
- Testing Library
- Storybook con Autodocs, pruebas de interaccion y accesibilidad
- ESLint flat config
- Prettier
- PWA con manifest, service worker, pagina offline e iconos instalables
- Docker Compose con ambientes separados de desarrollo y produccion
- Nginx estable no privilegiado para servir el build de produccion

## Requisitos

- Node.js 24.15 o superior dentro de la rama 24 LTS (`.node-version` fija 24.21.0)
- pnpm 12.5.1 mediante Corepack
- Docker Engine con Docker Compose para los ambientes contenedorizados

## Instalacion

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Ejecucion Local

```bash
pnpm run dev
```

La aplicacion queda disponible en:

```txt
http://localhost:5173
```

## Scripts Disponibles

| Comando                            | Uso                                                           |
| ---------------------------------- | ------------------------------------------------------------- |
| `pnpm run api:contract`            | Consulta operaciones puntuales del contrato OpenAPI.          |
| `pnpm run audit`                   | Audita dependencias y falla ante vulnerabilidades altas.      |
| `pnpm run dev`                     | Inicia el servidor local de desarrollo.                       |
| `pnpm run build`                   | Ejecuta typecheck y genera el build de produccion en `dist`.  |
| `pnpm run preview`                 | Sirve localmente el build de produccion.                      |
| `pnpm run start`                   | Alias para servir el build con `vite preview --host 0.0.0.0`. |
| `pnpm run storybook`               | Abre el catalogo interactivo de componentes.                  |
| `pnpm run storybook:build`         | Valida y genera el catalogo estatico en `storybook-static`.   |
| `pnpm run storybook:list-stories`  | Lista los ids de las stories del catalogo estatico.           |
| `pnpm run storybook:test:affected` | Ejecuta `play`, axe y visual solo de los ids indicados.       |
| `pnpm run test:storybook`          | Ejecuta stories, interacciones y auditorias axe en Chromium.  |
| `pnpm run lint`                    | Ejecuta ESLint con cero warnings permitidos.                  |
| `pnpm run lint:fix`                | Ejecuta ESLint aplicando correcciones automaticas.            |
| `pnpm run format`                  | Formatea archivos con Prettier.                               |
| `pnpm run format:check`            | Verifica formato sin modificar archivos.                      |
| `pnpm run typecheck`               | Ejecuta TypeScript sin emitir archivos.                       |
| `pnpm test`                        | Ejecuta pruebas con Vitest.                                   |
| `pnpm run test:watch`              | Ejecuta Vitest en modo watch.                                 |
| `pnpm run test:ui`                 | Abre la interfaz de Vitest.                                   |
| `pnpm run test:coverage`           | Genera reporte de cobertura.                                  |
| `pnpm run pwa:icons`               | Regenera los iconos basicos de la PWA.                        |
| `pnpm run verify:quick`            | Ejecuta formato, lint, typecheck y tests (loop interno).      |
| `pnpm run check`                   | Ejecuta formato, lint, tests y builds de app y Storybook.     |

## Verificacion Recomendada

Para el loop interno del agente (sin build ni Storybook) usa:

```bash
pnpm run verify:quick
```

Antes de integrar cambios, ejecuta la cadena completa con builds de app y Storybook, auditorias de
stories y `components:inventory:check`:

```bash
pnpm run check
```

Cuando cambies scripts del harness o su aislamiento, añade `pnpm run test:harness`.

## Estructura Del Proyecto

```txt
src/
├── app/adapters/     # Puertos, contexto, http/ y composition root de adapters
├── app/query/        # TanStack Query: cliente, claves y persistencia offline opcional
├── components/       # Componentes compartidos (ui/ y layout/)
├── data/mock/        # Datos de demostracion agrupados por dominio
├── features/         # Modulos por dominio (model, adapters, hooks, ui)
├── hooks/            # Hooks transversales (si no pertenecen a una feature)
├── pages/            # Vistas de nivel ruta
├── pwa/              # Registro y fuente del service worker
├── store/            # Estado compartido con Zustand
├── styles/           # Estilos globales
├── test/             # Factories y render con providers
├── theme/            # Sistema Chakra UI v3
├── types/            # Tipos de dominio frontend
├── utils/            # Utilidades puras
├── App.tsx           # Router principal
├── main.tsx          # Punto de entrada
└── setupTests.ts     # Setup global de Vitest
```

Cada prueba vive junto al archivo que prueba (por ejemplo `catalogSelectors.ts` y
`catalogSelectors.test.ts`), sin carpetas `__tests__`.

## Catalogo De Componentes

`docs/components/README.md` explica las decisiones de reutilizacion y
`docs/components/INVENTORY.md` enumera automaticamente los componentes, stories y variantes
publicadas. Antes de crear UI nueva, consulte esos indices, el barrel publico correspondiente y
los archivos `*.stories.tsx` colocados junto al componente.

Para explorar el catalogo visual:

```bash
pnpm run storybook
```

Con Storybook activo en `http://127.0.0.1:6006`, OpenCode puede consultar el catalogo mediante el
servidor MCP configurado en `opencode.json`:

```txt
http://127.0.0.1:6006/mcp
```

Reinicie OpenCode despues de cambiar su configuracion MCP. El build tambien emite
`storybook-static/manifests/components.json` para consumidores automaticos. Para regenerar el
inventario versionado despues de cambiar stories:

```bash
pnpm run components:inventory
pnpm run components:inventory:check
```

Antes de ejecutar las pruebas de Storybook por primera vez, instale Chromium y sus dependencias
del sistema en el entorno de desarrollo o CI:

```bash
pnpm exec playwright install --with-deps chromium
pnpm run test:storybook
```

`test:storybook` valida las `play` functions, accesibilidad con axe y los baselines visuales
versionados en `.storybook/__image_snapshots__`. Cuando un cambio visual sea intencional, revise
el resultado y actualice los baselines explicitamente:

```bash
pnpm run test:storybook:update
```

Durante la edicion basta con probar las stories afectadas, que reduces el recorrido de varios
minutos a segundos. El comando reconstruye el catalogo solo si un fuente es mas nuevo, lo sirve en
`127.0.0.1:6007` y ejecuta `play`, axe y la captura visual de los ids indicados:

```bash
pnpm run storybook:list-stories
pnpm run storybook:test:affected -- shared-ui-surface--panel features-auth-loginform--default
```

El puerto `6006` queda reservado para el Storybook interactivo y el catalogo MCP; las pruebas
automaticas nunca deben apuntar a el.

## Origen De Datos

`createAppAdapters` es el unico composition root. Por defecto usa la API real; los mocks solo se
usan en tests, Storybook y trabajo offline:

```bash
VITE_DATA_SOURCE=api    # valor por defecto: catalogo desde el contrato OpenAPI
VITE_DATA_SOURCE=mock   # override explicito para offline o demos
VITE_API_BASE_URL=https://api.utp.ac.pa   # origin del API; obligatorio en produccion
```

En desarrollo la API se resuelve contra `http://localhost:3000`, asi que `pnpm run dev`
requiere el backend levantado. La URL debe ser el origin del API, sin sufijo `/api`, porque los
endpoints ya incluyen el prefijo `/api/v1`. Con `api`, unidades organizativas, carreras, aulas,
programas y actividades se cargan desde el backend: cada recurso tiene su propio adapter y su
propia clave de cache, y los tres catalogos se piden como operaciones publicas sin `Bearer`.
La agenda publica de `/` se resuelve ademas con **una sola peticion** a `GET /api/v1/activities`,
porque ese listado ya trae aula, programa y unidad embebidos; el catalogo administrativo conserva
su lectura por recurso porque si necesita el detalle de cada actividad. Los codigos y nombres de
las unidades, y las etiquetas de los tipos de actividad, estan declarados en el frontend y no se
descargan.
Asistencia, certificados, ponentes y reportes permanecen no disponibles con un error explicito hasta
que el backend publique sus contratos; el dashboard conserva las metricas del catalogo y avisa de
las que dependen de esas operaciones.
Cuando el OpenAPI cambie, actualiza dominio, mappers, `src/data/mock` y sus tests en el mismo
cambio y valida con `pnpm run api:mocks-check` (requiere backend vivo). Los componentes de UI
nunca importan `src/data/mock`: solo los adapters de cada feature y sus tests lo hacen.

## Autenticacion Y Sesion

El flujo de autenticacion consume el contrato OpenAPI real (`auth/login`, `auth/refresh`,
`auth/logout` y `users/me`) y sigue las decisiones de
[ADR-0013](docs/adr/adr-0013-httponly-refresh-cookie-cross-tab.md):

- El perfil autenticado y el access token viven solo en memoria (Zustand); nunca se persisten.
- El refresh token viaja exclusivamente en una cookie `HttpOnly` del backend, compartida entre
  pestanas del mismo perfil de navegador. No se guardan credenciales en Web Storage.
- Al abrir otra pestana o recargar, `POST /api/v1/auth/refresh` envia la cookie mediante
  `credentials: "include"` y luego consulta `users/me` antes de renderizar rutas protegidas.
- Web Locks serializa login, refresh, logout y cambio de contrasena entre pestanas del mismo
  origen frontend. Sin esa API, un 401 de refresh tiene un unico reintento de compatibilidad;
  ese fallback no garantiza exclusion mutua.
- `BroadcastChannel` envia solo avisos de sesion, nunca tokens. Al cambiar de identidad o cerrar
  sesion se limpian los datos privados. Los errores transitorios de renovacion se reintentan.
- El access token se adjunta como `Authorization: Bearer` a las peticiones del API mientras exista
  sesion; el composition root lo lee del store, por lo que los adapters no conocen la sesion.
- `POST /api/v1/auth/logout` revoca el refresh token. Tras confirmarlo, todas las pestanas limpian
  sesion, contexto de trabajo, preferencia de unidad y cache. Si falla, se muestra un error y una
  opcion de reintento: no se presenta como confirmado un cierre que el servidor no pudo efectuar.
- Las rutas administrativas exigen sesion y rol `ADMIN`; el backend conserva la autoridad final.

Con `VITE_DATA_SOURCE=mock`, el adapter de autenticacion acepta la cuenta de demostracion
`mariana.rodriguez@example.edu` con la contrasena `sipeg-demo`. Con la API real use las credenciales
de su cuenta institucional.

En desarrollo use `http://localhost:5173` y `http://localhost:3000` consistentemente,
sin mezclar `localhost` con `127.0.0.1`. La API debe permitir el origen exacto del frontend
y usar `AUTH_REFRESH_COOKIE_SAME_SITE=lax` con `NODE_ENV=development`. En produccion se
requiere HTTPS y cookie `Secure`; `SameSite` depende de la topologia de despliegue.

Ejecute `pnpm run test:auth:browser` para comprobar cookies y coordinacion multipestana en
Chromium real con una API simulada. El alcance se detalla en [e2e/README.md](e2e/README.md).

## Aliases De Importacion

```txt
@           -> src/
@components -> src/components/
@pages      -> src/pages/
@store      -> src/store/
@hooks      -> src/hooks/
@utils      -> src/utils/
@theme      -> src/theme/
```

## PWA

La aplicacion esta preparada como PWA basica. Incluye:

- `public/manifest.webmanifest`
- `src/pwa/serviceWorker.js` (el build lo emite como `/sw.js`)
- `public/offline.html`
- Iconos instalables en `public/icons`
- Registro del service worker desde `src/pwa/registerServiceWorker.ts`

Para regenerar los iconos basicos:

```bash
pnpm run pwa:icons
```

Para probar la PWA, genera el build y sirvelo localmente:

```bash
pnpm run build
pnpm run preview
```

## Docker

El Dockerfile multi-stage contiene objetivos independientes para desarrollo y produccion. Las imagenes base estan fijadas por version y digest.

### Desarrollo

Iniciar Vite con hot reload, dependencias aisladas y el puerto limitado a localhost:

```bash
docker compose -f compose.dev.yaml up --build
```

La aplicacion queda disponible en `http://localhost:5173`. La API de desarrollo usa `http://localhost:3000` por defecto (solo origin, sin `/api`). Puede cambiarse antes de iniciar:

```bash
VITE_API_BASE_URL=http://localhost:4000 \
  docker compose -f compose.dev.yaml up --build
```

### Produccion

`VITE_API_BASE_URL` es obligatoria, debe ser absoluta y se incorpora al bundle durante el build. No debe contener secretos porque cualquier variable `VITE_*` es publica en el navegador.

En produccion el origen de este valor no es libre: la API decide si la sesion usa cookie `SameSite=lax` o `SameSite=none` segun si el frontend y la API comparten dominio registrable. Si se despliegan en sitios distintos hace falta HTTPS en ambos extremos y la sesion depende de que el navegador acepte cookies de terceros. La eleccion de topologia esta abierta en `docs/despliegue.md` del backend.

```bash
VITE_API_BASE_URL=https://api.example.test \
  docker compose -f compose.prod.yaml up --build -d
```

La aplicacion queda disponible por defecto en `http://localhost:8080`. Para publicarla directamente en todas las interfaces, solo cuando no exista un proxy de entrada:

```bash
FRONTEND_BIND_ADDRESS=0.0.0.0 \
VITE_API_BASE_URL=https://api.example.test \
  docker compose -f compose.prod.yaml up --build -d
```

Detener y eliminar los recursos locales:

```bash
docker compose -f compose.dev.yaml down --volumes
docker compose -f compose.prod.yaml down
```

El runtime de produccion usa un usuario no privilegiado, puerto 8080, filesystem de solo lectura, capabilities eliminadas, `no-new-privileges`, limites de recursos y healthcheck en `/healthz`. El contenedor frontend no sirve ni enruta `/api`; la URL absoluta apunta al backend desplegado por separado.

### Auditoria De Contenedores

Validaciones locales recomendadas:

```bash
docker buildx build --check --build-arg VITE_API_BASE_URL=https://api.example.test .
docker run --rm -v "$PWD:/src:ro" hadolint/hadolint:v2.14.0-alpine \
  hadolint --failure-threshold warning /src/Dockerfile
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.74.0 \
  image --severity HIGH,CRITICAL --exit-code 1 sipeg-utp-frontend:prod
```

GitHub Actions repite estos controles, genera un SBOM SPDX y publica resultados SARIF. El informe de la auditoria se encuentra en `docs/security/container-dependency-audit-2026-09-20.md`.

## Limite Con Backend

Este repositorio debe mantenerse frontend-only. No se deben crear controladores, modelos de base de datos, migraciones, colas, mailers ni rutas de servidor aqui.

Las llamadas HTTP deben concentrarse en la capa de adapters (`features/*/adapters` + `src/app/adapters/http/apiClient.ts`) y no deben hardcodearse dentro de componentes de UI. El backend se mantiene en el repositorio hermano `../SIPEG-UTP-BACKEND`.

### Consulta Del Contrato API

El contrato OpenAPI puede consultarse sin cargar la documentacion completa de Scalar:

```bash
pnpm run api:contract -- search "user profile"
pnpm run api:contract -- get GET /api/v1/users/me
pnpm run api:contract -- get GET /api/v1/users/me --pretty
```

Por defecto se consulta el contrato expuesto por el backend en ejecucion en `http://localhost:3000/api/openapi.json`; inicia el backend antes de consultar. Para usar un documento OpenAPI local u otro backend loopback:

```bash
pnpm run api:contract -- get GET /api/v1/users/me \
  --source ./openapi.json
```

Tambien puede configurarse la fuente mediante `SIPEG_OPENAPI_SOURCE`. Por seguridad, las fuentes HTTP solo permiten el endpoint `/api/openapi.json` en direcciones loopback. El frontend nunca modifica el backend: solo lee el contrato en vivo, sin copias locales que puedan quedar desactualizadas.
