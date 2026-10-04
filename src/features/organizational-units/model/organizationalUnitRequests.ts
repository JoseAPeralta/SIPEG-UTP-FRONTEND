import type { OrganizationalUnitType } from "@/types/domain";

export type CreateOrganizationalUnitRequest = {
  code: string;
  description: string | null;
  name: string;
  type: OrganizationalUnitType;
};

export type UpdateOrganizationalUnitRequest = {
  description?: string | null;
  name?: string;
};
