import { screen, within } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { createCareer, createOrganizationalUnit } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { RegisterForm } from "./RegisterForm";

const faculty = createOrganizationalUnit({ id: "faculty-1", name: "Facultad Uno" });
const subdirectorate = createOrganizationalUnit({
  id: "subdirectorate-1",
  name: "Subdireccion Academica",
  type: "SUBDIRECTORATE",
});
const careers = [
  createCareer({ id: "career-1", name: "Ingenieria de Software", unitId: faculty.id }),
  createCareer({ code: "OTROS", id: "career-other", name: "Otros", unitId: null }),
];

async function completeRequiredFields(user: ReturnType<typeof setupUser>) {
  await user.type(screen.getByRole("textbox", { name: /^nombre$/i }), " Maria ");
  await user.type(screen.getByRole("textbox", { name: /apellido/i }), " Perez ");
  await user.type(screen.getByRole("textbox", { name: /c[eé]dula/i }), " 8-123-456 ");
  await user.type(
    screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
    " persona@example.edu ",
  );
  await user.type(screen.getByLabelText(/^contrase[nñ]a$/i), "contrasena-123");
}

describe("RegisterForm", () => {
  it("should enable careers for a faculty and submit trimmed contract fields", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <RegisterForm
        careers={careers}
        onSubmit={onSubmit}
        organizationalUnits={[faculty, subdirectorate]}
      />,
    );

    const careerSelect = screen.getByRole("combobox", { name: /carrera/i });
    expect(careerSelect).toBeDisabled();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /unidad \/ facultad/i }),
      faculty.id,
    );
    expect(careerSelect).toBeEnabled();
    expect(within(careerSelect).getByRole("option", { name: "Otros" })).toBeInTheDocument();
    await user.selectOptions(careerSelect, "career-1");
    await completeRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      careerId: "career-1",
      email: "persona@example.edu",
      firstName: "Maria",
      identificationNumber: "8-123-456",
      lastName: "Perez",
      password: "contrasena-123",
      unitId: "faculty-1",
    });
  });

  it("should clear and omit career when selecting a non-faculty unit", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <RegisterForm
        careers={careers}
        onSubmit={onSubmit}
        organizationalUnits={[faculty, subdirectorate]}
      />,
    );

    const unitSelect = screen.getByRole("combobox", { name: /unidad \/ facultad/i });
    const careerSelect = screen.getByRole("combobox", { name: /carrera/i });
    await user.selectOptions(unitSelect, faculty.id);
    await user.selectOptions(careerSelect, "career-1");
    await user.selectOptions(unitSelect, subdirectorate.id);
    expect(careerSelect).toBeDisabled();
    await completeRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ unitId: "subdirectorate-1" }));
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty("careerId");
  });

  it("should validate password length and toggle its visibility", async () => {
    const user = setupUser();
    renderWithProviders(
      <RegisterForm careers={careers} onSubmit={vi.fn()} organizationalUnits={[faculty]} />,
    );
    const password = screen.getByLabelText(/^contrase[nñ]a$/i);

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /mostrar contrase[nñ]a/i }));
    expect(password).toHaveAttribute("type", "text");
    await user.type(password, "corta");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(screen.getByText(/al menos 12 caracteres/i)).toBeInTheDocument();
  });

  it("should limit the password to the contract maximum and announce the range", () => {
    renderWithProviders(
      <RegisterForm careers={careers} onSubmit={vi.fn()} organizationalUnits={[faculty]} />,
    );

    expect(screen.getByLabelText(/^contrase[nñ]a$/i)).toHaveAttribute("maxlength", "20");
    expect(screen.getByText(/debe tener entre 12 y 20 caracteres/i)).toBeInTheDocument();
  });

  it("should never accept a password longer than the contract maximum", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <RegisterForm careers={careers} onSubmit={onSubmit} organizationalUnits={[faculty]} />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /unidad \/ facultad/i }),
      faculty.id,
    );
    await completeRequiredFields(user);
    await user.clear(screen.getByLabelText(/^contrase[nñ]a$/i));
    await user.type(screen.getByLabelText(/^contrase[nñ]a$/i), "a".repeat(30));
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(screen.getByLabelText(/^contrase[nñ]a$/i)).toHaveValue("a".repeat(20));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ password: "a".repeat(20) }));
  });

  it("should present registration guidance with formal language", async () => {
    const user = setupUser();
    renderWithProviders(
      <RegisterForm careers={careers} onSubmit={vi.fn()} organizationalUnits={[faculty]} />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /unidad \/ facultad/i }),
      faculty.id,
    );
    expect(screen.getByRole("option", { name: /seleccione una carrera/i })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /correo electr[oó]nico/i }), "invalid");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(screen.getByText("Ingrese un correo electrónico válido.")).toBeInTheDocument();
  });
});
