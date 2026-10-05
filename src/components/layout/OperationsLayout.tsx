import { ApplicationFrame } from "./ApplicationFrame";
import { OperationsMenu } from "./OperationsMenu";
export function OperationsLayout() {
  return <ApplicationFrame navigation={<OperationsMenu />} />;
}
