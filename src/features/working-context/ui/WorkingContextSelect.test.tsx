import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { WorkingContextSelect } from "./WorkingContextSelect";

describe("WorkingContextSelect", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should load programs and activities as options", async () => {
    renderWithProviders(<WorkingContextSelect />);

    const select = await screen.findByRole("combobox", { name: /contexto de trabajo/i });

    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /todos los programas/i })).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: /semana de innovacion academica/i }),
    ).toBeInTheDocument();
  });

  it("should store the selected activity", async () => {
    const user = userEvent.setup();

    renderWithProviders(<WorkingContextSelect />);

    await screen.findByRole("option", { name: /semana de innovacion academica/i });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /contexto de trabajo/i }),
      "activity:activity-open-data-governance",
    );

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "activity-open-data-governance",
      kind: "activity",
    });
    expect(
      await screen.findByText(/las opciones del panel usan: gobernanza de datos abiertos/i),
    ).toBeInTheDocument();
  });

  it("should clear the context when the empty option is selected", async () => {
    const user = userEvent.setup();
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });

    renderWithProviders(<WorkingContextSelect />);

    await screen.findByRole("option", { name: /semana de innovacion academica/i });
    await user.selectOptions(screen.getByRole("combobox", { name: /contexto de trabajo/i }), "");

    expect(useWorkingContextStore.getState().workingContext).toBeNull();
  });
});
