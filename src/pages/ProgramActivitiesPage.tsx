import { ProgramActivitiesView } from "@/features/activity-catalog";
import { Navigate, useParams } from "react-router";

export function ProgramActivitiesPage() {
  const { programId } = useParams();

  if (!programId) {
    return <Navigate replace to="/admin/programas" />;
  }

  return <ProgramActivitiesView mode="administration" programId={programId} />;
}

export default ProgramActivitiesPage;
