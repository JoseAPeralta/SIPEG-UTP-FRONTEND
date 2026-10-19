import { AlertsInboxView } from "@/features/alerts";

/**
 * Alerts section of the personal area. It is a thin composition: the connected view owns filters,
 * pagination and destination resolution.
 */
export function PersonalAlertsPage() {
  return <AlertsInboxView />;
}

export default PersonalAlertsPage;
