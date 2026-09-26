import { Badge, Box, Stack, Text } from "@chakra-ui/react";

import {
  AsyncStateView,
  FeedbackState,
  MetricCard,
  ModuleShell,
  SelectionRequiredState,
  Surface,
} from "@/components";
import { certificateStatusLabels, useCertificatesOverview } from "@/features/certificates";

export function CertificatesPage() {
  const { error, generatedCount, isLoading, rows, scope } = useCertificatesOverview();

  if (!isLoading && !error && !scope) {
    return (
      <ModuleShell
        description="Selecciona un contexto de trabajo para consultar certificados generados o pendientes."
        headingLabel="Evidencia academica"
        title="Certificados"
      >
        <SelectionRequiredState
          message="Los certificados se muestran para el programa o la actividad elegidos en el panel de administracion."
          title="Selecciona un contexto de trabajo"
        />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      description={
        scope
          ? `Certificados asociados a ${scope.label}.`
          : "Certificados del contexto seleccionado."
      }
      headingLabel="Evidencia academica"
      title="Certificados"
    >
      <AsyncStateView error={error} isLoading={isLoading}>
        <Stack gap={4}>
          <MetricCard
            appearance="operational"
            detail="Certificados listos para descarga."
            label="Generados"
            value={String(generatedCount)}
          />

          {rows.length === 0 ? (
            <FeedbackState
              description="Cuando haya asistencia confirmada, los certificados apareceran aqui."
              title="No hay certificados para este contexto"
            />
          ) : null}

          {rows.map((row) => (
            <Surface
              alignItems="start"
              display="flex"
              flexWrap="wrap"
              gap={5}
              justifyContent="space-between"
              key={row.certificate.id}
              padding="normal"
            >
              <Box>
                <Text color="text.default" fontFamily="heading" fontSize="2xl" fontWeight="700">
                  {row.activityName ?? "Actividad sin asignar"}
                </Text>
                <Text color="text.muted">
                  {row.userName ?? "Usuario pendiente"} ·{" "}
                  {new Date(row.certificate.generatedAt).toLocaleDateString("es-PA")}
                </Text>
              </Box>
              <Badge
                colorPalette={row.certificate.status === "GENERATED" ? "success" : "warning"}
                rounded="full"
                variant="subtle"
              >
                {certificateStatusLabels[row.certificate.status]}
              </Badge>
            </Surface>
          ))}
        </Stack>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default CertificatesPage;
