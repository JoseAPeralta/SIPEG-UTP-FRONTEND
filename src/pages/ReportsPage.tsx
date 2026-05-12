import { Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { MetricCard } from "@components/MetricCard";
import { ModuleShell } from "@components/ModuleShell";
import { reportMetrics } from "@/data/sipeg";

const tones = ["red", "teal", "amber", "graphite"] as const;

export function ReportsPage() {
  return (
    <ModuleShell
      description="Metricas principales y acciones de exportacion previstas para Excel y PDF. Las descargas quedan como seam futura de cliente API."
      eyebrow="Analitica"
      title="Reportes y estadisticas"
      actions={
        <HStack gap={3} wrap="wrap">
          <Button colorPalette="red" rounded="full" variant="solid">
            Exportar Excel
          </Button>
          <Button colorPalette="red" rounded="full" variant="outline">
            Exportar PDF
          </Button>
        </HStack>
      }
    >
      <Stack gap={6}>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
          {reportMetrics.map((metric, index) => (
            <MetricCard
              detail={metric.detail}
              key={metric.id}
              label={metric.label}
              tone={tones[index] ?? "red"}
              value={metric.value}
            />
          ))}
        </SimpleGrid>
        <Text color="text.muted" fontSize="sm">
          La interfaz mantiene los reportes como datos frontend por ahora; cuando exista backend,
          esta pagina debe consumir una capa de cliente/API aislada.
        </Text>
      </Stack>
    </ModuleShell>
  );
}

export default ReportsPage;
