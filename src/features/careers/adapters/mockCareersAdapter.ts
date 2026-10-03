import type { CareersAdapter } from "@/app/adapters/contracts";
import { careers } from "@/data/mock";

export function createMockCareersAdapter(): CareersAdapter {
  return { loadCareers: () => Promise.resolve(structuredClone(careers)) };
}
