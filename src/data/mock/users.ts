import type { User } from "@/types/domain";

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
