import { Stack } from "@chakra-ui/react";
import { AsyncStateView, SectionHeader } from "@/components";
import type { CollaborationScope } from "../model/ownPermissions";
import { useOwnPermissions } from "../hooks/useOwnPermissions";
import { PermissionList } from "./PermissionList";

export type OwnPermissionsViewProps = { scope: CollaborationScope };
/** Consulta únicamente el contexto abierto, no todos los scopes del catálogo. */
export function OwnPermissionsView({ scope }: OwnPermissionsViewProps) {
  const query = useOwnPermissions(scope);
  return (
    <Stack gap={4}>
      <SectionHeader
        title="Mis permisos en este contexto"
        description="Se muestran los permisos vigentes al consultar. La autorización final corresponde al servidor."
      />
      <AsyncStateView
        isLoading={query.isLoading}
        error={query.error ? new Error("No se pudieron consultar sus permisos.") : null}
        onRetry={() => {
          void query.refetch();
        }}
      >
        <PermissionList permissions={query.data?.permissions ?? []} />
      </AsyncStateView>
    </Stack>
  );
}
