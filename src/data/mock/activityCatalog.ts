import type { ActivityCatalog } from "@/types/domain";

import { activities } from "./activities";
import { classrooms } from "./classrooms";
import { eventPrograms } from "./eventPrograms";
import { organizationalUnits } from "./organizationalUnits";

export const mockActivityCatalog: ActivityCatalog = {
  activities,
  classrooms,
  eventPrograms,
  organizationalUnits,
};
