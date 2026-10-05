import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import type { AppAdapters, ClassroomsAdapter } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
  createClassroomDetail,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useClassroomDetail } from "./useClassroomDetail";

type GetClassroom = NonNullable<ClassroomsAdapter["getClassroom"]>;

function authenticate() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens({ accessToken: "secret-token" }),
  });
}

function getClassroomStub(implementation: GetClassroom) {
  return vi.fn<GetClassroom>(implementation);
}

function detailAdapters(getClassroom: ReturnType<typeof getClassroomStub>): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });

  return { ...adapters, classrooms: { ...adapters.classrooms, getClassroom } };
}

describe("useClassroomDetail", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not request a classroom without an id", async () => {
    const getClassroom = getClassroomStub(() => Promise.resolve(createClassroomDetail()));
    const { result } = renderHookWithProviders(() => useClassroomDetail(""), {
      adapters: detailAdapters(getClassroom),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getClassroom).not.toHaveBeenCalled();
    expect(result.current.classroom).toBeNull();
  });

  it("should not load an administrative detail without a session", async () => {
    const getClassroom = getClassroomStub(() => Promise.resolve(createClassroomDetail()));
    const { result } = renderHookWithProviders(
      () => useClassroomDetail("classroom-1", "administrative"),
      { adapters: detailAdapters(getClassroom) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getClassroom).not.toHaveBeenCalled();
  });

  it("should separate the public and the identity-scoped administrative detail caches", async () => {
    authenticate();
    const getClassroom = getClassroomStub(() => Promise.resolve(createClassroomDetail()));
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHookWithProviders(
      () => ({
        administrative: useClassroomDetail("classroom-1", "administrative"),
        public: useClassroomDetail("classroom-1", "public"),
      }),
      { adapters: detailAdapters(getClassroom), queryClient },
    );

    await waitFor(() => expect(getClassroom).toHaveBeenCalledTimes(2));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.publicClassroomDetail("classroom-1"));
    expect(keys).toContainEqual(queryKeys.administrativeClassroomDetail("user-1", "classroom-1"));
    expect(keys).not.toContainEqual(
      queryKeys.administrativeClassroomDetail("anonymous", "classroom-1"),
    );
    expect(JSON.stringify(keys)).not.toContain("secret-token");
  });

  it("should keep the weekly availability of the resolved classroom", async () => {
    const detail = createClassroomDetail({
      availability: [
        {
          dayOfWeek: 1,
          endTime: "10:00",
          id: "availability-1",
          period: null,
          startTime: "08:00",
        },
      ],
    });
    const { result } = renderHookWithProviders(() => useClassroomDetail("classroom-1", "public"), {
      adapters: detailAdapters(getClassroomStub(() => Promise.resolve(detail))),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.classroom).toEqual(detail);
    expect(result.current.classroom).toMatchObject(createClassroom());
    expect(result.current.classroom?.availability[0]?.dayOfWeek).toBe(1);
  });

  it("should report a missing classroom as a not-found failure", async () => {
    const { result } = renderHookWithProviders(() => useClassroomDetail("aula-10", "public"), {
      adapters: detailAdapters(
        getClassroomStub(() =>
          Promise.reject(Object.assign(new Error("no existe"), { status: 404 })),
        ),
      ),
    });

    await waitFor(() => expect(result.current.failure).toBe("notFound"));

    expect(result.current.classroom).toBeNull();
  });
});
