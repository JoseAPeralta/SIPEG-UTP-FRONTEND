import { useCareers } from "@/features/careers";
import { useOrganizationalUnits } from "@/features/organizational-units";

export function useRegistrationCatalog() {
  const careers = useCareers("public");
  const organizationalUnits = useOrganizationalUnits("public");
  const catalog =
    careers.careers && organizationalUnits.organizationalUnits
      ? {
          careers: careers.careers,
          organizationalUnits: organizationalUnits.organizationalUnits,
        }
      : null;

  return {
    catalog,
    error: careers.error ?? organizationalUnits.error,
    isLoading: careers.isLoading || organizationalUnits.isLoading,
    refetch: () => Promise.all([careers.refetch(), organizationalUnits.refetch()]),
  };
}
