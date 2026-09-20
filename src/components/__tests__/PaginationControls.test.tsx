import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { PaginationControls } from "@components/PaginationControls";
import { renderWithProviders } from "@/test/render";

function renderPaginationControls(props: Partial<ComponentProps<typeof PaginationControls>> = {}) {
  const onPageChange = vi.fn();

  renderWithProviders(
    <PaginationControls
      currentPage={2}
      itemLabel="eventos"
      onPageChange={onPageChange}
      pageCount={5}
      totalItems={48}
      visibleItems={10}
      {...props}
    />,
  );

  return { onPageChange };
}

describe("PaginationControls", () => {
  it("should show the visible and total item count", () => {
    renderPaginationControls();

    expect(screen.getByText(/mostrando 10 de 48 eventos/i)).toBeInTheDocument();
  });

  it("should disable previous and keep next enabled on the first page", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPaginationControls({ currentPage: 1 });

    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("should disable next and keep previous enabled on the last page", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPaginationControls({ currentPage: 5 });

    expect(screen.getByRole("button", { name: /anterior/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /anterior/i }));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("should navigate to previous and next pages from a middle page", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPaginationControls({ currentPage: 3 });

    await user.click(screen.getByRole("button", { name: /anterior/i }));
    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 2);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 4);
  });

  it("should notify when a specific page is selected", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPaginationControls();

    await user.click(screen.getByRole("button", { name: "4" }));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("should disable previous and next when there is only one page", () => {
    renderPaginationControls({ currentPage: 1, pageCount: 1, totalItems: 8, visibleItems: 8 });

    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });
});
