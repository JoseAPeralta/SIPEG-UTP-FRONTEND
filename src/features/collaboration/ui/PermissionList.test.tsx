import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { PermissionList } from "./PermissionList";

it("explains inheritance and never offers local revocation", () => {
  renderWithProviders(
    <PermissionList
      permissions={[
        { name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null },
        {
          name: "activity:update",
          origin: "BOTH",
          validFrom: null,
          validUntil: "2030-01-01T00:00:00Z",
        },
        { name: "private:unknown", origin: "LOCAL", validFrom: null, validUntil: null },
      ]}
    />,
  );
  expect(screen.getByText("Heredado del programa")).toBeInTheDocument();
  expect(screen.getByText("Local y heredado")).toBeInTheDocument();
  expect(screen.getByText("Permiso no reconocido")).toBeInTheDocument();
  expect(screen.queryByText("private:unknown")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getAllByText(/Sin vencimiento/).length).toBeGreaterThan(0);
});
