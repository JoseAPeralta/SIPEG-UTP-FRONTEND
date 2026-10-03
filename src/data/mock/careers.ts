import type { Career } from "@/types/domain";

export const careers: Career[] = [
  { code: "CIVIL", id: "civil", name: "Ingenieria Civil", unitId: "fic" },
  { code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" },
  { code: "CYBER", id: "cybersecurity", name: "Ciberseguridad", unitId: "fisc" },
  { code: "ELECTRICAL", id: "electrical", name: "Ingenieria Electrica", unitId: "fie" },
  { code: "MECHANICAL", id: "mechanical", name: "Ingenieria Mecanica", unitId: "fim" },
  { code: "OTROS", id: "otros", name: "Otros", unitId: null },
];
