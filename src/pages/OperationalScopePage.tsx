import { useParams } from "react-router";
import { OperationalScopeView } from "@/features/collaboration";
export default function OperationalScopePage({ type }: { type: "program" | "activity" }) {
  const params = useParams();
  const id = type === "program" ? params["programId"] : params["activityId"];
  return <OperationalScopeView key={`${type}:${id}`} scope={{ type, id: id ?? "" }} />;
}
