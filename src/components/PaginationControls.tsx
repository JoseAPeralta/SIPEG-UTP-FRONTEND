import { Button, Flex, HStack, Text } from "@chakra-ui/react";

type PaginationControlsProps = {
  currentPage: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  pageCount: number;
  totalItems: number;
  visibleItems: number;
};

export function PaginationControls({
  currentPage,
  itemLabel = "elementos",
  onPageChange,
  pageCount,
  totalItems,
  visibleItems,
}: PaginationControlsProps) {
  const safePageCount = Math.max(1, pageCount);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount);

  return (
    <Flex align="center" gap={3} justify="space-between" wrap="wrap">
      <Text color="text.muted" fontSize="sm" fontWeight="700">
        Mostrando {visibleItems} de {totalItems} {itemLabel}
      </Text>
      <HStack as="nav" aria-label="Paginacion" gap={2} wrap="wrap">
        <Button
          colorPalette="red"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          rounded="full"
          variant="outline"
        >
          Anterior
        </Button>
        {Array.from({ length: safePageCount }, (_, index) => index + 1).map((pageNumber) => (
          <Button
            aria-current={safeCurrentPage === pageNumber ? "page" : undefined}
            colorPalette="red"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            rounded="full"
            variant={safeCurrentPage === pageNumber ? "solid" : "outline"}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          colorPalette="red"
          disabled={safeCurrentPage === safePageCount}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          rounded="full"
          variant="outline"
        >
          Siguiente
        </Button>
      </HStack>
    </Flex>
  );
}
