import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAdapters } from "@/app/adapters/context";
import { useSessionStore } from "@/store/session";
import type { CollaborationScope } from "../model/ownPermissions";
import type {
  AddCollaboratorRequest,
  ChangeCollaboratorRoleRequest,
  GrantPermissionRequest,
  RevokePermissionRequest,
} from "../model/collaborators";
import {
  collaboratorFailureMessage,
  isForbiddenCollaboratorError,
} from "../adapters/collaboratorFailure";
import { invalidateCollaborationAuthorization } from "../model/authorizationInvalidation";

export function useCollaboratorMutations(scope: CollaborationScope) {
  const { collaborators } = useAppAdapters();
  const client = useQueryClient();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const assertIdentity = () => {
    if (!userId || useSessionStore.getState().currentUser?.id !== userId)
      throw new Error("La identidad cambió.");
  };
  const invalidate = async () => {
    if (!userId || useSessionStore.getState().currentUser?.id !== userId) return;
    await invalidateCollaborationAuthorization(client, userId, scope);
  };
  const reconcile = async (error: unknown) => {
    if (!isForbiddenCollaboratorError(error)) return;
    await invalidate();
  };
  const add = useMutation({
    mutationFn: (input: AddCollaboratorRequest) => {
      assertIdentity();
      return collaborators.addCollaborator(scope, input);
    },
    onError: reconcile,
    onSuccess: invalidate,
  });
  const change = useMutation({
    mutationFn: ({ target, input }: { target: string; input: ChangeCollaboratorRoleRequest }) => {
      assertIdentity();
      return collaborators.changeCollaboratorRole(scope, target, input);
    },
    onError: reconcile,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (target: string) => {
      assertIdentity();
      return collaborators.removeCollaborator(scope, target);
    },
    onError: reconcile,
    onSuccess: invalidate,
  });
  const grant = useMutation({
    mutationFn: (input: GrantPermissionRequest) => {
      assertIdentity();
      return collaborators.grantPermission(scope, input);
    },
    onError: reconcile,
    onSuccess: invalidate,
  });
  const revoke = useMutation({
    mutationFn: (input: RevokePermissionRequest) => {
      assertIdentity();
      return collaborators.revokePermission(scope, input);
    },
    onError: reconcile,
    onSuccess: invalidate,
  });
  const failure = add.error
    ? collaboratorFailureMessage(add.error, "add")
    : change.error
      ? collaboratorFailureMessage(change.error, "change")
      : remove.error
        ? collaboratorFailureMessage(remove.error, "remove")
        : grant.error
          ? collaboratorFailureMessage(grant.error, "grant")
          : revoke.error
            ? collaboratorFailureMessage(revoke.error, "revoke")
            : null;
  return {
    add: add.mutateAsync,
    change: (target: string, input: ChangeCollaboratorRoleRequest) =>
      change.mutateAsync({ target, input }),
    remove: remove.mutateAsync,
    grant: grant.mutateAsync,
    revoke: revoke.mutateAsync,
    isPending:
      add.isPending || change.isPending || remove.isPending || grant.isPending || revoke.isPending,
    failure,
    reset: () => {
      add.reset();
      change.reset();
      remove.reset();
      grant.reset();
      revoke.reset();
    },
  };
}
