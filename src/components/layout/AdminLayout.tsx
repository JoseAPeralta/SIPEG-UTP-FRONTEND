import { AdminMenu } from "./AdminMenu";
import { ApplicationFrame } from "./ApplicationFrame";

export function AdminLayout() {
  return <ApplicationFrame navigation={<AdminMenu />} />;
}
