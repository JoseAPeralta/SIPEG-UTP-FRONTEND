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
