import type { Career } from "@/types/domain";

export const careers: Career[] = [
  { code: "CIVIL", description: null, id: "civil", name: "Ingenieria Civil", unitId: "fic" },
  {
    code: "SOFTWARE",
    description: null,
    id: "software",
    name: "Desarrollo de Software",
    unitId: "fisc",
  },
  { code: "CYBER", description: null, id: "cybersecurity", name: "Ciberseguridad", unitId: "fisc" },
  {
    code: "ELECTRICAL",
    description: null,
    id: "electrical",
    name: "Ingenieria Electrica",
    unitId: "fie",
  },
  {
    code: "MECHANICAL",
    description: null,
    id: "mechanical",
    name: "Ingenieria Mecanica",
    unitId: "fim",
  },
  { code: "OTROS", description: null, id: "otros", name: "Otros", unitId: null },
];
