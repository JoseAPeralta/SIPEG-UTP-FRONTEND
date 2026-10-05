import { Stack, Text } from "@chakra-ui/react";
import { Link } from "react-router";
import { AsyncStateView, FeedbackState, ModuleShell, SectionHeader } from "@/components";
import type { CollaborationScope } from "../model/ownPermissions";
import { PERMISSION_NAMES } from "../model/permissions";
import { hasEffectivePermission } from "../model/operationalCapabilities";
import { useOperationalAccess } from "../hooks/useOperationalAccess";
import { useOwnPermissions } from "../hooks/useOwnPermissions";
import { useAuthorizationTime } from "../hooks/useAuthorizationTime";
import { PermissionList } from "./PermissionList";
import { CollaboratorsView } from "./CollaboratorsView";

export type OperationalScopeViewProps = { scope: CollaborationScope };
/** Guard de scope exacto: no carga permisos ni PII de IDs que no aparecen en el descubrimiento. */
export function OperationalScopeView({ scope }: OperationalScopeViewProps) {
  const access = useOperationalAccess();
  const found = access.scopes.find((item) => item.id === scope.id && item.type === scope.type);
  const own = useOwnPermissions(scope, Boolean(found) && !access.error && !access.isLoading);
  const permissions = own.data?.permissions ?? [];
  const now = useAuthorizationTime(permissions);
  const effective =
    !own.error && PERMISSION_NAMES.some((name) => hasEffectivePermission(permissions, name, now));
  const archived = found?.status === "ARCHIVED" || found?.eventProgram?.status === "ARCHIVED";
  const canManage =
    effective && !archived && hasEffectivePermission(permissions, "permission:grant", now);
  const grantablePermissions = PERMISSION_NAMES.filter((name) =>
    hasEffectivePermission(permissions, name, now),
  );
  return (
    <ModuleShell
      title={found?.name ?? "Contexto de trabajo"}
      headingLabel="Operaciones"
      description="Acceso y colaboración limitados a este programa o actividad."
    >
      <Link to="/operaciones">Volver a mis operaciones</Link>
      <AsyncStateView
        isLoading={access.isLoading || Boolean(found && own.isLoading)}
        error={
          access.error || own.error
            ? new Error("No se pudo confirmar el acceso a este contexto.")
            : null
        }
        onRetry={() => {
          void access.refetch();
          if (found) void own.refetch();
        }}
      >
        {!found || !effective ? (
          <FeedbackState
            title="Contexto no autorizado"
            description="No tiene permisos vigentes para este contexto. Consulte sus operaciones o solicite acceso a la administración."
          />
        ) : (
          <Stack gap={6}>
            <SectionHeader
              title="Mis permisos en este contexto"
              description="Permisos vigentes al consultar. La autorización final corresponde al servidor."
            />
            <PermissionList permissions={permissions} />
            {archived ? (
              <Text role="status">
                El programa está archivado y no permite modificar colaboradores.
              </Text>
            ) : null}
            {canManage ? (
              <CollaboratorsView
                key={`${scope.type}:${scope.id}`}
                scope={scope}
                canManage={canManage}
                grantablePermissions={grantablePermissions}
              />
            ) : null}
            <Text color="text.muted">
              La gestión de programas, actividades, asistencia, propuestas, certificados y reportes
              se incorporará en sus fases correspondientes.
            </Text>
          </Stack>
        )}
      </AsyncStateView>
    </ModuleShell>
  );
}
