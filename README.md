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
- TypeScript
- Vite
- React Router v7
- Chakra UI v3
- Zustand
- Vitest
- Testing Library
- ESLint flat config
- Prettier
- PWA con manifest, service worker, pagina offline e iconos instalables
- Docker con Nginx para servir el build de produccion

## Requisitos

- Node.js 20 o superior recomendado
- pnpm

## Instalacion

```bash
pnpm install
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
| `pnpm run check`         | Ejecuta formato, lint, typecheck, tests y build.              |

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

Construir la imagen:

```bash
docker build -t sipeg-utp-frontend .
```

Ejecutar el contenedor:

```bash
docker run -p 8080:80 sipeg-utp-frontend
```

La aplicacion queda disponible en:

```txt
http://localhost:8080
```

## Limite Con Backend

Este repositorio debe mantenerse frontend-only. No se deben crear controladores, modelos de base de datos, migraciones, colas, mailers ni rutas de servidor aqui.

Cuando exista backend, las llamadas HTTP deben concentrarse en una capa de cliente/API futura y no deben hardcodearse dentro de componentes de UI.
