# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30.5-alpine@sha256:daa17b944bac2b578e962da4c61ad72a59233b3c63abea17113acaf4e6b9aea4

FROM ${NODE_IMAGE} AS base

ENV PNPM_HOME=/pnpm
ENV COREPACK_HOME=/pnpm/corepack
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN mkdir -p "$PNPM_HOME" "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare pnpm@12.5.1 --activate \
  && chown -R node:node /app "$PNPM_HOME"

USER node

FROM base AS dependencies

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,target=/pnpm/store,uid=1000,gid=1000 \
  pnpm install --frozen-lockfile

FROM dependencies AS development

COPY --chown=node:node . ./

EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--strictPort"]

FROM dependencies AS build

ARG VITE_API_BASE_URL

COPY --chown=node:node . ./
RUN VITE_API_BASE_URL="$VITE_API_BASE_URL" node -e \
  'const value = process.env.VITE_API_BASE_URL; if (!value) throw new Error("VITE_API_BASE_URL is required"); const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS");' \
  && VITE_API_BASE_URL="$VITE_API_BASE_URL" pnpm run build

FROM ${NGINX_IMAGE} AS production

COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html

USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
