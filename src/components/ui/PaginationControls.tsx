import { Button, Flex, HStack, Text } from "@chakra-ui/react";

export type PaginationControlsProps = {
  currentPage: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  pageCount: number;
  pageSize: number;
  totalItems: number;
};

/** Renders bounded page navigation and the visible item range; hides itself when there are no items. */
export function PaginationControls({
  currentPage,
  itemLabel = "elementos",
  onPageChange,
  pageCount,
  pageSize,
  totalItems,
}: PaginationControlsProps) {
  if (totalItems === 0) {
    return null;
  }

  const safePageCount = Math.max(1, pageCount);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount);
  const firstVisibleItem = (safeCurrentPage - 1) * pageSize + 1;
  const lastVisibleItem = Math.min(totalItems, safeCurrentPage * pageSize);

  return (
    <Flex align="center" gap={3} justify="space-between" wrap="wrap">
      <Text color="text.muted" fontSize="sm" fontWeight="700">
        {firstVisibleItem}–{lastVisibleItem} de {totalItems} {itemLabel}
      </Text>
      <HStack as="nav" aria-label="Paginacion" gap={2} wrap="wrap">
        <Button
          colorPalette="terracotta"
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
            colorPalette="terracotta"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            rounded="full"
            variant={safeCurrentPage === pageNumber ? "solid" : "outline"}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          colorPalette="terracotta"
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
