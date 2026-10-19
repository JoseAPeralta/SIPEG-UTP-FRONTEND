import { ActivityDetailView } from "@/features/activity-catalog";
import { Navigate, useParams } from "react-router";

export function ActivityDetailPage() {
  const { activityId } = useParams();

  if (!activityId) {
    return <Navigate replace to="/admin/programas" />;
  }

  return <ActivityDetailView activityId={activityId} mode="administration" />;
}

export default ActivityDetailPage;
