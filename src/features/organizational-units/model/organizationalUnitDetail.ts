import type { OrganizationalUnit } from "@/types/domain";

export type OrganizationalUnitCareer = {
  code: string;
  id: string;
  name: string;
};

export type DefaultEventProgram = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED" | "CANCELLED" | "COMPLETED" | "DRAFT";
};

export type OrganizationalUnitDetail = OrganizationalUnit & {
  careers: OrganizationalUnitCareer[];
  defaultProgram: DefaultEventProgram | null;
};
