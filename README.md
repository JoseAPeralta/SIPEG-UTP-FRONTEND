# SIPEG UTP Frontend

SIPEG UTP es el frontend de una plataforma para gestionar eventos academicos de la Universidad Tecnologica de Panama. La aplicacion busca centralizar la administracion de eventos grandes, actividades individuales, asistencia, certificados, aulas, ponentes, usuarios, reportes y estadisticas operativas.

Este repositorio contiene solo la interfaz web. El backend sera un proyecto separado y, cuando exista, este frontend debera consumirlo mediante una capa clara de cliente/API. Por ahora, las pantallas trabajan con datos de demostracion ubicados en `src/data`.

Actualmente el proyecto incluye la base tecnica, navegacion principal, vistas iniciales por modulo, datos mock, configuracion de calidad, PWA e infraestructura de build. Las funcionalidades de negocio todavia no estan finalizadas.

## Estado De Funcionalidades

Leyenda: `X` pendiente, `✓` finalizada.

| Estado | Funcionalidad            | Descripcion                                                                                               |
| ------ | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| X      | Gestion de usuarios      | Crear usuarios, seleccionar facultad y carrera, modificar datos y asignar permisos en eventos.            |
| X      | Notificaciones por email | Enviar avisos a usuarios o asistentes registrados cuando se creen, modifiquen o eliminen eventos.         |
| X      | Eventos grandes          | Crear series de eventos con nombre, fechas, etiqueta personalizada, banner, colaboradores y permisos.     |
| X      | Eventos pequenos         | Crear actividades individuales con nombre, tipo, ponente, aula, fecha, hora, equipo requerido y banner.   |
| X      | Herencia de permisos     | Heredar colaboradores y permisos desde eventos grandes hacia eventos pequenos por defecto.                |
| X      | Listado de eventos       | Mostrar eventos disponibles y pasados, con priorizacion por facultad seleccionada.                        |
| X      | Filtros por facultad     | Filtrar eventos por facultad y destacar los relacionados con la facultad activa.                          |
| X      | Modificacion de eventos  | Modificar eventos y preguntar si se debe notificar a asistentes registrados.                              |
| X      | Eliminacion de eventos   | Eliminar eventos grandes o pequenos y confirmar si los asistentes deben ser notificados.                  |
| X      | Registro de asistencia   | Registrar asistencia para eventos mediante QR o codigos manuales.                                         |
| X      | Certificados             | Generar certificados automaticamente o desde la lista de asistencia.                                      |
| X      | Inventario de aulas      | Administrar aulas y laboratorios con horarios, dias disponibles, capacidad maxima y amenidades.           |
| X      | Registro de ponentes     | Capturar propuestas con nombre, email, CV, duracion, tipo de charla, titulo, contenido y evento asociado. |
| X      | Reportes y estadisticas  | Mostrar metricas de asistencia, certificados, ocupacion de aulas, eventos activos y eventos pasados.      |
| X      | Exportaciones            | Preparar exportacion de reportes a Excel y PDF.                                                           |
| X      | Integracion backend      | Consumir la futura API Node.js mediante una capa de cliente/API aislada de los componentes.               |

## Stack

- React 19
- TypeScript 6
- Vite
- React Router v8
- Chakra UI v3
- Zustand
- Vitest
- Testing Library
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

| Comando                  | Uso                                                           |
| ------------------------ | ------------------------------------------------------------- |
| `pnpm run audit`         | Audita dependencias y falla ante vulnerabilidades altas.      |
| `pnpm run dev`           | Inicia el servidor local de desarrollo.                       |
| `pnpm run build`         | Ejecuta typecheck y genera el build de produccion en `dist`.  |
| `pnpm run preview`       | Sirve localmente el build de produccion.                      |
| `pnpm run start`         | Alias para servir el build con `vite preview --host 0.0.0.0`. |
| `pnpm run lint`          | Ejecuta ESLint con cero warnings permitidos.                  |
| `pnpm run lint:fix`      | Ejecuta ESLint aplicando correcciones automaticas.            |
| `pnpm run format`        | Formatea archivos con Prettier.                               |
| `pnpm run format:check`  | Verifica formato sin modificar archivos.                      |
| `pnpm run typecheck`     | Ejecuta TypeScript sin emitir archivos.                       |
| `pnpm test`              | Ejecuta pruebas con Vitest.                                   |
| `pnpm run test:watch`    | Ejecuta Vitest en modo watch.                                 |
| `pnpm run test:ui`       | Abre la interfaz de Vitest.                                   |
| `pnpm run test:coverage` | Genera reporte de cobertura.                                  |
| `pnpm run pwa:icons`     | Regenera los iconos basicos de la PWA.                        |
| `pnpm run check`         | Ejecuta formato, lint, tests, typecheck y build.              |

## Verificacion Recomendada

Antes de considerar una tarea completa, ejecuta:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

Tambien puedes ejecutar la cadena completa con:

```bash
pnpm run check
```

## Estructura Del Proyecto

```txt
src/
├── components/       # Componentes reutilizables y layout
├── data/             # Datos mock mientras no exista backend
├── hooks/            # Hooks personalizados
├── pages/            # Vistas de nivel ruta
├── pwa/              # Registro y pruebas de PWA
├── store/            # Estado compartido con Zustand
├── styles/           # Estilos globales
├── test/             # Utilidades de testing
├── theme/            # Sistema Chakra UI v3
├── types/            # Tipos de dominio frontend
├── utils/            # Utilidades puras
├── App.tsx           # Router principal
├── main.tsx          # Punto de entrada
└── setupTests.ts     # Setup global de Vitest
```

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
- `public/sw.js`
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

La aplicacion queda disponible en `http://localhost:5173`. La API de desarrollo usa `http://localhost:3000/api` por defecto. Puede cambiarse antes de iniciar:

```bash
VITE_API_BASE_URL=http://localhost:4000/api \
  docker compose -f compose.dev.yaml up --build
```

### Produccion

`VITE_API_BASE_URL` es obligatoria, debe ser absoluta y se incorpora al bundle durante el build. No debe contener secretos porque cualquier variable `VITE_*` es publica en el navegador.

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

Cuando exista backend, las llamadas HTTP deben concentrarse en una capa de cliente/API futura y no deben hardcodearse dentro de componentes de UI.
