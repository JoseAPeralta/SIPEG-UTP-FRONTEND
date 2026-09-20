# Container And Dependency Security Audit

Date: 2026-09-20

## Scope

This audit covers direct and transitive frontend dependencies, Node and pnpm versions, the production image, local development containers, Nginx configuration, PWA caching, and CI supply-chain controls. The backend remains outside this repository.

## Baseline Findings

The original dependency audit reported six vulnerabilities, all through `react-router@7.15.0`:

| Severity | Count | Advisories                                                          |
| -------- | ----: | ------------------------------------------------------------------- |
| High     |     2 | `GHSA-chx6-hx7r-mcp5`, `GHSA-qwww-vcr4-c8h2`                        |
| Moderate |     3 | `GHSA-wrjc-x8rr-h8h6`, `GHSA-h8fp-f39c-q6mh`, `GHSA-337j-9hxr-rhxg` |
| Low      |     1 | `GHSA-84g9-w2xq-vcv6`                                               |

Additional high-priority findings were:

- Node 20 and Nginx 1.27 were outside their supported release lines.
- Base images used mutable tags without digests.
- Nginx ran without an explicit non-root contract or runtime hardening.
- No development container or Compose configuration existed.
- The Docker build context did not exclude common secret and credential files.
- The service worker could cache authenticated same-origin API responses.
- Nginx could return the SPA HTML document for an unknown `/api` route.
- Security headers, health checks, SBOM generation and automated scans were absent.
- `@testing-library/jest-dom@6.10.0` was deprecated and incompatible with the documented Node version.

## Resolved Versions

| Component    | Resolved version | Policy                                                        |
| ------------ | ---------------- | ------------------------------------------------------------- |
| Node.js      | 24.21.0          | Active LTS, exact image tag and digest                        |
| pnpm         | 12.5.1           | Exact `packageManager` version                                |
| TypeScript   | 6.0.3            | Latest stable version supported by `typescript-eslint@8.70.0` |
| React        | 19.3.0           | Latest stable                                                 |
| React Router | 8.4.0            | Latest stable and outside all baseline advisory ranges        |
| Vite         | 8.3.0            | Latest stable                                                 |
| Vitest       | 5.0.1            | Latest stable                                                 |
| Nginx        | 1.30.5           | Stable branch, unprivileged image, exact digest               |

TypeScript 7 is intentionally excluded because `typescript-eslint@8.70.0` declares `typescript >=4.8.4 <6.1.0` and rejects TypeScript 7 directly.

## Implemented Controls

- Multi-stage Dockerfile with `development`, `build`, and `production` targets.
- Node and Nginx images pinned by version and OCI manifest digest.
- Dependency installation and frontend build executed as the `node` user.
- Production runs as UID/GID `101:101` on unprivileged port 8080.
- Production root filesystem is read-only with only `/tmp` mounted as `tmpfs`.
- All Linux capabilities are dropped and `no-new-privileges` is enabled.
- CPU, memory and PID limits are defined in both Compose environments.
- Health checks exist for Vite and Nginx.
- The production API URL is mandatory, absolute and validated during the build.
- `/api` is explicitly rejected by Nginx instead of falling back to `index.html`.
- CSP, HSTS, frame protection, MIME sniffing protection, referrer and permissions headers are enabled.
- The service worker caches only known static paths and rejects API, authenticated, private and `no-store` responses.
- `.dockerignore` excludes repository metadata, environment files, credentials, keys, agent data, reports and build artifacts.
- GitHub Actions are pinned to commit SHAs and run dependency, secret, configuration and image scans.
- Dependabot monitors npm, Docker and GitHub Actions updates weekly.
- CI produces an SPDX JSON SBOM and uploads a SARIF vulnerability report.

## Verification Results

| Check                            | Result                                                                   |
| -------------------------------- | ------------------------------------------------------------------------ |
| `pnpm audit --audit-level high`  | 0 vulnerabilities at all severities                                      |
| Trivy 0.74 filesystem scan       | 0 high/critical vulnerabilities, secrets or Dockerfile misconfigurations |
| Trivy 0.74 production image scan | 0 high/critical vulnerabilities                                          |
| Hadolint 2.14                    | No warnings or errors                                                    |
| Docker Buildx check              | No warnings                                                              |
| Production runtime health        | Healthy                                                                  |
| Development runtime health       | Healthy                                                                  |
| Production effective user        | `101:101`                                                                |
| Production read-only root        | Enabled                                                                  |
| Production capabilities          | All dropped                                                              |
| Production `no-new-privileges`   | Enabled                                                                  |
| Production SBOM                  | 86 Alpine packages indexed by Docker Scout                               |

Docker Scout generated the local SBOM but required Docker Hub authentication for CVE and recommendation queries. No credentials were requested or used; Trivy provided the independent vulnerability result instead.

## Residual Risks

- The CSP permits HTTPS API connections generally because the production API hostname is supplied at build time. A deployment-specific proxy can narrow `connect-src` to the final API origin.
- Google Fonts remain external dependencies and require CSP exceptions for `fonts.googleapis.com` and `fonts.gstatic.com`.
- Nginx includes optional packaged modules that are not used by this configuration. Continuous image scanning remains necessary as advisories evolve.
- Digests intentionally make builds reproducible; Dependabot must update both image versions and digests when security releases become available.
- TLS terminates outside this frontend container. The external ingress must enforce HTTPS and preserve the security headers.
