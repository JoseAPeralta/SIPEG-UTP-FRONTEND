import { ActivityDetailView } from "@/features/activity-catalog";
import { Navigate, useParams } from "react-router";

export function OperationalActivityDetailPage() {
  const { activityId } = useParams();

  if (!activityId) {
    return <Navigate replace to="/operaciones" />;
  }

  return <ActivityDetailView activityId={activityId} mode="operational" />;
}

export default OperationalActivityDetailPage;
