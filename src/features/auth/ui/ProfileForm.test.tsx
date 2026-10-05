import { screen, within } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { AuthenticatedUser, Career, OrganizationalUnit } from "@/types/domain";

import { ProfileForm } from "./ProfileForm";

const profile: AuthenticatedUser = {
  career: { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" },
  email: "mariana.rodriguez@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-000-0001",
  lastName: "Rodriguez",
  unit: { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" },
};

const organizationalUnits: OrganizationalUnit[] = [
  {
    code: "FIC",
    description: null,
    head: null,
    id: "fic",
    isActive: true,
    name: "Facultad de Ingenieria Civil",
    type: "FACULTY",
  },
  {
    code: "FISC",
    description: null,
    head: null,
    id: "fisc",
    isActive: true,
    name: "Facultad de Ingenieria de Sistemas",
    type: "FACULTY",
  },
  {
    code: "FJEF",
    description: null,
    head: null,
    id: "fjef",
    isActive: false,
    name: "Facultad de Ingenieria Forestal",
    type: "FACULTY",
  },
];

const careers: Career[] = [
  { code: "CIVIL", id: "civil", name: "Ingenieria Civil", unitId: "fic" },
  { code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" },
  { code: "OTROS", id: "otros", name: "Otros", unitId: null },
];

function renderForm(overrides: Partial<React.ComponentProps<typeof ProfileForm>> = {}) {
  return renderWithProviders(
    <ProfileForm
      careers={careers}
      onSubmit={vi.fn()}
      organizationalUnits={organizationalUnits}
      profile={profile}
      {...overrides}
    />,
  );
}

describe("ProfileForm", () => {
  it("should prefill the editable fields from the authenticated profile", () => {
    renderForm();

    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Mariana");
    expect(screen.getByLabelText(/apellido/i)).toHaveValue("Rodriguez");
    expect(screen.getByLabelText(/unidad/i)).toHaveValue("fisc");
    expect(screen.getByLabelText(/carrera/i)).toHaveValue("software");
  });

  it("should present the email, identification and role as read-only text", () => {
    renderForm();

    expect(screen.getByText(/mariana\.rodriguez@example\.edu/)).toBeInTheDocument();
    expect(screen.getByText(/8-000-0001/)).toBeInTheDocument();
    expect(screen.getByText(/Administrador/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/correo/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/c[eé]dula/i)).not.toBeInTheDocument();
  });

  it("should never render raw contract codes for the role", () => {
    renderForm();

    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
  });

  it("should submit only the fields that changed", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(onSubmit).toHaveBeenCalledWith({ firstName: "Mariana Paula" });
  });

  it("should submit the unit and career selected together", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.selectOptions(screen.getByLabelText(/unidad/i), "fic");
    await user.selectOptions(screen.getByLabelText(/carrera/i), "civil");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(onSubmit).toHaveBeenCalledWith({ careerId: "civil", unitId: "fic" });
  });

  it("should send a null unit and no career for the Otro option", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.selectOptions(screen.getByLabelText(/unidad/i), "");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(onSubmit).toHaveBeenCalledWith({ unitId: null });
  });

  it("should block the career when the Otro option is selected", async () => {
    const user = setupUser();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/unidad/i), "");

    const career = screen.getByLabelText(/carrera/i);

    expect(career).toBeDisabled();
    expect(career).toHaveTextContent("Otros");
  });

  it("should clear the career selection when the unit changes", async () => {
    const user = setupUser();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/unidad/i), "fic");
    await user.selectOptions(screen.getByLabelText(/carrera/i), "civil");

    await user.selectOptions(screen.getByLabelText(/unidad/i), "fisc");

    expect(screen.getByLabelText(/carrera/i)).toHaveValue("");
  });

  it("should disable the submit control when the assignment returns to its original state", async () => {
    const user = setupUser();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/unidad/i), "fic");
    await user.selectOptions(screen.getByLabelText(/carrera/i), "civil");
    await user.selectOptions(screen.getByLabelText(/unidad/i), "fisc");

    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
  });

  it("should keep an inactive current unit available instead of losing it", () => {
    renderForm({
      profile: {
        ...profile,
        career: null,
        unit: { code: "FJEF", id: "fjef", name: "Facultad de Ingenieria Forestal" },
      },
    });

    expect(screen.getByLabelText(/unidad/i)).toHaveValue("fjef");
  });

  it("should keep a current career that is missing from the catalog", () => {
    renderForm({
      profile: {
        ...profile,
        career: { code: "LEGACY", id: "legacy", name: "Carrera retirada" },
      },
    });

    expect(screen.getByLabelText(/carrera/i)).toHaveValue("legacy");
  });

  it("should focus the first invalid name and not submit", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "M");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/al menos 2 caracteres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should cap both name inputs at the contract maximum", () => {
    renderForm();

    expect(screen.getByLabelText(/nombre/i)).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText(/apellido/i)).toHaveAttribute("maxlength", "100");
  });

  it("should disable the submit control until something changes", async () => {
    const user = setupUser();
    renderForm();

    const submit = screen.getByRole("button", { name: /guardar cambios/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/nombre/i), "a");

    expect(submit).toBeEnabled();
  });

  it("should disable the whole form while the update runs", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByLabelText(/nombre/i)).toBeDisabled();
    expect(screen.getByLabelText(/unidad/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
  });

  it("should announce a service error and keep the typed values", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderForm({
      errorMessage: "No fue posible guardar su perfil. Intente de nuevo.",
      onSubmit,
    });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");

    expect(await screen.findByRole("alert")).toHaveTextContent(/no fue posible guardar su perfil/i);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Mariana Paula");
  });

  it("should announce a confirmed update with a status role", () => {
    renderForm({ successMessage: "Su perfil fue actualizado." });

    expect(screen.getByRole("status")).toHaveTextContent(/perfil fue actualizado/i);
  });

  it("should never include a read-only attribute in the submitted patch", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    const [request] = onSubmit.mock.calls[0] as [Record<string, unknown>];

    expect(Object.keys(request).sort()).toEqual(["firstName"]);
    expect(request).not.toHaveProperty("email");
    expect(request).not.toHaveProperty("globalRole");
    expect(request).not.toHaveProperty("identificationNumber");
    expect(request).not.toHaveProperty("id");
    expect(request).not.toHaveProperty("isActive");
  });

  it("should group the form controls for assistive technology", () => {
    const { container } = renderForm();

    const form = container.querySelector("form");

    expect(form).toBeInTheDocument();
    expect(
      within(form as HTMLElement).getByRole("group", { name: /datos de solo lectura/i }),
    ).toBeInTheDocument();
  });
});
