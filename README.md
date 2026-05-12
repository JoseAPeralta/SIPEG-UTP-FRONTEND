# SIPEG UTP Frontend

Frontend React para la plataforma SIPEG UTP de gestion de eventos academicos, asistencia, certificados, aulas, ponentes, usuarios, reportes y estadisticas.

## Stack

- React 19
- TypeScript
- Vite
- React Router v7
- Chakra UI v3
- Zustand
- Vitest + Testing Library
- ESLint flat config + Prettier

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run pwa:icons
npm run build
```

## Calidad

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run pwa:icons
npm run build
```

Tambien puedes ejecutar todo con:

```bash
npm run check
```

## Estructura

```txt
src/
├── components/
├── data/
├── hooks/
├── pages/
├── store/
├── styles/
├── test/
├── theme/
├── types/
├── utils/
├── App.tsx
├── main.tsx
└── setupTests.ts
```

## Backend Boundary

Este repositorio es solo frontend. Mientras no exista backend, los datos viven en `src/data`. Las futuras llamadas HTTP deben aislarse en una capa de cliente/API y no deben hardcodearse dentro de componentes.

## Docker

```bash
docker build -t sipeg-utp-frontend .
docker run -p 8080:80 sipeg-utp-frontend
```

## PWA

La aplicacion incluye `manifest.webmanifest`, `sw.js`, pagina offline e iconos instalables en `public/icons`. Si necesitas regenerar los iconos basicos:

```bash
npm run pwa:icons
```
