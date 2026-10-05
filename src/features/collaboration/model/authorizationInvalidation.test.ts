// @vitest-environment node
import { expect, it } from "vitest";

import { createQueryClient, queryKeys } from "@/app/query";

import { invalidateCollaborationAuthorization } from "./authorizationInvalidation";

const activity = { type: "activity", id: "a-1" } as const;

it("invalidates only the activity boundaries and every discovery filter of the identity", async () => {
  const client = createQueryClient();
  const touched = [
    queryKeys.collaborators("actor", activity),
    queryKeys.ownPermissions("actor", activity),
    queryKeys.userScopes("actor"),
    queryKeys.userScopes("actor", { type: "activity" }),
    queryKeys.userScopes("actor", { type: "program" }),
  ];
  const untouched = [
    queryKeys.collaborators("actor", { type: "program", id: "p-1" }),
    queryKeys.ownPermissions("actor", { type: "program", id: "p-1" }),
    queryKeys.collaborators("other", activity),
    queryKeys.ownPermissions("other", activity),
    queryKeys.userScopes("other"),
  ];
  for (const key of [...touched, ...untouched]) client.setQueryData(key, []);

  await invalidateCollaborationAuthorization(client, "actor", activity);

  for (const key of touched) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of untouched) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});

it("invalidates every collaborator and permission boundary of the identity for program changes", async () => {
  const client = createQueryClient();
  const touched = [
    queryKeys.collaborators("actor", { type: "program", id: "p-1" }),
    queryKeys.collaborators("actor", activity),
    queryKeys.ownPermissions("actor", { type: "program", id: "p-1" }),
    queryKeys.ownPermissions("actor", activity),
    queryKeys.userScopes("actor", { type: "program" }),
  ];
  const untouched = [
    queryKeys.collaborators("other", { type: "program", id: "p-1" }),
    queryKeys.ownPermissions("other", activity),
    queryKeys.userScopes("other"),
    queryKeys.publicActivityCatalog,
  ];
  for (const key of [...touched, ...untouched]) client.setQueryData(key, []);

  await invalidateCollaborationAuthorization(client, "actor", { type: "program", id: "p-1" });

  for (const key of touched) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of untouched) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});
