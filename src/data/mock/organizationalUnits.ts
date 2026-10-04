import type { OrganizationalUnit } from "@/types/domain";

export const organizationalUnits: OrganizationalUnit[] = [
  {
    code: "FIC",
    description: "Unidad academica enfocada en infraestructura civil y obras publicas.",
    head: null,
    id: "fic",
    isActive: true,
    name: "Facultad de Ingenieria Civil",
    type: "FACULTY",
  },
  {
    code: "FISC",
    description: "Unidad academica enfocada en sistemas, software y ciberseguridad.",
    head: { firstName: "Mariana", id: "user-1", lastName: "Rodriguez" },
    id: "fisc",
    isActive: true,
    name: "Facultad de Ingenieria de Sistemas Computacionales",
    type: "FACULTY",
  },
  {
    code: "FIE",
    description: "Unidad academica enfocada en energia, redes y automatizacion.",
    head: null,
    id: "fie",
    isActive: true,
    name: "Facultad de Ingenieria Electrica",
    type: "FACULTY",
  },
  {
    code: "FIM",
    description: "Unidad academica enfocada en manufactura, robotica y mantenimiento.",
    head: null,
    id: "fim",
    isActive: true,
    name: "Facultad de Ingenieria Mecanica",
    type: "FACULTY",
  },
];

/**
 * Estado de demostracion del programa predeterminado de cada unidad. `hasScheduledActivities`
 * reproduce la unica regla contractual que bloquea la desactivacion: el backend la rechaza con `409`
 * mientras el programa tiene actividades programadas o en curso.
 */
export type OrganizationalUnitDefaultProgramSeed = {
  hasScheduledActivities: boolean;
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
};

export const organizationalUnitDefaultPrograms: Record<
  string,
  OrganizationalUnitDefaultProgramSeed
> = {
  fic: {
    hasScheduledActivities: false,
    id: "program-fic",
    name: "Agenda permanente",
    status: "ACTIVE",
  },
  fisc: {
    hasScheduledActivities: true,
    id: "program-fisc",
    name: "Agenda permanente",
    status: "ACTIVE",
  },
  fie: {
    hasScheduledActivities: false,
    id: "program-fie",
    name: "Agenda permanente",
    status: "ACTIVE",
  },
  fim: {
    hasScheduledActivities: false,
    id: "program-fim",
    name: "Agenda permanente",
    status: "ACTIVE",
  },
};
