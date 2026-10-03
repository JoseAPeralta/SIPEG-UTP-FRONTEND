import type { ClassroomsAdapter } from "@/app/adapters/contracts";
import { classrooms } from "@/data/mock";

export function createMockClassroomsAdapter(): ClassroomsAdapter {
  return { loadClassrooms: () => Promise.resolve(structuredClone(classrooms)) };
}
