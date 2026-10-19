import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import type { UserScope, UserScopePermission } from "@/features/collaboration";
import { useSessionStore } from "@/store/session";
import {
  createAdministrativeActivityDetail,
  createAuthenticatedUser,
  createAuthTokens,
  createUserScope,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { ActivityDetailView } from "./ActivityDetailView";

const ACTIVITY_ID = "activity-private-1";
const PROGRAM_ID = "program-private-1";

const PRIVATE_DETAIL = createAdministrativeActivityDetail({
  checkedInCount: 7,
  description: "Descripcion privada que no debe filtrarse",
  enrolledCount: 41,
  equipment: ["Proyector confidencial"],
  eventProgram: { id: PROGRAM_ID, label: null, name: "Programa privado" },
  id: ACTIVITY_ID,
  name: "Borrador confidencial de acreditacion",
  speakers: [{ firstName: "Privado", id: "speaker-private", lastName: "Confidencial" }],
  status: "DRAFT",
});

function permission(name: string): UserScopePermission {
  return { name, origin: "LOCAL", validFrom: null, validUntil: null };
}

function programScope(permissions: UserScopePermission[]): UserScope {
  return createUserScope({
    eventProgram: null,
    id: PROGRAM_ID,
    name: "Programa privado",
    permissions,
    status: "ACTIVE",
    type: "program",
  });
}

function activityScope(permissions: UserScopePermission[]): UserScope {
  return createUserScope({
    eventProgram: { id: PROGRAM_ID, label: null, name: "Programa privado", status: "ACTIVE" },
    id: ACTIVITY_ID,
    name: PRIVATE_DETAIL.name,
    permissions,
    status: "DRAFT",
    type: "activity",
  });
}

/**
 * Compone la frontera real de la vista: la cache ya contiene el detalle privado y ninguna respuesta
 * nueva lo reemplaza, de modo que cualquier dato visible proviene del detalle cacheado y no de una
 * lectura reciente.
 */
function privacyAdapters(loadUserScopes: () => Promise<UserScope[]>): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.userScopes = { loadUserScopes };
  adapters.activities = {
    ...adapters.activities,
    getActivity: () => new Promise<never>(() => undefined),
  };

  return adapters;
}

function renderPrivateDetail(adapters: AppAdapters) {
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(
    queryKeys.activityAdministrationDetail("user-1", ACTIVITY_ID),
    PRIVATE_DETAIL,
  );

  renderWithProviders(<ActivityDetailView activityId={ACTIVITY_ID} mode="operational" />, {
    adapters,
    queryClient,
  });

  return queryClient;
}

/** Ningun dato derivado del detalle administrativo puede verse con el acceso sin confirmar. */
function expectNoPrivateData() {
  expect(
    screen.queryByRole("heading", { level: 1, name: PRIVATE_DETAIL.name }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(PRIVATE_DETAIL.description!)).not.toBeInTheDocument();
  expect(screen.queryByText("Proyector confidencial")).not.toBeInTheDocument();
  expect(screen.queryByText("Privado Confidencial")).not.toBeInTheDocument();
  expect(screen.queryByText(/con asistencia/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Volver a las actividades del programa" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Publicar actividad" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancelar actividad" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Eliminar borrador" })).not.toBeInTheDocument();
}

describe("ActivityDetailView privacy boundary", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER", id: "user-1" }),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => useSessionStore.getState().clearSession());

  it("should hide a cached private detail while the scopes are still resolving", () => {
    renderPrivateDetail(privacyAdapters(() => new Promise<UserScope[]>(() => undefined)));

    expect(screen.getByText("Verificando acceso")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Actividad" })).toBeInTheDocument();
    expectNoPrivateData();
  });

  it("should block the cached detail when no discovered scope grants reading", async () => {
    renderPrivateDetail(privacyAdapters(() => Promise.resolve([])));

    expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
    expectNoPrivateData();
    expect(screen.getByRole("link", { name: "Volver a programas" })).toHaveAttribute(
      "href",
      "/operaciones",
    );
  });

  it("should distinguish a discovery failure from a denial and allow retrying it", async () => {
    const user = setupUser();
    const loadUserScopes = vi
      .fn<() => Promise<UserScope[]>>()
      .mockRejectedValueOnce(new Error("sin red"))
      .mockResolvedValue([programScope([permission("activity:read")])]);
    renderPrivateDetail(privacyAdapters(loadUserScopes));

    expect(await screen.findByText("No se pudo verificar el acceso")).toBeInTheDocument();
    expect(screen.queryByText("Contexto no autorizado")).not.toBeInTheDocument();
    expectNoPrivateData();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DETAIL.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(PRIVATE_DETAIL.description!)).toBeInTheDocument();
  });

  it("should reveal the detail to a collaborator with inherited reading on the program", async () => {
    renderPrivateDetail(
      privacyAdapters(() => Promise.resolve([programScope([permission("activity:read")])])),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DETAIL.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(PRIVATE_DETAIL.description!)).toBeInTheDocument();
    expect(screen.getByText("Proyector confidencial")).toBeInTheDocument();
    expect(screen.getByText("Privado Confidencial")).toBeInTheDocument();
    expect(screen.getByText("41 · 7 con asistencia")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a las actividades del programa" }),
    ).toHaveAttribute("href", `/operaciones/programas/${PROGRAM_ID}/actividades`);
  });

  it("should reveal the detail to a collaborator with a direct scope on the activity", async () => {
    renderPrivateDetail(
      privacyAdapters(() => Promise.resolve([activityScope([permission("activity:read")])])),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DETAIL.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(PRIVATE_DETAIL.description!)).toBeInTheDocument();
  });

  it("should not grant reading from an update or cancel permission alone", async () => {
    renderPrivateDetail(
      privacyAdapters(() =>
        Promise.resolve([
          programScope([permission("activity:update"), permission("activity:cancel")]),
        ]),
      ),
    );

    expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
    expectNoPrivateData();
  });

  it("should block the same cached detail once the confirmed grant is revoked", async () => {
    let scopes: UserScope[] = [programScope([permission("activity:read")])];
    const queryClient = renderPrivateDetail(privacyAdapters(() => Promise.resolve(scopes)));

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DETAIL.name }),
    ).toBeInTheDocument();

    scopes = [];
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.userScopes("user-1", {}) });
    });

    expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
    expectNoPrivateData();
  });
});
