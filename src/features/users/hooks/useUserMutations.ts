import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toUserMutationFailure } from "../adapters/userMutationFailure";
import type { CreateAdminUserRequest, UpdateAdminUserRequest } from "../model/userRequests";

const UNAVAILABLE = "La administración de usuarios no está disponible.";
const ANONYMOUS_USER = "anonymous";

/**
 * Alta y edicion administrativa de cuentas.
 *
 * Un alta cambia el listado; una edicion cambia ademas el detalle exacto. El `isActive` de una
 * cuenta desactivada no altera el catalogo publico ni la agenda, de modo que la invalidacion se
 * limita a las claves administrativas ligadas al `userId`.
 */
export function useUserMutations() {
  const { users } = useAppAdapters();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.currentUser?.id) ?? ANONYMOUS_USER;
  const createUser = users.createUser;
  const updateUser = users.updateUser;

  const invalidateList = () =>
    queryClient
      .invalidateQueries({ queryKey: queryKeys.administrativeUsersScope(userId) })
      .then(() => undefined);

  const createMutation = useMutation({
    mutationFn: (request: CreateAdminUserRequest) => {
      if (!createUser) throw new Error(UNAVAILABLE);
      return createUser(request);
    },
    onSuccess: invalidateList,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      request,
      targetUserId,
    }: {
      request: UpdateAdminUserRequest;
      targetUserId: string;
    }) => {
      if (!updateUser) throw new Error(UNAVAILABLE);
      return updateUser(targetUserId, request);
    },
    onSuccess: (_user, { targetUserId }) =>
      Promise.all([
        invalidateList(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.administrativeUserDetail(userId, targetUserId),
        }),
      ]).then(() => undefined),
  });

  const error = createMutation.error ?? updateMutation.error ?? null;

  return {
    create: createMutation.mutateAsync,
    error,
    failure: error ? toUserMutationFailure(error) : null,
    isPending: createMutation.isPending || updateMutation.isPending,
    reset: () => {
      createMutation.reset();
      updateMutation.reset();
    },
    update: (targetUserId: string, request: UpdateAdminUserRequest) =>
      updateMutation.mutateAsync({ request, targetUserId }),
  };
}
