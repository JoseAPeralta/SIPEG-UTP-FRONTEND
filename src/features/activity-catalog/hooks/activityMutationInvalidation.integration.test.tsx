import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient } from "@/app/query";
import { useAvailableClassrooms } from "@/features/classrooms";
import { useDashboardOverview } from "@/features/dashboard";
import { useWorkingContext } from "@/features/working-context";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useActivityMutations } from "./useActivityMutations";
import { useAdministrativeActivityDetail } from "./useAdministrativeActivityDetail";
import { useDeleteActivity } from "./useDeleteActivity";
import { useProgramActivitiesPage } from "./useProgramActivitiesPage";
import { usePublicActivities } from "./usePublicActivities";
import { usePublicActivityDetail } from "./usePublicActivityDetail";

const PROGRAM_ID = "program-fisc-default";
const CLASSROOM_ID = "aula-10";
const CRITERIA = { date: "2026-08-24", endTime: "09:00", startTime: "08:00" } as const;

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
}

function createDraft(adapters: AppAdapters, name = "Borrador de reconciliacion") {
  return adapters.activities.createActivity({
    classroomId: CLASSROOM_ID,
    date: CRITERIA.date,
    endTime: CRITERIA.endTime,
    eventProgramId: PROGRAM_ID,
    maxCapacity: 30,
    name,
    startTime: CRITERIA.startTime,
    type: "WORKSHOP",
  });
}

function useReconciledSurfaces(activityId: string, onDeleted: () => void) {
  return {
    agenda: usePublicActivities(),
    availability: useAvailableClassrooms(),
    context: useWorkingContext(),
    dashboard: useDashboardOverview(),
    deletion: useDeleteActivity({ activityId, onDeleted, programId: PROGRAM_ID }),
    detail: useAdministrativeActivityDetail(activityId),
    mutations: useActivityMutations(),
    programPage: useProgramActivitiesPage(PROGRAM_ID, { status: "ALL" }, 1),
    publicDetail: usePublicActivityDetail(activityId),
  };
}

function itemIds(items: { id: string }[] | undefined) {
  return items?.map((item) => item.id) ?? [];
}

afterEach(() => {
  useSessionStore.getState().clearSession();
  useWorkingContextStore.getState().clearWorkingContext();
});

describe("activity mutation invalidation integration", () => {
  beforeEach(() => authenticateAdministrator());

  it("walks publication and cancellation across the agenda, the availability and the public detail", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraft(adapters);
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHookWithProviders(() => useReconciledSurfaces(draft.id, vi.fn()), {
      adapters,
      queryClient,
    });

    await waitFor(() =>
      expect(itemIds(result.current.programPage.page?.items)).toContain(draft.id),
    );

    act(() => result.current.availability.search(CRITERIA));
    await waitFor(() =>
      expect(itemIds(result.current.availability.classrooms ?? undefined)).toContain(CLASSROOM_ID),
    );
    expect(result.current.agenda.rows.map((row) => row.activity.id)).not.toContain(draft.id);
    expect(result.current.publicDetail.activity).toBeNull();

    await act(() => result.current.mutations.publish(draft.id));

    await waitFor(() =>
      expect(result.current.agenda.rows.map((row) => row.activity.id)).toContain(draft.id),
    );
    await waitFor(() =>
      expect(itemIds(result.current.availability.classrooms ?? undefined)).not.toContain(
        CLASSROOM_ID,
      ),
    );
    await waitFor(() => expect(result.current.publicDetail.activity?.status).toBe("SCHEDULED"));

    await act(() => result.current.mutations.cancel(draft.id, { reason: "Cierre del campus" }));

    await waitFor(() =>
      expect(result.current.publicDetail.activity).toMatchObject({
        cancelReason: "Cierre del campus",
        status: "CANCELLED",
      }),
    );
    await waitFor(() =>
      expect(result.current.agenda.rows.map((row) => row.activity.id)).not.toContain(draft.id),
    );
    await waitFor(() =>
      expect(itemIds(result.current.availability.classrooms ?? undefined)).toContain(CLASSROOM_ID),
    );
  });

  it("reflects creation and deletion in the program page, the dashboard and the working context", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const probe = await createDraft(adapters, "Sonda eliminable");
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useReconciledSurfaces(probe.id, onDeleted), {
      adapters,
      queryClient,
    });

    await waitFor(() =>
      expect(itemIds(result.current.programPage.page?.items)).toContain(probe.id),
    );
    await waitFor(() => expect(result.current.dashboard.visibleActivityCount).toBeGreaterThan(0));
    const baseline = result.current.dashboard.visibleActivityCount;

    let created!: { id: string };
    await act(async () => {
      created = await result.current.mutations.create({
        date: "2026-08-25",
        endTime: "11:00",
        eventProgramId: PROGRAM_ID,
        name: "Actividad creada integrada",
        startTime: "10:00",
        type: "TALK",
      });
    });

    await waitFor(() =>
      expect(itemIds(result.current.programPage.page?.items)).toContain(created.id),
    );
    await waitFor(() => expect(result.current.dashboard.visibleActivityCount).toBe(baseline + 1));
    await waitFor(() =>
      expect(result.current.context.options.activities.map((option) => option.id)).toContain(
        created.id,
      ),
    );

    await act(async () => {
      await result.current.deletion.remove();
    });

    await waitFor(() =>
      expect(itemIds(result.current.programPage.page?.items)).not.toContain(probe.id),
    );
    await waitFor(() => expect(result.current.dashboard.visibleActivityCount).toBe(baseline));
    await waitFor(() =>
      expect(result.current.context.options.activities.map((option) => option.id)).not.toContain(
        probe.id,
      ),
    );
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("stores the authoritative response and refreshes the program page after an edit", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraft(adapters);
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHookWithProviders(() => useReconciledSurfaces(draft.id, vi.fn()), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.detail.activity?.name).toBe(draft.name));

    await act(() => result.current.mutations.update(draft.id, { name: "Nombre reconciliado" }));

    await waitFor(() => expect(result.current.detail.activity?.name).toBe("Nombre reconciliado"));
    await waitFor(() =>
      expect(
        result.current.programPage.page?.items.find((item) => item.id === draft.id)?.name,
      ).toBe("Nombre reconciliado"),
    );
  });
});
