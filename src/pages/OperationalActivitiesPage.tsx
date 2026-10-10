import { ProgramActivitiesView } from "@/features/activity-catalog";
import { Navigate, useParams } from "react-router";

export function OperationalActivitiesPage() {
  const { programId } = useParams();

  if (!programId) {
    return <Navigate replace to="/operaciones" />;
  }

  return <ProgramActivitiesView mode="operational" programId={programId} />;
}

export default OperationalActivitiesPage;
