import type { Career, User } from "@/types/domain";

export const careers: Career[] = [
  { code: "CIVIL", id: "civil", name: "Ingenieria Civil", unitId: "fic" },
  { code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" },
  { code: "CYBER", id: "cybersecurity", name: "Ciberseguridad", unitId: "fisc" },
  { code: "ELECTRICAL", id: "electrical", name: "Ingenieria Electrica", unitId: "fie" },
  { code: "MECHANICAL", id: "mechanical", name: "Ingenieria Mecanica", unitId: "fim" },
];

export const users: User[] = [
  {
    careerId: "software",
    email: "mariana.rodriguez@example.edu",
    firstName: "Mariana",
    globalRole: "ADMIN",
    id: "user-1",
    isActive: true,
    lastName: "Rodriguez",
    unitId: "fisc",
  },
  {
    careerId: "civil",
    email: "carlos.mendez@example.edu",
    firstName: "Carlos",
    globalRole: "USER",
    id: "user-2",
    isActive: true,
    lastName: "Mendez",
    unitId: "fic",
  },
  {
    careerId: "electrical",
    email: "laura.chen@example.edu",
    firstName: "Laura",
    globalRole: "USER",
    id: "user-3",
    isActive: true,
    lastName: "Chen",
    unitId: "fie",
  },
  {
    careerId: "mechanical",
    email: "jorge.santos@example.edu",
    firstName: "Jorge",
    globalRole: "USER",
    id: "user-4",
    isActive: true,
    lastName: "Santos",
    unitId: "fim",
  },
];
