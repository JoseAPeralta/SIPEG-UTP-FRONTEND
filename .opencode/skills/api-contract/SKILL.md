---
name: api-contract
description: Consult the SIPEG OpenAPI contract with minimal context. Use when implementing or debugging API clients, HTTP services, authentication, request or response types, endpoints, status codes, or frontend-backend integration.
---

# SIPEG API Contract

Use the targeted contract CLI before writing or changing frontend code that communicates with the backend.

## Workflow

1. Start the backend before querying; the contract is always read live from it.

2. Search when the exact path is unknown:

   ```bash
   pnpm run api:contract -- search "user profile"
   ```

3. Retrieve only the selected operation and its referenced components:

   ```bash
   pnpm run api:contract -- get GET /api/v1/users/me
   ```

4. Base request bodies, response types, authentication and status handling on that output. Do not invent undocumented fields or behavior.

5. When the contract changes, update `src/types/domain.ts`, the feature mappers, `src/data/mock` and the related tests in the same change, then run `pnpm run api:mocks-check` with the backend running. The script reports missing operations, schemas, required fields or enum drift in Spanish.

## Sources

The default source is the running backend at `http://localhost:3000/api/openapi.json`. It reflects the API under development, so no local copy is kept.

Override the source with `--source` or `SIPEG_OPENAPI_SOURCE` only for a local OpenAPI document or a different loopback backend:

```bash
pnpm run api:contract -- get GET /api/v1/users/me \
  --source ./openapi.json
```

## Constraints

- Do not fetch `/api/docs`; Scalar embeds the full contract in HTML.
- Do not load the complete `openapi.json` into model context.
- The backend is read-only from this repository: never modify backend files, only read the contract.
- Do not modify the referenced backend repository from a frontend task.
- Do not execute POST, PUT, PATCH or DELETE requests unless the user explicitly asks.
- Keep `src/data/mock` in sync with the live contract; `pnpm run api:mocks-check` is the drift check.
- Do not send the contract to hosted documentation or MCP services.
- If the source is unavailable, report that limitation instead of guessing the contract.
